// ========== 工具函數導入 ==========
import { formatTime } from './utils/time-utils.js';
import {
  BPM_MIN,
  BPM_MAX,
  BPM_FORMULA_MS,
  SCHEDULE_AHEAD_TIME_MS,
  DRIFT_SAMPLE_SIZE,
  SLEEP_DETECTION_THRESHOLD_MS,
  OPACITY_MIN,
  OPACITY_MAX
} from './utils/constants.js';
import { ACTIONS } from './utils/message-actions.js';
import { createLogger } from './utils/logger.js';
import { safeStorageSet, safeStorageGet } from './utils/storage-utils.js';
import { resetBeatScheduling } from './utils/message-handlers.js';
import { broadcastToYouTubeTabs, sendToActiveTab } from './utils/broadcast-utils.js';

const logger = createLogger('Background');

// ========== 狀態管理 ==========
// 預設設定（單一權威來源）
const DEFAULT_SETTINGS = {
  currentBPM: 180,                // 更適合大眾的節奏
  soundEnabled: true,
  soundType: 'beep',              // 使用合成嗶聲（啟動更快）
  overlayOpacity: 80,             // 使用 80% 透明度（更易見）
  timeSignature: '4/4',           // 使用 4/4 拍（最常見）
  autoStartEnabled: false,
  defaultDuration: 1800,          // 30 分鐘（更合理的預設值）
  overlayVisible: true            // 新增：持久化覆蓋層可見性
};

let timerState = {
  // 從預設設定初始化
  ...DEFAULT_SETTINGS,

  // 運行時狀態
  timerInterval: null,
  remainingSeconds: 0,
  isPaused: false,
  currentBeatInBar: 0,
  isRunning: false,
  offscreenDocumentExists: false,

  // 新增：增量節拍調度字段
  timerStartTime: 0,        // 計時器啟動的絕對時間戳
  expectedBeatNumber: 0,     // 當前應該播放的節拍數（0, 1, 2, ...）
  nextBeatTime: 0,          // 下一次節拍應該發生的絕對時間戳
  lastBPM: 180,             // 追踪 BPM 變化（用於檢測調整）

  // 新增：漂移補償
  driftSamples: [],         // 最近 N 次的漂移測量值（毫秒）
  avgDrift: 0,              // 平均漂移（用於補償）
  lastTickTime: 0,          // 上次 tick 的時間（用於檢測系統休眠）
  lastSecondUpdate: 0,      // 上次秒數更新的時間戳（用於秒數更新節流）

  // 新增：預調度參數（階段二）
  scheduleAheadTime: SCHEDULE_AHEAD_TIME_MS    // 提前調度音效（消除通訊延遲）
};

// ========== Offscreen 生命週期管理 ==========
async function createOffscreenDocument() {
  if (timerState.offscreenDocumentExists) {
    logger.info('Offscreen document 已存在，跳過創建');
    return;
  }

  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: chrome.i18n.getMessage('offscreen_justification')
    });
    timerState.offscreenDocumentExists = true;
    logger.info('Offscreen document 已創建');
  } catch (error) {
    // 如果已經存在，也標記為 true
    if (error.message?.includes('Only a single offscreen')) {
      timerState.offscreenDocumentExists = true;
      logger.info('Offscreen document 已存在');
    } else {
      // 其他錯誤：不標記為已存在，並向上拋出
      timerState.offscreenDocumentExists = false;
      logger.error('創建 offscreen document 失敗:', error);
      throw error;
    }
  }
}

async function closeOffscreenDocument() {
  if (!timerState.offscreenDocumentExists) return;

  try {
    await chrome.offscreen.closeDocument();
    timerState.offscreenDocumentExists = false;
    logger.info('Offscreen document 已關閉');
  } catch (error) {
    // 如果已經不存在，也重置標記
    timerState.offscreenDocumentExists = false;
    logger.info('Offscreen document 不存在或已關閉:', error);
  }
}

// ========== 輔助函數 ==========
function getBeatsPerBar(timeSignature) {
  // 驗證拍號格式
  if (!timeSignature || typeof timeSignature !== 'string') {
    logger.error('無效的拍號格式:', timeSignature);
    return 4; // 預設 4/4 拍
  }

  const parts = timeSignature.split('/');
  if (parts.length !== 2) {
    logger.error('拍號格式錯誤:', timeSignature);
    return 4;
  }

  const beats = parseInt(parts[0]);
  if (!beats || beats < 2 || beats > 12) {
    logger.error('拍號數值無效:', timeSignature);
    return 4;
  }

  return beats;
}

function getBeatType(beatIndex, timeSignature) {
  switch (timeSignature) {
    case '2/4':
      return beatIndex === 0 ? 'strong' : 'weak';
    case '3/4':
      return beatIndex === 0 ? 'strong' : 'weak';
    case '4/4':
      if (beatIndex === 0) return 'strong';
      if (beatIndex === 2) return 'medium';
      return 'weak';
    default:
      return 'weak';
  }
}

async function playBeep(beatType = 'weak') {
  if (!timerState.offscreenDocumentExists) {
    await createOffscreenDocument();
  }

  try {
    await chrome.runtime.sendMessage({
      action: ACTIONS.PLAY_BEEP,
      bpm: timerState.currentBPM,
      beatType: beatType,
      soundType: timerState.soundType
    });
  } catch (error) {
    // Offscreen 可能已關閉，重置標記並重試一次
    logger.info('Offscreen 通訊失敗，嘗試重新創建:', error);
    timerState.offscreenDocumentExists = false;

    try {
      await createOffscreenDocument();
      await chrome.runtime.sendMessage({
        action: ACTIONS.PLAY_BEEP,
        bpm: timerState.currentBPM,
        beatType: beatType,
        soundType: timerState.soundType
      });
    } catch (retryError) {
      logger.error('重試後仍然失敗:', retryError);
    }
  }
}

/**
 * 調度下一次節拍（增量算法，無累積漂移）
 */
function scheduleNextBeat() {
  timerState.expectedBeatNumber++;

  const beatInterval = BPM_FORMULA_MS / timerState.currentBPM;
  const theoreticalNextBeat = timerState.timerStartTime +
                              (timerState.expectedBeatNumber * beatInterval);

  // 應用漂移補償（提前觸發以抵消延遲）
  timerState.nextBeatTime = theoreticalNextBeat - timerState.avgDrift;
}

function getCheckInterval(beatInterval) {
  if (beatInterval < 200) {
    // 快速 BPM (>300): 使用 10ms 高精度
    return 10;
  }
  if (beatInterval < 400) {
    // 中速 BPM (150-300): 使用 25ms 中精度
    return 25;
  }
  // 慢速 BPM (<150): 使用 50ms 標準精度
  return 50;
}

function processTimerTick() {
  if (timerState.isPaused) return;

  // ========== 基於實際時間的秒數更新（不依賴固定間隔）==========
  const now = Date.now();
  const elapsed = now - timerState.lastSecondUpdate;

  // 每 1000ms（1 秒）才減少 1 秒並更新顯示
  if (elapsed >= 1000) {
    timerState.lastSecondUpdate = now; // 更新上次秒數更新時間

    if (timerState.remainingSeconds > 0) {
      timerState.remainingSeconds--;

      // 更新 YouTube 覆蓋層
      updateContentScript();

      // 持久化狀態
      safeStorageSet({
        remainingSeconds: timerState.remainingSeconds,
        currentBPM: timerState.currentBPM,
        isRunning: timerState.isRunning,
        isPaused: timerState.isPaused,
        defaultDuration: timerState.defaultDuration
      }, '計時器狀態更新');

      // 廣播狀態到 popup（如果開啟）
      broadcastState();
    } else {
      // 計時完成
      stopTimer();
      broadcastState();
    }
  }

  // ========== 新：無漂移 BPM 節拍檢測 ==========

  // 檢測系統休眠（時間跳躍 > 1 秒）
  const timeSinceLastTick = now - (timerState.lastTickTime || now);
  if (timeSinceLastTick > 1000) {
    logger.info('[Sleep Detected] 重置節拍計時');
    timerState.timerStartTime = now;
    timerState.expectedBeatNumber = 0;
    const beatInterval = BPM_FORMULA_MS / timerState.currentBPM;
    timerState.nextBeatTime = now + beatInterval;
    timerState.driftSamples = [];
    timerState.avgDrift = 0;
  }
  timerState.lastTickTime = now;

  // 檢測 BPM 變化
  if (timerState.currentBPM !== timerState.lastBPM) {
    handleBPMChange(now);
  }

  // ========== 階段二：提前調度節拍（預調度機制） ==========
  // 使用 while 循環：當下一個節拍即將到來（< scheduleAheadTime）時，提前調度
  while (timerState.nextBeatTime - now < timerState.scheduleAheadTime) {
    // 計算相對延遲（毫秒）
    // 傳遞相對延遲給 offscreen.js，讓它自己計算 AudioContext 時間
    const delay = timerState.nextBeatTime - Date.now();

    // 獲取節拍類型（強、中、弱）
    const beatType = getBeatType(timerState.currentBeatInBar, timerState.timeSignature);

    // 發送預調度消息到 offscreen
    if (timerState.soundEnabled) {
      chrome.runtime.sendMessage({
        action: ACTIONS.SCHEDULE_BEEP,
        beatType: beatType,
        delay: delay,
        soundType: timerState.soundType
      }).catch(err => {
        logger.error('預調度失敗:', err);
        // 降級：立即播放
        playBeep(beatType);
      });
    }

    // 廣播節拍事件到 content script（視覺指示燈）
    // 注意：視覺反饋仍然會有輕微延遲，但音效會精確
    broadcastBeatEvent(timerState.currentBeatInBar, beatType);

    // 更新節拍計數器
    const beatsPerBar = getBeatsPerBar(timerState.timeSignature);
    timerState.currentBeatInBar = (timerState.currentBeatInBar + 1) % beatsPerBar;

    // 調度下一次節拍
    scheduleNextBeat();
  }
}

function startTimerInterval(checkInterval) {
  const oldInterval = timerState.timerInterval;
  timerState.timerInterval = null; // 原子性標記

  if (oldInterval) {
    clearInterval(oldInterval);
    logger.info('清理舊的計時器 interval');
  }

  timerState.lastSecondUpdate = Date.now();
  timerState.timerInterval = setInterval(() => {
    processTimerTick();
  }, checkInterval);
}

/**
 * 處理 BPM 調整，保持節奏連續性
 */
function handleBPMChange(now) {
  logger.info(`[BPM Change] ${timerState.lastBPM} -> ${timerState.currentBPM} BPM`);

  const elapsedTime = now - timerState.timerStartTime;
  const oldBeatInterval = BPM_FORMULA_MS / timerState.lastBPM;
  const beatsSoFar = Math.floor(elapsedTime / oldBeatInterval);

  // 重新計算起始時間，讓轉換無縫
  const newBeatInterval = BPM_FORMULA_MS / timerState.currentBPM;
  timerState.timerStartTime = now - (beatsSoFar * newBeatInterval);
  timerState.expectedBeatNumber = beatsSoFar;
  timerState.nextBeatTime = timerState.timerStartTime +
                            ((beatsSoFar + 1) * newBeatInterval);

  // 重置漂移追踪和節拍計數器
  timerState.driftSamples = [];
  timerState.avgDrift = 0;
  timerState.lastBPM = timerState.currentBPM;
  timerState.currentBeatInBar = 0;

  // ========== 重啟 timer 以應用新的檢查頻率 ==========
  // BPM 變化可能導致節拍間隔跨越不同的頻率檔位（10/25/50ms）
  // 需要重新計算並應用新的 checkInterval
  if (timerState.isRunning && !timerState.isPaused && timerState.timerInterval) {
    const newCheckInterval = getCheckInterval(newBeatInterval);
    startTimerInterval(newCheckInterval);
  }
}

/**
 * 追踪節拍延遲並計算平均漂移
 */
function trackDrift(drift) {
  // 只追踪 0-50ms 的正常延遲（過大可能是系統異常）
  if (drift < 0 || drift > 50) return;

  timerState.driftSamples.push(drift);

  // 保留最近 10 個樣本
  if (timerState.driftSamples.length > DRIFT_SAMPLE_SIZE) {
    timerState.driftSamples.shift();
  }

  // 計算平均漂移
  const sum = timerState.driftSamples.reduce((a, b) => a + b, 0);
  timerState.avgDrift = sum / timerState.driftSamples.length;
}

function updateContentScript() {
  sendToActiveTab({
    action: 'updateTimer',
    time: formatTime(timerState.remainingSeconds),
    bpm: timerState.currentBPM
  });
}

// 廣播節拍事件到所有 YouTube 頁面
function broadcastBeatEvent(beatIndex, beatType) {
  broadcastToYouTubeTabs({
    action: ACTIONS.BEAT_PULSE,
    beatIndex: beatIndex,
    beatType: beatType
  });
}

function broadcastState() {
  chrome.runtime.sendMessage({
    action: ACTIONS.STATE_UPDATE,
    state: {
      remainingSeconds: timerState.remainingSeconds,
      currentBPM: timerState.currentBPM,
      isRunning: timerState.isRunning,
      isPaused: timerState.isPaused,
      soundEnabled: timerState.soundEnabled,
      soundType: timerState.soundType,
      overlayOpacity: timerState.overlayOpacity,
      timeSignature: timerState.timeSignature,
      autoStartEnabled: timerState.autoStartEnabled,
      overlayVisible: timerState.overlayVisible,
      defaultDuration: timerState.defaultDuration
    }
  }).catch(() => {
    // Popup 可能已關閉，忽略錯誤
  });
}

// ========== 核心計時器邏輯 ==========
function runTimer() {
  if (timerState.isRunning && timerState.timerInterval) {
    logger.warn('計時器已在運行中，跳過重複啟動');
    return;
  }

  if (timerState.timerInterval) {
    clearInterval(timerState.timerInterval);
  }

  timerState.isRunning = true;

  // 使用統一的節拍調度重置函數
  resetBeatScheduling(timerState);

  // ========== 動態檢查頻率（根據 BPM 調整精度）==========
  // 根據節拍間隔動態調整檢查頻率
  const beatInterval = BPM_FORMULA_MS / timerState.currentBPM;
  const checkInterval = getCheckInterval(beatInterval);
  startTimerInterval(checkInterval);
}

function stopTimer() {
  if (timerState.timerInterval) {
    clearInterval(timerState.timerInterval);
    timerState.timerInterval = null;
  }

  timerState.isRunning = false;
  timerState.isPaused = false;

  // 關閉 offscreen document 以節省資源
  closeOffscreenDocument();

  safeStorageSet({
    isRunning: false,
    isPaused: false
  }, '計時器停止');
}

// ========== 消息處理器 ==========
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 使用立即執行的 async 函數來支援 await
  (async () => {
    switch (request.action) {
      case ACTIONS.START_TIMER:
        // 輸入驗證：確保 duration 是有效的正整數
        const duration = parseInt(request.duration);
        if (!duration || duration <= 0 || !Number.isFinite(duration)) {
          logger.error('無效的時長參數:', request.duration);
          sendResponse({ success: false, error: '無效的時長參數' });
          break;
        }

        timerState.remainingSeconds = duration;
        timerState.defaultDuration = duration;
        timerState.isPaused = false;

        await safeStorageSet({ defaultDuration: duration }, '開始計時器');
        await createOffscreenDocument();
        runTimer();
        broadcastState();
        sendResponse({ success: true });
        break;

      case ACTIONS.PAUSE_TIMER:
        timerState.isPaused = true;
        if (timerState.timerInterval) {
          clearInterval(timerState.timerInterval);
          timerState.timerInterval = null;
        }
        await safeStorageSet({ isPaused: true }, '暫停計時器');
        broadcastState();
        sendResponse({ success: true });
        break;

      case ACTIONS.RESUME_TIMER:
        timerState.isPaused = false;

        runTimer();
        await safeStorageSet({ isPaused: false }, '恢復計時器');
        broadcastState();
        sendResponse({ success: true });
        break;

      case ACTIONS.STOP_TIMER:
        stopTimer();
        timerState.remainingSeconds = 0;
        updateContentScript(); // 更新 YouTube 覆蓋層顯示
        broadcastState();
        sendResponse({ success: true });
        break;

      case ACTIONS.UPDATE_BPM:
        // 驗證 BPM 範圍
        const newBPM = parseInt(request.bpm);
        if (!newBPM || newBPM < BPM_MIN || newBPM > BPM_MAX) {
          logger.error('BPM 超出範圍:', request.bpm);
          sendResponse({ success: false, error: `BPM 必須在 ${BPM_MIN}-${BPM_MAX} 之間` });
          break;
        }

        timerState.currentBPM = newBPM;
        await safeStorageSet({ currentBPM: newBPM }, '更新 BPM');

        // 立即更新 content script
        updateContentScript();
        broadcastState();
        sendResponse({ success: true });
        break;

      case ACTIONS.TOGGLE_SOUND:
        timerState.soundEnabled = request.enabled;
        await safeStorageSet({ soundEnabled: request.enabled }, '切換聲音開關');
        broadcastState();
        sendResponse({ success: true });
        break;

      case ACTIONS.UPDATE_OPACITY:
        // 驗證並限制透明度範圍：0-100
        const opacity = Math.max(OPACITY_MIN, Math.min(OPACITY_MAX, request.opacity));
        timerState.overlayOpacity = opacity;
        await safeStorageSet({ overlayOpacity: opacity }, '更新透明度');

        // 通知所有 YouTube 標籤頁更新透明度
        broadcastToYouTubeTabs({
          action: 'updateOpacity',
          opacity: opacity
        });

        broadcastState();
        sendResponse({ success: true });
        break;

      case ACTIONS.UPDATE_TIME_SIGNATURE:
        timerState.timeSignature = request.timeSignature;
        timerState.currentBeatInBar = 0; // 切換拍號時重置計數器，從強拍開始
        await safeStorageSet({ timeSignature: request.timeSignature }, '更新拍號');
        broadcastState();
        sendResponse({ success: true });
        break;

      case ACTIONS.UPDATE_SOUND_TYPE:
        timerState.soundType = request.soundType;
        await safeStorageSet({ soundType: request.soundType }, '更新音效類型');

      // 預加載對應的音效
      if (request.soundType === 'castanets' && timerState.offscreenDocumentExists) {
        chrome.runtime.sendMessage({ action: ACTIONS.PRELOAD_CASTANETS }).catch(err =>
          logger.warn('Preload castanets message failed:', err));
      } else if (request.soundType === 'snaredrum' && timerState.offscreenDocumentExists) {
        chrome.runtime.sendMessage({ action: ACTIONS.PRELOAD_SNAREDRUM }).catch(err =>
          logger.warn('Preload snaredrum message failed:', err));
      }

        broadcastState();
        sendResponse({ success: true });
        break;

      case ACTIONS.TOGGLE_OVERLAY_VISIBILITY:
        // 更新狀態並持久化
        timerState.overlayVisible = request.visible;
        await safeStorageSet({ overlayVisible: request.visible }, '切換覆蓋層可見性');

        // 通知所有 YouTube 標籤頁切換顯示狀態
        broadcastToYouTubeTabs({
          action: 'toggleVisibility',
          visible: request.visible
        });

        sendResponse({ success: true });
        break;

    case ACTIONS.GET_STATE:
      sendResponse({
        state: {
          remainingSeconds: timerState.remainingSeconds,
          currentBPM: timerState.currentBPM,
          isRunning: timerState.isRunning,
          isPaused: timerState.isPaused,
          soundEnabled: timerState.soundEnabled,
          soundType: timerState.soundType,
          overlayOpacity: timerState.overlayOpacity,
          timeSignature: timerState.timeSignature,
          autoStartEnabled: timerState.autoStartEnabled,
          overlayVisible: timerState.overlayVisible,
          defaultDuration: timerState.defaultDuration
        }
        });
        break;

      case ACTIONS.VIDEO_PLAY:
        // 只在啟用自動啟動 && 計時器未運行時啟動
        if (timerState.autoStartEnabled && !timerState.isRunning) {
          timerState.remainingSeconds = timerState.defaultDuration;
          timerState.isPaused = false;
          await createOffscreenDocument();
          runTimer();
          broadcastState();
        }
        // 如果計時器正在運行但被暫停，且啟用自動啟動，則恢復
        else if (timerState.autoStartEnabled && timerState.isRunning && timerState.isPaused) {
          timerState.isPaused = false;
          runTimer();
          await safeStorageSet({ isPaused: false }, '視頻播放自動恢復');
          broadcastState();
        }
        sendResponse({ success: true });
        break;

      case ACTIONS.VIDEO_PAUSE:
        // 只在啟用自動啟動 && 計時器正在運行且未暫停時暫停
        if (timerState.autoStartEnabled && timerState.isRunning && !timerState.isPaused) {
          timerState.isPaused = true;
          if (timerState.timerInterval) {
            clearInterval(timerState.timerInterval);
            timerState.timerInterval = null;
          }
          await safeStorageSet({ isPaused: true }, '視頻暫停自動暫停');
          broadcastState();
        }
        sendResponse({ success: true });
        break;

      case ACTIONS.TOGGLE_AUTO_START:
        timerState.autoStartEnabled = request.enabled;
        await safeStorageSet({ autoStartEnabled: request.enabled }, '切換自動啟動');
        broadcastState();
        sendResponse({ success: true });
        break;

      case ACTIONS.UPDATE_DEFAULT_DURATION:
        timerState.defaultDuration = request.duration;
        await safeStorageSet({ defaultDuration: request.duration }, '更新預設時長');
        broadcastState();
        sendResponse({ success: true });
        break;

      case ACTIONS.OFFSCREEN_READY:
        logger.info('Offscreen document 已就緒');
        sendResponse({ success: true });
        break;
    }
  })();

  return true; // 保持消息通道開啟以支援異步回應
});

// ========== 啟動監聽器 ==========
chrome.runtime.onStartup.addListener(() => {
  logger.info('Service worker 啟動');

  // 載入所有設定鍵（包括預設設定和運行時狀態）
  const settingsKeys = [...Object.keys(DEFAULT_SETTINGS), 'remainingSeconds', 'isRunning', 'isPaused'];
  chrome.storage.local.get(settingsKeys, (result) => {
    // 合併預設值（任何缺少的鍵使用預設值）
    const settings = { ...DEFAULT_SETTINGS, ...result };
    Object.assign(timerState, settings);

    // 如果計時器正在運行且未暫停，恢復執行
    if (result.isRunning && !result.isPaused && result.remainingSeconds > 0) {
      logger.info('恢復計時器運行');
      createOffscreenDocument()
        .then(() => runTimer())
        .catch(err => {
          logger.error('恢復計時器時 offscreen 創建失敗:', err);
          timerState.isPaused = true;
          safeStorageSet({ isPaused: true }, '降級處理');
        });
    }
  });
});

chrome.runtime.onInstalled.addListener((details) => {
  logger.info('Extension 已安裝/更新:', details.reason);

  if (details.reason === 'install') {
    // 全新安裝：寫入所有預設值到 storage
    chrome.storage.local.set(DEFAULT_SETTINGS, () => {
      logger.info('預設設定已初始化');
      Object.assign(timerState, DEFAULT_SETTINGS);
    });
  } else if (details.reason === 'update') {
    // ========== 修復：恢復所有狀態（包括運行時狀態）==========
    const allKeys = [
      ...Object.keys(DEFAULT_SETTINGS),
      'remainingSeconds',  // 新增：恢复剩余时间
      'isRunning',         // 新增：恢复运行状态
      'isPaused',          // 新增：恢复暂停状态
      'defaultDuration'    // 新增：恢复默认时长
    ];

    chrome.storage.local.get(allKeys, (result) => {
      // 合併策略：現有值優先，新預設值補充缺失項
      const mergedSettings = { ...DEFAULT_SETTINGS, ...result };
      chrome.storage.local.set(mergedSettings);
      Object.assign(timerState, mergedSettings);

      // 如果計時器正在運行且未暫停，自動恢復執行
      if (result.isRunning && !result.isPaused && result.remainingSeconds > 0) {
        logger.info('[update] 恢復計時器運行，剩餘:', result.remainingSeconds, '秒');
        createOffscreenDocument().then(() => {
          runTimer();
        }).catch(err => {
          logger.error('[update] 恢復計時器失敗:', err);
        });
      } else if (result.isRunning && result.isPaused) {
        logger.info('[update] 計時器處於暫停狀態');
      } else {
        logger.info('[update] 計時器未運行');
      }
    });
  }

  // 清理現有的 offscreen document（如果存在）
  chrome.offscreen.hasDocument().then((hasDoc) => {
    if (hasDoc) {
      chrome.offscreen.closeDocument().then(() => {
        timerState.offscreenDocumentExists = false;
        logger.info('已清理 offscreen document');
      });
    }
  }).catch(err => logger.info('檢查 offscreen document 時發生錯誤:', err));
});
