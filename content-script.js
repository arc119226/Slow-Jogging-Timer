// ========== 常數定義 ==========
// Note: Content scripts不支持ES modules，這些常數與utils/保持同步
const MAX_VIDEO_ATTACH_RETRIES = 20;
const VIDEO_ATTACH_RETRY_INTERVAL_MS = 500;
const BEAT_PULSE_DURATION_MS = 150;

// Message actions (synced with utils/message-actions.js)
const ACTIONS = {
  VIDEO_PLAY: 'VIDEO_PLAY',
  VIDEO_PAUSE: 'VIDEO_PAUSE',
  UPDATE_TIMER: 'updateTimer',
  TOGGLE_VISIBILITY: 'toggleVisibility',
  UPDATE_OPACITY_DISPLAY: 'updateOpacity',
  BEAT_PULSE: 'BEAT_PULSE',
  STATE_UPDATE: 'STATE_UPDATE'
};

// Logger (synced with utils/logger.js)
const logger = {
  info: (...args) => console.log('[ContentScript]', ...args),
  warn: (...args) => console.warn('[ContentScript]', ...args),
  error: (...args) => console.error('[ContentScript]', ...args)
};

// i18n helper (content script doesn't support ES modules)
const i18n = (key, ...substitutions) => chrome.i18n.getMessage(key, substitutions);

// YouTube 視頻同步狀態
let videoElement = null;
let isVideoAttached = false;
let messageListenerAttached = false;
let navigationObserver = null;

// 節拍指示燈狀態
let currentActiveSide = 'left'; // 追蹤當前應該亮的指示燈

// 追蹤當前顯示的時間（用於隱藏狀態下的按鈕文字）
let currentDisplayTime = '00:00:00';

// 安全发送消息的辅助函数，处理 extension context 失效的情况
function safeSendMessage(message) {
  // 检查 extension context 是否仍然有效
  if (!chrome.runtime?.id) {
    logger.warn('[Slow Jogging] Extension context 已失效，跳过消息发送');
    return;
  }

  try {
    chrome.runtime.sendMessage(message).catch(err => {
      // Promise rejection（异步错误）
      logger.error('[Slow Jogging] 消息发送失败:', err);
    });
  } catch (err) {
    // 同步错误（extension context 失效）
    logger.error('[Slow Jogging] Extension context 已失效:', err);
  }
}

// 查找並附加到 YouTube 視頻元素
function attachToYouTubeVideo() {
  const video = document.querySelector('video.html5-main-video');

  if (!video) {
    return false;
  }

  // 避免重複附加（檢查是否為同一視頻元素且已附加）
  if (video === videoElement && isVideoAttached) {
    logger.info('[Slow Jogging] 視頻已附加，跳過重複操作');
    return true;
  }

  // 如果檢測到新視頻，先移除舊的監聽器
  if (videoElement && isVideoAttached) {
    detachFromVideo();
    logger.info('[Slow Jogging] 已移除舊視頻的監聽器');
  }

  videoElement = video;

  // 附加事件監聽器
  videoElement.addEventListener('play', handleVideoPlay);
  videoElement.addEventListener('pause', handleVideoPause);
  videoElement.addEventListener('ended', handleVideoEnded);

  isVideoAttached = true;
  logger.info('[Slow Jogging] 已連接到 YouTube 視頻');
  return true;
}

function detachFromVideo() {
  if (videoElement) {
    videoElement.removeEventListener('play', handleVideoPlay);
    videoElement.removeEventListener('pause', handleVideoPause);
    videoElement.removeEventListener('ended', handleVideoEnded);
    videoElement = null;
    isVideoAttached = false;
  }
}

function handleVideoPlay() {
  logger.info('[Slow Jogging] 視頻播放中，發送 VIDEO_PLAY 消息');
  safeSendMessage({ action: ACTIONS.VIDEO_PLAY });
}

function handleVideoPause() {
  // 如果視頻已結束，不發送暫停消息（由 ended 事件處理）
  if (videoElement && videoElement.ended) return;

  logger.info('[Slow Jogging] 視頻暫停，發送 VIDEO_PAUSE 消息');
  safeSendMessage({ action: ACTIONS.VIDEO_PAUSE });
}

function handleVideoEnded() {
  logger.info('[Slow Jogging] 視頻結束，發送 VIDEO_PAUSE 消息');
  safeSendMessage({ action: ACTIONS.VIDEO_PAUSE });
}

// 監聽 YouTube SPA 導航
function observeNavigation() {
  if (navigationObserver) {
    logger.info('[Slow Jogging] Navigation observer 已存在');
    return navigationObserver;
  }

  let lastUrl = location.href;

  navigationObserver = new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      logger.info('[Slow Jogging] YouTube 頁面導航，重新連接視頻');

      // 給 YouTube 時間加載新視頻
      setTimeout(() => {
        attachToYouTubeVideo();
      }, 1000);
    }
  });

  navigationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  return navigationObserver;
}

// 初始化視頻同步功能
function initializeVideoSync() {
  // 嘗試立即連接
  const attached = attachToYouTubeVideo();

  if (!attached) {
    // 如果未找到，進行重試
    let retryCount = 0;
    const maxRetries = MAX_VIDEO_ATTACH_RETRIES;

    const retryInterval = setInterval(() => {
      retryCount++;
      const success = attachToYouTubeVideo();

      if (success || retryCount >= maxRetries) {
        clearInterval(retryInterval);
      }
    }, VIDEO_ATTACH_RETRY_INTERVAL_MS);
  }

  // 監聽 SPA 導航
  observeNavigation();
}

// 在 YouTube 頁面上建立計時器面板
function initializeYouTubeOverlay() {
  // 檢查是否已經存在
  if (document.getElementById('slowjogging-timer-overlay')) return;

  // 建立容器
  const overlay = document.createElement('div');
  overlay.id = 'slowjogging-timer-overlay';
  overlay.innerHTML = `
    <div id="slowjogging-timer-widget">
      <div id="slowjogging-timer-content">
        <div id="slowjogging-timer-display">00:00:00</div>
        <div id="slowjogging-bpm-container">
          <div class="slowjogging-beat-indicator" id="slowjogging-left-indicator"></div>
          <div id="slowjogging-bpm-info">190 BPM</div>
          <div class="slowjogging-beat-indicator" id="slowjogging-right-indicator"></div>
        </div>
      </div>
      <button id="slowjogging-toggle-btn">${i18n('button_hide')}</button>
    </div>
  `;
  
  // 插入到頁面中
  document.body.appendChild(overlay);

  // 監聽來自 popup 的消息（僅附加一次）
  if (!messageListenerAttached) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === ACTIONS.UPDATE_TIMER) {
        const display = document.getElementById('slowjogging-timer-display');
        const bpmInfo = document.getElementById('slowjogging-bpm-info');
        const toggleBtn = document.getElementById('slowjogging-toggle-btn');
        const content = document.getElementById('slowjogging-timer-content');

        // 保存最新的時間
        currentDisplayTime = request.time;

        if (display) display.textContent = request.time;
        if (bpmInfo) bpmInfo.textContent = i18n('format_bpm', request.bpm);

        // 如果內容隱藏，按鈕顯示倒計時時間
        if (content && toggleBtn && content.style.display === 'none') {
          toggleBtn.textContent = currentDisplayTime;
        }
      }
      if (request.action === ACTIONS.TOGGLE_VISIBILITY) {
        const content = document.getElementById('slowjogging-timer-content');
        const toggleBtn = document.getElementById('slowjogging-toggle-btn');

        if (content && toggleBtn) {
          const isHidden = content.style.display === 'none';
          content.style.display = isHidden ? 'block' : 'none';

          // 更新按鈕文字邏輯
          if (isHidden) {
            // 從隱藏切換到顯示
            toggleBtn.textContent = i18n('button_hide');
          } else {
            // 從顯示切換到隱藏，顯示倒計時時間
            toggleBtn.textContent = currentDisplayTime;
          }

          // 當隱藏時，讓按鈕變小
          const widget = document.getElementById('slowjogging-timer-widget');
          if (widget) {
            widget.classList.toggle('minimized', !isHidden);
          }
        }
      }
      if (request.action === ACTIONS.UPDATE_OPACITY_DISPLAY) {
        const widget = document.getElementById('slowjogging-timer-widget');
        if (widget) {
          // 將 0-100 的百分比轉換為 0-1 的透明度值
          const opacityValue = request.opacity / 100;
          widget.style.setProperty('--overlay-opacity', opacityValue);
        }
      }
      if (request.action === ACTIONS.BEAT_PULSE) {
        handleBeatPulse(request.beatIndex, request.beatType);
      }
    });
    messageListenerAttached = true;
    logger.info('Message listener 已附加');
  }

  // 從 storage 載入透明度設置
  chrome.storage.local.get(['overlayOpacity'], (result) => {
    const widget = document.getElementById('slowjogging-timer-widget');
    if (widget && result.overlayOpacity !== undefined) {
      const opacityValue = result.overlayOpacity / 100;
      widget.style.setProperty('--overlay-opacity', opacityValue);
    }
  });

  // 從 storage 載入初始可見性狀態
  chrome.storage.local.get(['overlayVisible'], (result) => {
    const content = document.getElementById('slowjogging-timer-content');
    const toggleBtn = document.getElementById('slowjogging-toggle-btn');
    const widget = document.getElementById('slowjogging-timer-widget');

    if (result.overlayVisible !== undefined && !result.overlayVisible) {
      // 初始隱藏狀態
      content.style.display = 'none';
      toggleBtn.textContent = currentDisplayTime || '00:00';
      widget.classList.add('minimized');
    }
  });

  // 切換顯示/隱藏
  const toggleBtn = document.getElementById('slowjogging-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const content = document.getElementById('slowjogging-timer-content');

      if (content) {
        const isHidden = content.style.display === 'none';
        const newVisibleState = isHidden; // 即將顯示

        // 只發送訊息給 background，等廣播回來更新 DOM
        safeSendMessage({
          action: 'TOGGLE_OVERLAY_VISIBILITY',
          visible: newVisibleState
        });
      }
    });
  }
}

// 處理節拍脈衝視覺效果
function handleBeatPulse(beatIndex, beatType) {
  const leftIndicator = document.getElementById('slowjogging-left-indicator');
  const rightIndicator = document.getElementById('slowjogging-right-indicator');

  if (!leftIndicator || !rightIndicator) return;

  // 移除兩邊的 active 類別
  leftIndicator.classList.remove('active');
  rightIndicator.classList.remove('active');

  // 左右交替亮燈
  if (currentActiveSide === 'left') {
    leftIndicator.classList.add('active');
    currentActiveSide = 'right';
  } else {
    rightIndicator.classList.add('active');
    currentActiveSide = 'left';
  }

  // 自動熄滅（與 CSS transition 時間一致）
  setTimeout(() => {
    leftIndicator.classList.remove('active');
    rightIndicator.classList.remove('active');
  }, BEAT_PULSE_DURATION_MS);
}

// 頁面加載完成後初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeYouTubeOverlay();
    initializeVideoSync();
  });
} else {
  initializeYouTubeOverlay();
  initializeVideoSync();
}

// 清理函數：斷開所有監聽器
function cleanup() {
  if (navigationObserver) {
    navigationObserver.disconnect();
    navigationObserver = null;
    logger.info('[Slow Jogging] Navigation observer 已清理');
  }
  detachFromVideo();
}

// 頁面卸載時清理資源
window.addEventListener('beforeunload', cleanup);

// 检测 extension context 失效并清理事件监听器
if (typeof chrome !== 'undefined' && chrome.runtime) {
  try {
    // 尝试连接到 background - 如果失败说明 context 已失效
    const port = chrome.runtime.connect({ name: 'content-script-keepalive' });
    port.onDisconnect.addListener(() => {
      logger.info('[Slow Jogging] Extension context 失效，清理事件监听器');
      detachFromVideo();
    });
  } catch (err) {
    logger.warn('[Slow Jogging] 无法连接到 background:', err);
  }
}