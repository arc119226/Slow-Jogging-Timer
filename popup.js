// ========== 工具函數導入 ==========
import { formatTime } from './utils/time-utils.js';
import { BPM_MIN, BPM_MAX, OPACITY_MIN, OPACITY_MAX } from './utils/constants.js';
import { ACTIONS } from './utils/message-actions.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('Popup');

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
  pauseBtn.textContent = state.isPaused ? '繼續' : '暫停';

  if (state.remainingSeconds === 0 && !state.isRunning) {
    statusText.textContent = '計時完成！';
  } else if (state.isPaused) {
    statusText.textContent = '已暫停';
  } else if (state.isRunning) {
    statusText.textContent = '計時中...';
  } else {
    statusText.textContent = '準備就緒';
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
    const minutes = parseInt(customDurationInput.value) || 30;
    duration = minutes * 60; // 轉換為秒
  } else {
    duration = parseInt(durationPreset.value);
  }

  chrome.runtime.sendMessage({
    action: ACTIONS.START_TIMER,
    duration: duration
  });

  // 立即更新 UI 狀態（不等待 background 回應）
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  stopBtn.disabled = false;
  durationPreset.disabled = true;
  customDurationInput.disabled = true;
  // BPM 滑桿保持可用
  statusText.textContent = '計時中...';
});

// 暫停/繼續計時
pauseBtn.addEventListener('click', () => {
  if (isPaused) {
    chrome.runtime.sendMessage({ action: ACTIONS.RESUME_TIMER });
    isPaused = false;
    pauseBtn.textContent = '暫停';
    statusText.textContent = '計時中...';
  } else {
    chrome.runtime.sendMessage({ action: ACTIONS.PAUSE_TIMER });
    isPaused = true;
    pauseBtn.textContent = '繼續';
    statusText.textContent = '已暫停';
  }
});

// 停止計時
stopBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: ACTIONS.STOP_TIMER });

  // 立即更新 UI 狀態
  timerDisplay.textContent = formatTime(0);
  statusText.textContent = '已停止';
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  pauseBtn.textContent = '暫停';
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
  // 請求當前狀態
  chrome.runtime.sendMessage({ action: ACTIONS.GET_STATE }, (response) => {
    if (response && response.state) {
      updateUIFromState(response.state);
    }
  });
});
