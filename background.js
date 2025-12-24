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
  lastBeatTime: 0,
  offscreenDocumentExists: false
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
      timeSignature: timerState.timeSignature
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
  const beatInterval = 60000 / timerState.currentBPM;
  timerState.lastBeatTime = Date.now();

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

    // BPM 節拍檢測 - 每個 tick 都執行（保持精確）
    const now = Date.now();
    const currentBeatInterval = 60000 / timerState.currentBPM;
    if (now - timerState.lastBeatTime >= currentBeatInterval) {
      if (timerState.soundEnabled) {
        // 計算當前拍在小節中的位置
        const beatType = getBeatType(timerState.currentBeatInBar, timerState.timeSignature);
        playBeep(beatType);

        // 更新拍計數器
        const beatsPerBar = getBeatsPerBar(timerState.timeSignature);
        timerState.currentBeatInBar = (timerState.currentBeatInBar + 1) % beatsPerBar;
      }
      timerState.lastBeatTime = now;
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
      timerState.isPaused = false;
      timerState.lastBeatTime = Date.now();
      timerState.currentBeatInBar = 0; // 重置節拍計數器，從強拍開始
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
      timerState.lastBeatTime = Date.now(); // 重置節拍時間
      timerState.currentBeatInBar = 0; // 重置節拍計數器，從強拍開始
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
          timeSignature: timerState.timeSignature
        }
      });
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
    'isPaused'
  ], (result) => {
    if (result.remainingSeconds) timerState.remainingSeconds = result.remainingSeconds;
    if (result.currentBPM) timerState.currentBPM = result.currentBPM;
    if (result.soundEnabled !== undefined) timerState.soundEnabled = result.soundEnabled;
    if (result.soundType !== undefined) timerState.soundType = result.soundType;
    if (result.overlayOpacity !== undefined) timerState.overlayOpacity = result.overlayOpacity;
    if (result.timeSignature) timerState.timeSignature = result.timeSignature;

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
    'timeSignature'
  ], (result) => {
    if (result.currentBPM) timerState.currentBPM = result.currentBPM;
    if (result.soundEnabled !== undefined) timerState.soundEnabled = result.soundEnabled;
    if (result.soundType !== undefined) timerState.soundType = result.soundType;
    if (result.overlayOpacity !== undefined) timerState.overlayOpacity = result.overlayOpacity;
    if (result.timeSignature) timerState.timeSignature = result.timeSignature;
  });
});
