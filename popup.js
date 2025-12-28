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
const durationInput = document.getElementById('durationInput');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const bpmSlider = document.getElementById('bpmSlider');
const bpmInput = document.getElementById('bpmInput');
const soundToggle = document.getElementById('soundToggle');
const opacitySlider = document.getElementById('opacitySlider');
const opacityInput = document.getElementById('opacityInput');
const timeSignatureSelect = document.getElementById('timeSignatureSelect');
const soundTypeSelect = document.getElementById('soundTypeSelect');
const toggleOverlayBtn = document.getElementById('toggleOverlayBtn');
const statusText = document.getElementById('statusText');
const autoStartToggle = document.getElementById('autoStartToggle');

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

function updateUIFromState(state) {
  // 更新顯示
  timerDisplay.textContent = formatTime(state.remainingSeconds);
  bpmInput.value = state.currentBPM;
  bpmSlider.value = state.currentBPM;
  soundToggle.checked = state.soundEnabled;

  // 還原 durationInput 值（僅在計時器未運行時）
  if (state.defaultDuration !== undefined && !state.isRunning) {
    durationInput.value = state.defaultDuration;
  }

  // 更新透明度（如果存在）
  if (state.overlayOpacity !== undefined) {
    opacityInput.value = state.overlayOpacity;
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
  durationInput.disabled = state.isRunning;
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

  // 更新覆蓋層可見性狀態
  if (state.overlayVisible !== undefined) {
    overlayVisible = state.overlayVisible;
    toggleOverlayBtn.textContent = overlayVisible ? '隱藏計時器面板' : '顯示計時器面板';
  }
}

// ========== 事件處理器 ==========

// 開始計時
startBtn.addEventListener('click', () => {
  const duration = parseInt(durationInput.value) || 300;

  chrome.runtime.sendMessage({
    action: 'START_TIMER',
    duration: duration
  });

  // 立即更新 UI 狀態（不等待 background 回應）
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  stopBtn.disabled = false;
  durationInput.disabled = true;
  // BPM 滑桿保持可用
  statusText.textContent = '計時中...';
});

// 暫停/繼續計時
pauseBtn.addEventListener('click', () => {
  if (isPaused) {
    chrome.runtime.sendMessage({ action: 'RESUME_TIMER' });
    isPaused = false;
    pauseBtn.textContent = '暫停';
    statusText.textContent = '計時中...';
  } else {
    chrome.runtime.sendMessage({ action: 'PAUSE_TIMER' });
    isPaused = true;
    pauseBtn.textContent = '繼續';
    statusText.textContent = '已暫停';
  }
});

// 停止計時
stopBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'STOP_TIMER' });

  // 立即更新 UI 狀態
  timerDisplay.textContent = formatTime(0);
  statusText.textContent = '已停止';
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  pauseBtn.textContent = '暫停';
  stopBtn.disabled = true;
  durationInput.disabled = false;
  // BPM 滑桿保持可用
  isPaused = false;
});

// durationInput 即時儲存
durationInput.addEventListener('change', (e) => {
  const duration = parseInt(e.target.value);
  if (!isNaN(duration) && duration > 0) {
    chrome.runtime.sendMessage({
      action: 'UPDATE_DEFAULT_DURATION',
      duration: duration
    });
  }
});

// BPM 滑塊即時更新
bpmSlider.addEventListener('input', (e) => {
  const bpm = parseInt(e.target.value);
  currentBPM = bpm;
  bpmInput.value = bpm; // 同步到輸入框

  chrome.runtime.sendMessage({
    action: 'UPDATE_BPM',
    bpm: bpm
  });
});

// BPM 輸入框變更
bpmInput.addEventListener('input', (e) => {
  let bpm = parseInt(e.target.value);

  // 驗證範圍（60-360）
  if (isNaN(bpm)) return;
  if (bpm < 60) bpm = 60;
  if (bpm > 360) bpm = 360;

  currentBPM = bpm;
  bpmSlider.value = bpm; // 同步到滑桿
  bpmInput.value = bpm;  // 更新輸入框（處理超出範圍的情況）

  chrome.runtime.sendMessage({
    action: 'UPDATE_BPM',
    bpm: bpm
  });
});

// 聲音開關
soundToggle.addEventListener('change', (e) => {
  soundEnabled = e.target.checked;

  chrome.runtime.sendMessage({
    action: 'TOGGLE_SOUND',
    enabled: e.target.checked
  });
});

// 透明度滑塊即時更新
opacitySlider.addEventListener('input', (e) => {
  const opacity = parseInt(e.target.value);
  overlayOpacity = opacity;
  opacityInput.value = opacity; // 同步到輸入框

  chrome.runtime.sendMessage({
    action: 'UPDATE_OPACITY',
    opacity: opacity
  });
});

// 透明度輸入框變更
opacityInput.addEventListener('input', (e) => {
  let opacity = parseInt(e.target.value);

  // 驗證範圍（0-100）
  if (isNaN(opacity)) return;
  if (opacity < 0) opacity = 0;
  if (opacity > 100) opacity = 100;

  overlayOpacity = opacity;
  opacitySlider.value = opacity; // 同步到滑桿
  opacityInput.value = opacity;  // 更新輸入框（處理超出範圍的情況）

  chrome.runtime.sendMessage({
    action: 'UPDATE_OPACITY',
    opacity: opacity
  });
});

// 拍號選擇
timeSignatureSelect.addEventListener('change', (e) => {
  timeSignature = e.target.value;

  chrome.runtime.sendMessage({
    action: 'UPDATE_TIME_SIGNATURE',
    timeSignature: timeSignature
  });
});

// 音效類型選擇
soundTypeSelect.addEventListener('change', (e) => {
  soundType = e.target.value;

  chrome.runtime.sendMessage({
    action: 'UPDATE_SOUND_TYPE',
    soundType: soundType
  });
});

// 顯示/隱藏計時器面板
toggleOverlayBtn.addEventListener('click', () => {
  overlayVisible = !overlayVisible;
  toggleOverlayBtn.textContent = overlayVisible ? '隱藏計時器面板' : '顯示計時器面板';

  chrome.runtime.sendMessage({
    action: 'TOGGLE_OVERLAY_VISIBILITY',
    visible: overlayVisible
  });
});

// 自動啟動開關
autoStartToggle.addEventListener('change', (e) => {
  autoStartEnabled = e.target.checked;

  chrome.runtime.sendMessage({
    action: 'TOGGLE_AUTO_START',
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
  chrome.runtime.sendMessage({ action: 'GET_STATE' }, (response) => {
    if (response && response.state) {
      updateUIFromState(response.state);
    }
  });
});
