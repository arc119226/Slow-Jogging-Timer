// ========== 工具函數導入 ==========
import { formatTime } from './utils/time-utils.js';
import { BPM_MIN, BPM_MAX, OPACITY_MIN, OPACITY_MAX } from './utils/constants.js';
import { ACTIONS } from './utils/message-actions.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('Popup');

// ========== i18n 工具函數 ==========
const i18n = (key) => chrome.i18n.getMessage(key) || key;

// ========== i18n 初始化函數 ==========
function initializeI18n() {
  // 初始化所有帶 data-i18n 屬性的元素
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const message = chrome.i18n.getMessage(key);

    // 添加默認值處理 - 如果沒有翻譯，使用鍵名作為後備
    if (message) {
      element.textContent = message;
    } else {
      console.warn(`[i18n] Missing translation for key: ${key}`);
      element.textContent = key; // 顯示鍵名作為後備
    }
  });

  // 處理 placeholder 屬性
  const customInput = document.querySelector('[data-i18n-placeholder]');
  if (customInput) {
    const key = customInput.getAttribute('data-i18n-placeholder');
    const message = chrome.i18n.getMessage(key);
    if (message) {
      customInput.placeholder = message;
    }
  }

  // 設置 document title
  const titleMessage = chrome.i18n.getMessage('app_title');
  if (titleMessage) {
    document.title = titleMessage;
  }

  logger.info('i18n initialized, locale:', chrome.i18n.getUILanguage());
}

// ========== UI 狀態變數 ==========
// 移除硬編碼預設值 - 將從 background 初始化
let currentBPM;
let soundEnabled;
let isPaused;
let overlayOpacity;
let timeSignature;
let soundType;
let overlayVisible;
let autoStartEnabled;

// ========== 取得 DOM 元素 ==========
const timerDisplay = document.getElementById('timer');
const durationPreset = document.getElementById('durationPreset');
const customDurationInput = document.getElementById('customDurationInput');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const bpmSlider = document.getElementById('bpmSlider');
const bpmValue = document.getElementById('bpmValue');
const soundToggle = document.getElementById('soundToggle');
const opacitySlider = document.getElementById('opacitySlider');
const opacityValue = document.getElementById('opacityValue');
const timeSignatureSelect = document.getElementById('timeSignatureSelect');
const soundTypeSelect = document.getElementById('soundTypeSelect');
const statusText = document.getElementById('statusText');
const autoStartToggle = document.getElementById('autoStartToggle');

// ========== 輔助函數 ==========
function updateUIFromState(state) {
  // 更新顯示
  timerDisplay.textContent = formatTime(state.remainingSeconds);
  bpmValue.textContent = state.currentBPM;
  bpmSlider.value = state.currentBPM;
  soundToggle.checked = state.soundEnabled;

  // 還原 duration 值（始終顯示保存的值）
  if (state.defaultDuration !== undefined) {
    const duration = state.defaultDuration;
    // 檢查是否為預設值（15/30/45 分鐘）
    if (duration === 900 || duration === 1800 || duration === 2700) {
      durationPreset.value = duration.toString();
      customDurationInput.style.display = 'none';
    } else {
      // 自訂值
      durationPreset.value = 'custom';
      customDurationInput.value = Math.round(duration / 60);
      customDurationInput.style.display = 'inline-block';
    }
  }

  // 更新透明度（如果存在）
  if (state.overlayOpacity !== undefined) {
    opacityValue.textContent = state.overlayOpacity;
    opacitySlider.value = state.overlayOpacity;
    overlayOpacity = state.overlayOpacity;
  }

  // 更新拍號（如果存在）
  if (state.timeSignature !== undefined) {
    timeSignatureSelect.value = state.timeSignature;
    timeSignature = state.timeSignature;
  }

  // 更新音效類型（如果存在）
  if (state.soundType !== undefined) {
    soundTypeSelect.value = state.soundType;
    soundType = state.soundType;
  }

  // 更新內部狀態
  currentBPM = state.currentBPM;
  soundEnabled = state.soundEnabled;
  isPaused = state.isPaused;

  // 更新按鈕狀態
  startBtn.disabled = state.isRunning;
  pauseBtn.disabled = !state.isRunning;
  stopBtn.disabled = !state.isRunning;
  durationPreset.disabled = state.isRunning;
  customDurationInput.disabled = state.isRunning;
  // BPM 應隨時可調整，不受計時器狀態影響

  // 更新按鈕文字和狀態文字
  pauseBtn.textContent = state.isPaused ? i18n('button_resume') : i18n('button_pause');

  if (state.remainingSeconds === 0 && !state.isRunning) {
    statusText.textContent = i18n('status_completed');
  } else if (state.isPaused) {
    statusText.textContent = i18n('status_paused');
  } else if (state.isRunning) {
    statusText.textContent = i18n('status_running');
  } else {
    statusText.textContent = i18n('status_ready');
  }

  // 更新自動啟動開關
  if (state.autoStartEnabled !== undefined) {
    autoStartToggle.checked = state.autoStartEnabled;
    autoStartEnabled = state.autoStartEnabled;
  }
}

// ========== 事件處理器 ==========

// 開始計時
startBtn.addEventListener('click', () => {
  let duration;

  // 從預設值或自訂輸入獲取時長
  if (durationPreset.value === 'custom') {
    const minutes = parseInt(customDurationInput.value);

    // 驗證自訂時長範圍：1-1440 分鐘（24 小時）
    if (!minutes || minutes < 1 || minutes > 1440) {
      logger.warn('無效的自訂時長:', customDurationInput.value);
      customDurationInput.value = 30;
      statusText.textContent = '時長無效，已重置為 30 分鐘';
      duration = 1800; // 30 分鐘 = 1800 秒
    } else {
      duration = minutes * 60; // 轉換為秒
    }
  } else {
    duration = parseInt(durationPreset.value);
  }

  chrome.runtime.sendMessage({
    action: ACTIONS.START_TIMER,
    duration: duration
  }, (response) => {
    // 處理多標籤頁衝突錯誤
    if (response && !response.success) {
      if (response.error === 'timer_already_running_in_another_tab') {
        // 顯示錯誤消息
        statusText.textContent = i18n('error_timer_already_running');
        // 恢復 UI 狀態
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        durationPreset.disabled = false;
        customDurationInput.disabled = false;
        return;
      }
    }

    // 更新 UI 狀態（成功啟動）
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
    durationPreset.disabled = true;
    customDurationInput.disabled = true;
    // BPM 滑桿保持可用
    statusText.textContent = i18n('status_running');
  });
});

// 暫停/繼續計時
pauseBtn.addEventListener('click', () => {
  if (isPaused) {
    chrome.runtime.sendMessage({ action: ACTIONS.RESUME_TIMER });
    isPaused = false;
    pauseBtn.textContent = i18n('button_pause');
    statusText.textContent = i18n('status_running');
  } else {
    chrome.runtime.sendMessage({ action: ACTIONS.PAUSE_TIMER });
    isPaused = true;
    pauseBtn.textContent = i18n('button_resume');
    statusText.textContent = i18n('status_paused');
  }
});

// 停止計時
stopBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: ACTIONS.STOP_TIMER });

  // 立即更新 UI 狀態
  timerDisplay.textContent = formatTime(0);
  statusText.textContent = i18n('status_stopped');
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  pauseBtn.textContent = i18n('button_pause');
  stopBtn.disabled = true;
  durationPreset.disabled = false;
  customDurationInput.disabled = false;
  // BPM 滑桿保持可用
  isPaused = false;
});

// Duration preset 變更 - 顯示/隱藏自訂輸入
durationPreset.addEventListener('change', (e) => {
  if (e.target.value === 'custom') {
    customDurationInput.style.display = 'inline-block';
    customDurationInput.focus();
  } else {
    customDurationInput.style.display = 'none';
    const duration = parseInt(e.target.value);
    chrome.runtime.sendMessage({
      action: ACTIONS.UPDATE_DEFAULT_DURATION,
      duration: duration
    });
  }
});

// Custom duration input 即時儲存
customDurationInput.addEventListener('change', (e) => {
  const minutes = parseInt(e.target.value);
  if (!isNaN(minutes) && minutes > 0) {
    const duration = minutes * 60; // 轉換為秒
    chrome.runtime.sendMessage({
      action: ACTIONS.UPDATE_DEFAULT_DURATION,
      duration: duration
    });
  }
});

// BPM 滑塊即時更新
bpmSlider.addEventListener('input', (e) => {
  const bpm = parseInt(e.target.value);
  currentBPM = bpm;
  bpmValue.textContent = bpm; // 更新顯示值

  chrome.runtime.sendMessage({
    action: ACTIONS.UPDATE_BPM,
    bpm: bpm
  });
});

// 聲音開關
soundToggle.addEventListener('change', (e) => {
  soundEnabled = e.target.checked;

  chrome.runtime.sendMessage({
    action: ACTIONS.TOGGLE_SOUND,
    enabled: e.target.checked
  });
});

// 透明度滑塊即時更新
opacitySlider.addEventListener('input', (e) => {
  const opacity = parseInt(e.target.value);
  overlayOpacity = opacity;
  opacityValue.textContent = opacity; // 更新顯示值

  chrome.runtime.sendMessage({
    action: ACTIONS.UPDATE_OPACITY,
    opacity: opacity
  });
});

// 拍號選擇
timeSignatureSelect.addEventListener('change', (e) => {
  timeSignature = e.target.value;

  chrome.runtime.sendMessage({
    action: ACTIONS.UPDATE_TIME_SIGNATURE,
    timeSignature: timeSignature
  });
});

// 音效類型選擇
soundTypeSelect.addEventListener('change', (e) => {
  soundType = e.target.value;

  chrome.runtime.sendMessage({
    action: ACTIONS.UPDATE_SOUND_TYPE,
    soundType: soundType
  });
});

// 自動啟動開關
autoStartToggle.addEventListener('change', (e) => {
  autoStartEnabled = e.target.checked;

  chrome.runtime.sendMessage({
    action: ACTIONS.TOGGLE_AUTO_START,
    enabled: e.target.checked
  });
});

// ========== 監聽來自 background 的狀態更新 ==========
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'STATE_UPDATE') {
    updateUIFromState(request.state);
  }
});

// ========== Popup 開啟時同步狀態 ==========
document.addEventListener('DOMContentLoaded', () => {
  // 1. 先初始化 i18n（設置所有靜態文字）
  initializeI18n();

  // 2. 然後請求當前狀態（更新動態內容）
  chrome.runtime.sendMessage({ action: ACTIONS.GET_STATE }, (response) => {
    if (chrome.runtime.lastError) {
      logger.error('獲取狀態失敗:', chrome.runtime.lastError);
      statusText.textContent = '無法連接到後台服務';
      return;
    }

    if (response && response.state) {
      updateUIFromState(response.state);
    } else {
      statusText.textContent = '狀態同步失敗';
    }
  });
});
