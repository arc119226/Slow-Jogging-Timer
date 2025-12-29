// ========== 工具函數導入 ==========
import { formatTime } from './utils/time-utils.js';
import {
  BPM_FORMULA_MS,
  SCHEDULE_AHEAD_TIME_MS,
  DRIFT_SAMPLE_SIZE,
  SLEEP_DETECTION_THRESHOLD_MS
} from './utils/constants.js';

// ========== 狀態管理 ==========
// 預設設定（單一權威來源）
const DEFAULT_SETTINGS = {
  currentBPM: 190,
  soundEnabled: true,
  soundType: 'castanets',        // 使用響板聲
  overlayOpacity: 30,             // 使用 30% 透明度
  timeSignature: '2/4',           // 使用 2/4 拍
  autoStartEnabled: false,
  defaultDuration: 2700,
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
  lastBPM: 190,             // 追踪 BPM 變化（用於檢測調整）

  // 新增：漂移補償
  driftSamples: [],         // 最近 N 次的漂移測量值（毫秒）
  avgDrift: 0,              // 平均漂移（用於補償）
  lastTickTime: 0,          // 上次 tick 的時間（用於檢測系統休眠）

  // 新增：預調度參數（階段二）
  scheduleAheadTime: SCHEDULE_AHEAD_TIME_MS    // 提前調度音效（消除通訊延遲）
};

// ========== Offscreen 生命週期管理 ==========
async function createOffscreenDocument() {
  if (timerState.offscreenDocumentExists) return;

  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: '播放超慢跑計時器的 BPM 節拍音效'
    });
    timerState.offscreenDocumentExists = true;
    console.log('Offscreen document 已創建');
  } catch (error) {
    // 如果已經存在，也標記為 true
    if (error.message?.includes('Only a single offscreen')) {
      timerState.offscreenDocumentExists = true;
      console.log('Offscreen document 已存在');
    } else {
      console.error('創建 offscreen document 失敗:', error);
    }
  }
}

async function closeOffscreenDocument() {
  if (!timerState.offscreenDocumentExists) return;

  try {
    await chrome.offscreen.closeDocument();
    timerState.offscreenDocumentExists = false;
    console.log('Offscreen document 已關閉');
  } catch (error) {
    // 如果已經不存在，也重置標記
    timerState.offscreenDocumentExists = false;
    console.log('Offscreen document 不存在或已關閉:', error);
  }
}

// ========== 輔助函數 ==========
function getBeatsPerBar(timeSignature) {
  return parseInt(timeSignature.split('/')[0]);
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
      action: 'PLAY_BEEP',
      bpm: timerState.currentBPM,
      beatType: beatType,
      soundType: timerState.soundType
    });
  } catch (error) {
    // Offscreen 可能已關閉，重置標記並重試一次
    console.log('Offscreen 通訊失敗，嘗試重新創建:', error);
    timerState.offscreenDocumentExists = false;

    try {
      await createOffscreenDocument();
      await chrome.runtime.sendMessage({
        action: 'PLAY_BEEP',
        bpm: timerState.currentBPM,
        beatType: beatType,
        soundType: timerState.soundType
      });
    } catch (retryError) {
      console.error('重試後仍然失敗:', retryError);
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

/**
 * 處理 BPM 調整，保持節奏連續性
 */
function handleBPMChange(now) {
  console.log(`[BPM Change] ${timerState.lastBPM} -> ${timerState.currentBPM} BPM`);

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
    // 計算新的檢查頻率
    const newCheckInterval = newBeatInterval < 200 ? 10 : (newBeatInterval < 400 ? 25 : 50);

    // 停止舊的 timer
    clearInterval(timerState.timerInterval);

    // 獲取必要的變量（供新 interval 使用）
    let lastSecondUpdate = Date.now();

    // 重新創建 timer interval（使用新的 checkInterval）
    timerState.timerInterval = setInterval(() => {
      if (timerState.isPaused) return;

      // ========== 基於實際時間的秒數更新（不依賴固定間隔）==========
      const now = Date.now();
      const elapsed = now - lastSecondUpdate;

      // 每 1000ms（1 秒）才減少 1 秒並更新顯示
      if (elapsed >= 1000) {
        lastSecondUpdate = now;

        if (timerState.remainingSeconds > 0) {
          timerState.remainingSeconds--;
          updateContentScript();
          chrome.storage.local.set({
            remainingSeconds: timerState.remainingSeconds,
            currentBPM: timerState.currentBPM,
            isRunning: timerState.isRunning,
            isPaused: timerState.isPaused,
            defaultDuration: timerState.defaultDuration
          });
          broadcastState();
        } else {
          stopTimer();
          broadcastState();
        }
      }

      // ========== 新：無漂移 BPM 節拍檢測 ==========

      // 檢測系統休眠（時間跳躍 > 1 秒）
      const timeSinceLastTick = now - (timerState.lastTickTime || now);
      if (timeSinceLastTick > 1000) {
        console.log('[Sleep Detected] 重置節拍計時');
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
      while (timerState.nextBeatTime - now < timerState.scheduleAheadTime) {
        const delay = timerState.nextBeatTime - Date.now();

        const beatType = getBeatType(timerState.currentBeatInBar, timerState.timeSignature);

        if (timerState.soundEnabled) {
          chrome.runtime.sendMessage({
            action: 'SCHEDULE_BEEP',
            beatType: beatType,
            delay: delay,
            soundType: timerState.soundType
          }).catch(err => {
            console.error('預調度失敗:', err);
            playBeep(beatType);
          });
        }

        broadcastBeatEvent(timerState.currentBeatInBar, beatType);

        const beatsPerBar = getBeatsPerBar(timerState.timeSignature);
        timerState.currentBeatInBar = (timerState.currentBeatInBar + 1) % beatsPerBar;

        scheduleNextBeat();
      }
    }, newCheckInterval);
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
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'updateTimer',
        time: formatTime(timerState.remainingSeconds),
        bpm: timerState.currentBPM
      }).catch(() => {
        // YouTube 頁面可能沒有 content script，忽略錯誤
      });
    }
  });
}

// 廣播節拍事件到所有 YouTube 頁面
function broadcastBeatEvent(beatIndex, beatType) {
  chrome.tabs.query({ url: 'https://www.youtube.com/*' }, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'BEAT_PULSE',
        beatIndex: beatIndex,
        beatType: beatType
      }).catch(() => {
        // Content script 可能未載入，忽略錯誤
      });
    });
  });
}

function broadcastState() {
  chrome.runtime.sendMessage({
    action: 'STATE_UPDATE',
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
  if (timerState.timerInterval) {
    clearInterval(timerState.timerInterval);
  }

  timerState.isRunning = true;

  // 初始化節拍調度狀態
  timerState.timerStartTime = Date.now();
  timerState.expectedBeatNumber = 0;
  timerState.lastBPM = timerState.currentBPM;

  const beatInterval = BPM_FORMULA_MS / timerState.currentBPM;
  timerState.nextBeatTime = timerState.timerStartTime + beatInterval;

  // 重置漂移追踪
  timerState.driftSamples = [];
  timerState.avgDrift = 0;
  timerState.lastTickTime = Date.now();

  // 記錄上次更新秒數的時間（用於基於實際時間的秒數更新）
  let lastSecondUpdate = Date.now();

  // ========== 動態檢查頻率（根據 BPM 調整精度）==========
  // 根據節拍間隔動態調整檢查頻率
  let checkInterval;

  if (beatInterval < 200) {
    // 快速 BPM (>300): 使用 10ms 高精度
    checkInterval = 10;
  } else if (beatInterval < 400) {
    // 中速 BPM (150-300): 使用 25ms 中精度
    checkInterval = 25;
  } else {
    // 慢速 BPM (<150): 使用 50ms 標準精度
    checkInterval = 50;
  }

  timerState.timerInterval = setInterval(() => {
    if (timerState.isPaused) return;

    // ========== 基於實際時間的秒數更新（不依賴固定間隔）==========
    const now = Date.now();
    const elapsed = now - lastSecondUpdate;

    // 每 1000ms（1 秒）才減少 1 秒並更新顯示
    if (elapsed >= 1000) {
      lastSecondUpdate = now; // 更新上次秒數更新時間

      if (timerState.remainingSeconds > 0) {
        timerState.remainingSeconds--;

        // 更新 YouTube 覆蓋層
        updateContentScript();

        // 持久化狀態
        chrome.storage.local.set({
          remainingSeconds: timerState.remainingSeconds,
          currentBPM: timerState.currentBPM,
          isRunning: timerState.isRunning,
          isPaused: timerState.isPaused,
          defaultDuration: timerState.defaultDuration
        });

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
      console.log('[Sleep Detected] 重置節拍計時');
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
          action: 'SCHEDULE_BEEP',
          beatType: beatType,
          delay: delay,
          soundType: timerState.soundType
        }).catch(err => {
          console.error('預調度失敗:', err);
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
  }, checkInterval); // 動態精度：10-50ms（根據 BPM 自動調整）
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

  chrome.storage.local.set({
    isRunning: false,
    isPaused: false
  });
}

// ========== 消息處理器 ==========
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'START_TIMER':
      timerState.remainingSeconds = request.duration;
      timerState.defaultDuration = request.duration;
      timerState.isPaused = false;

      // 新增：初始化節拍調度狀態
      timerState.timerStartTime = 0;  // 將在 runTimer() 中設置
      timerState.expectedBeatNumber = 0;
      timerState.nextBeatTime = 0;
      timerState.lastBPM = timerState.currentBPM;
      timerState.currentBeatInBar = 0;
      timerState.driftSamples = [];
      timerState.avgDrift = 0;

      chrome.storage.local.set({ defaultDuration: request.duration });
      createOffscreenDocument().then(() => {
        runTimer();
        broadcastState();
        sendResponse({ success: true });
      });
      break;

    case 'PAUSE_TIMER':
      timerState.isPaused = true;
      if (timerState.timerInterval) {
        clearInterval(timerState.timerInterval);
        timerState.timerInterval = null;
      }
      chrome.storage.local.set({ isPaused: true });
      broadcastState();
      sendResponse({ success: true });
      break;

    case 'RESUME_TIMER':
      timerState.isPaused = false;

      // 新增：恢復時重置節拍（避免時間跳躍）
      timerState.timerStartTime = Date.now();
      timerState.expectedBeatNumber = 0;
      const beatInterval = BPM_FORMULA_MS / timerState.currentBPM;
      timerState.nextBeatTime = timerState.timerStartTime + beatInterval;
      timerState.lastBPM = timerState.currentBPM;
      timerState.currentBeatInBar = 0;
      timerState.driftSamples = [];
      timerState.avgDrift = 0;
      timerState.lastTickTime = Date.now();

      runTimer();
      chrome.storage.local.set({ isPaused: false });
      broadcastState();
      sendResponse({ success: true });
      break;

    case 'STOP_TIMER':
      stopTimer();
      timerState.remainingSeconds = 0;
      updateContentScript(); // 更新 YouTube 覆蓋層顯示
      broadcastState();
      sendResponse({ success: true });
      break;

    case 'UPDATE_BPM':
      timerState.currentBPM = request.bpm;
      chrome.storage.local.set({ currentBPM: request.bpm });

      // 立即更新 content script
      updateContentScript();
      broadcastState();
      sendResponse({ success: true });
      break;

    case 'TOGGLE_SOUND':
      timerState.soundEnabled = request.enabled;
      chrome.storage.local.set({ soundEnabled: request.enabled });
      broadcastState();
      sendResponse({ success: true });
      break;

    case 'UPDATE_OPACITY':
      timerState.overlayOpacity = request.opacity;
      chrome.storage.local.set({ overlayOpacity: request.opacity });

      // 通知所有 YouTube 標籤頁更新透明度
      chrome.tabs.query({ url: 'https://www.youtube.com/*' }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'updateOpacity',
            opacity: request.opacity
          }).catch(() => {
            // Content script 可能尚未載入，忽略錯誤
          });
        });
      });

      broadcastState();
      sendResponse({ success: true });
      break;

    case 'UPDATE_TIME_SIGNATURE':
      timerState.timeSignature = request.timeSignature;
      timerState.currentBeatInBar = 0; // 切換拍號時重置計數器，從強拍開始
      chrome.storage.local.set({ timeSignature: request.timeSignature });
      broadcastState();
      sendResponse({ success: true });
      break;

    case 'UPDATE_SOUND_TYPE':
      timerState.soundType = request.soundType;
      chrome.storage.local.set({ soundType: request.soundType });

      // 預加載對應的音效
      if (request.soundType === 'castanets' && timerState.offscreenDocumentExists) {
        chrome.runtime.sendMessage({ action: 'PRELOAD_CASTANETS' }).catch(() => {});
      } else if (request.soundType === 'snaredrum' && timerState.offscreenDocumentExists) {
        chrome.runtime.sendMessage({ action: 'PRELOAD_SNAREDRUM' }).catch(() => {});
      }

      broadcastState();
      sendResponse({ success: true });
      break;

    case 'TOGGLE_OVERLAY_VISIBILITY':
      // 更新狀態並持久化
      timerState.overlayVisible = request.visible;
      chrome.storage.local.set({ overlayVisible: request.visible });  // 持久化

      // 通知所有 YouTube 標籤頁切換顯示狀態
      chrome.tabs.query({ url: 'https://www.youtube.com/*' }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'toggleVisibility',
            visible: request.visible
          }).catch(() => {
            // Content script 可能尚未載入，忽略錯誤
          });
        });
      });
      sendResponse({ success: true });
      break;

    case 'GET_STATE':
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

    case 'VIDEO_PLAY':
      // 只在啟用自動啟動 && 計時器未運行時啟動
      if (timerState.autoStartEnabled && !timerState.isRunning) {
        timerState.remainingSeconds = timerState.defaultDuration;
        timerState.isPaused = false;
        timerState.lastBeatTime = Date.now();
        timerState.currentBeatInBar = 0;
        createOffscreenDocument().then(() => {
          runTimer();
          broadcastState();
        });
      }
      // 如果計時器正在運行但被暫停，且啟用自動啟動，則恢復
      else if (timerState.autoStartEnabled && timerState.isRunning && timerState.isPaused) {
        timerState.isPaused = false;
        timerState.lastBeatTime = Date.now();
        timerState.currentBeatInBar = 0;
        runTimer();
        chrome.storage.local.set({ isPaused: false });
        broadcastState();
      }
      sendResponse({ success: true });
      break;

    case 'VIDEO_PAUSE':
      // 只在啟用自動啟動 && 計時器正在運行且未暫停時暫停
      if (timerState.autoStartEnabled && timerState.isRunning && !timerState.isPaused) {
        timerState.isPaused = true;
        if (timerState.timerInterval) {
          clearInterval(timerState.timerInterval);
          timerState.timerInterval = null;
        }
        chrome.storage.local.set({ isPaused: true });
        broadcastState();
      }
      sendResponse({ success: true });
      break;

    case 'TOGGLE_AUTO_START':
      timerState.autoStartEnabled = request.enabled;
      chrome.storage.local.set({ autoStartEnabled: request.enabled });
      broadcastState();
      sendResponse({ success: true });
      break;

    case 'UPDATE_DEFAULT_DURATION':
      timerState.defaultDuration = request.duration;
      chrome.storage.local.set({ defaultDuration: request.duration });
      broadcastState();
      sendResponse({ success: true });
      break;

    case 'OFFSCREEN_READY':
      console.log('Offscreen document 已就緒');
      sendResponse({ success: true });
      break;
  }

  return true; // 保持消息通道開啟以支援異步回應
});

// ========== 啟動監聽器 ==========
chrome.runtime.onStartup.addListener(() => {
  console.log('Service worker 啟動');

  // 載入所有設定鍵（包括預設設定和運行時狀態）
  const settingsKeys = [...Object.keys(DEFAULT_SETTINGS), 'remainingSeconds', 'isRunning', 'isPaused'];
  chrome.storage.local.get(settingsKeys, (result) => {
    // 合併預設值（任何缺少的鍵使用預設值）
    const settings = { ...DEFAULT_SETTINGS, ...result };
    Object.assign(timerState, settings);

    // 如果計時器正在運行且未暫停，恢復執行
    if (result.isRunning && !result.isPaused && result.remainingSeconds > 0) {
      console.log('恢復計時器運行');
      createOffscreenDocument().then(() => {
        runTimer();
      });
    }
  });
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension 已安裝/更新:', details.reason);

  if (details.reason === 'install') {
    // 全新安裝：寫入所有預設值到 storage
    chrome.storage.local.set(DEFAULT_SETTINGS, () => {
      console.log('預設設定已初始化');
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
        console.log('[update] 恢復計時器運行，剩餘:', result.remainingSeconds, '秒');
        createOffscreenDocument().then(() => {
          runTimer();
        }).catch(err => {
          console.error('[update] 恢復計時器失敗:', err);
        });
      } else if (result.isRunning && result.isPaused) {
        console.log('[update] 計時器處於暫停狀態');
      } else {
        console.log('[update] 計時器未運行');
      }
    });
  }

  // 清理現有的 offscreen document（如果存在）
  chrome.offscreen.hasDocument().then((hasDoc) => {
    if (hasDoc) {
      chrome.offscreen.closeDocument().then(() => {
        timerState.offscreenDocumentExists = false;
        console.log('已清理 offscreen document');
      });
    }
  }).catch(err => console.log('檢查 offscreen document 時發生錯誤:', err));
});
