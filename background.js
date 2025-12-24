// ========== 狀態管理 ==========
let timerState = {
  timerInterval: null,
  remainingSeconds: 0,
  isPaused: false,
  currentBPM: 190,
  soundEnabled: true,
  soundType: 'beep',
  overlayOpacity: 100,
  timeSignature: '4/4',
  currentBeatInBar: 0,
  isRunning: false,
  offscreenDocumentExists: false,
  autoStartEnabled: false,
  defaultDuration: 2700,

  // 新增：增量節拍調度字段
  timerStartTime: 0,        // 計時器啟動的絕對時間戳
  expectedBeatNumber: 0,     // 當前應該播放的節拍數（0, 1, 2, ...）
  nextBeatTime: 0,          // 下一次節拍應該發生的絕對時間戳
  lastBPM: 190,             // 追踪 BPM 變化（用於檢測調整）

  // 新增：漂移補償
  driftSamples: [],         // 最近 10 次的漂移測量值（毫秒）
  avgDrift: 0,              // 平均漂移（用於補償）
  lastTickTime: 0           // 上次 tick 的時間（用於檢測系統休眠）
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
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  // 如果超過 1 小時，顯示 HH:MM:SS，否則只顯示 MM:SS
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  } else {
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}

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

  const beatInterval = 60000 / timerState.currentBPM;
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
  const oldBeatInterval = 60000 / timerState.lastBPM;
  const beatsSoFar = Math.floor(elapsedTime / oldBeatInterval);

  // 重新計算起始時間，讓轉換無縫
  const newBeatInterval = 60000 / timerState.currentBPM;
  timerState.timerStartTime = now - (beatsSoFar * newBeatInterval);
  timerState.expectedBeatNumber = beatsSoFar;
  timerState.nextBeatTime = timerState.timerStartTime +
                            ((beatsSoFar + 1) * newBeatInterval);

  // 重置漂移追踪和節拍計數器
  timerState.driftSamples = [];
  timerState.avgDrift = 0;
  timerState.lastBPM = timerState.currentBPM;
  timerState.currentBeatInBar = 0;
}

/**
 * 追踪節拍延遲並計算平均漂移
 */
function trackDrift(drift) {
  // 只追踪 0-50ms 的正常延遲（過大可能是系統異常）
  if (drift < 0 || drift > 50) return;

  timerState.driftSamples.push(drift);

  // 保留最近 10 個樣本
  if (timerState.driftSamples.length > 10) {
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
      autoStartEnabled: timerState.autoStartEnabled
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

  const beatInterval = 60000 / timerState.currentBPM;
  timerState.nextBeatTime = timerState.timerStartTime + beatInterval;

  // 重置漂移追踪
  timerState.driftSamples = [];
  timerState.avgDrift = 0;
  timerState.lastTickTime = Date.now();

  let tickCounter = 0; // tick 計數器：累積 10 個 tick（1000ms）才減少 1 秒

  timerState.timerInterval = setInterval(() => {
    if (timerState.isPaused) return;

    tickCounter++; // 每 100ms 增加 1

    // 每 10 個 tick（= 1000ms）才減少 1 秒並更新顯示
    if (tickCounter >= 10) {
      tickCounter = 0; // 重置計數器

      if (timerState.remainingSeconds > 0) {
        timerState.remainingSeconds--;

        // 更新 YouTube 覆蓋層
        updateContentScript();

        // 持久化狀態
        chrome.storage.local.set({
          remainingSeconds: timerState.remainingSeconds,
          currentBPM: timerState.currentBPM,
          isRunning: timerState.isRunning,
          isPaused: timerState.isPaused
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
    const now = Date.now();

    // 檢測系統休眠（時間跳躍 > 1 秒）
    const timeSinceLastTick = now - (timerState.lastTickTime || now);
    if (timeSinceLastTick > 1000) {
      console.log('[Sleep Detected] 重置節拍計時');
      timerState.timerStartTime = now;
      timerState.expectedBeatNumber = 0;
      const beatInterval = 60000 / timerState.currentBPM;
      timerState.nextBeatTime = now + beatInterval;
      timerState.driftSamples = [];
      timerState.avgDrift = 0;
    }
    timerState.lastTickTime = now;

    // 檢測 BPM 變化
    if (timerState.currentBPM !== timerState.lastBPM) {
      handleBPMChange(now);
    }

    // 檢查是否應該觸發節拍
    if (now >= timerState.nextBeatTime) {
      // 計算漂移（實際時間 - 理論時間）
      const drift = now - timerState.nextBeatTime;
      trackDrift(drift);

      // 獲取節拍類型（強、中、弱）
      const beatType = getBeatType(timerState.currentBeatInBar, timerState.timeSignature);

      // 播放節拍音訊（如果啟用）
      if (timerState.soundEnabled) {
        playBeep(beatType);
      }

      // 廣播節拍事件到 content script（視覺指示燈）
      broadcastBeatEvent(timerState.currentBeatInBar, beatType);

      // 更新節拍計數器
      const beatsPerBar = getBeatsPerBar(timerState.timeSignature);
      timerState.currentBeatInBar = (timerState.currentBeatInBar + 1) % beatsPerBar;

      // 調度下一次節拍
      scheduleNextBeat();
    }
  }, 100); // 100ms 精度
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
      const beatInterval = 60000 / timerState.currentBPM;
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

      // 預加載響板音效
      if (request.soundType === 'castanets' && timerState.offscreenDocumentExists) {
        chrome.runtime.sendMessage({ action: 'PRELOAD_CASTANETS' }).catch(() => {});
      }

      broadcastState();
      sendResponse({ success: true });
      break;

    case 'TOGGLE_OVERLAY_VISIBILITY':
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
          autoStartEnabled: timerState.autoStartEnabled
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
  chrome.storage.local.get([
    'remainingSeconds',
    'currentBPM',
    'soundEnabled',
    'soundType',
    'overlayOpacity',
    'timeSignature',
    'isRunning',
    'isPaused',
    'autoStartEnabled',
    'defaultDuration'
  ], (result) => {
    if (result.remainingSeconds) timerState.remainingSeconds = result.remainingSeconds;
    if (result.currentBPM) timerState.currentBPM = result.currentBPM;
    if (result.soundEnabled !== undefined) timerState.soundEnabled = result.soundEnabled;
    if (result.soundType !== undefined) timerState.soundType = result.soundType;
    if (result.overlayOpacity !== undefined) timerState.overlayOpacity = result.overlayOpacity;
    if (result.timeSignature) timerState.timeSignature = result.timeSignature;
    if (result.autoStartEnabled !== undefined) timerState.autoStartEnabled = result.autoStartEnabled;
    if (result.defaultDuration) timerState.defaultDuration = result.defaultDuration;

    // 如果計時器正在運行且未暫停，恢復執行
    if (result.isRunning && !result.isPaused && result.remainingSeconds > 0) {
      console.log('恢復計時器運行');
      createOffscreenDocument().then(() => {
        runTimer();
      });
    }
  });
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension 已安裝/更新');
  chrome.storage.local.get([
    'currentBPM',
    'soundEnabled',
    'soundType',
    'overlayOpacity',
    'timeSignature',
    'autoStartEnabled',
    'defaultDuration'
  ], (result) => {
    if (result.currentBPM) timerState.currentBPM = result.currentBPM;
    if (result.soundEnabled !== undefined) timerState.soundEnabled = result.soundEnabled;
    if (result.soundType !== undefined) timerState.soundType = result.soundType;
    if (result.overlayOpacity !== undefined) timerState.overlayOpacity = result.overlayOpacity;
    if (result.timeSignature) timerState.timeSignature = result.timeSignature;
    if (result.autoStartEnabled !== undefined) timerState.autoStartEnabled = result.autoStartEnabled;
    if (result.defaultDuration) timerState.defaultDuration = result.defaultDuration;
  });
});
