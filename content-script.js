// YouTube 視頻同步狀態
let videoElement = null;
let isVideoAttached = false;

// 節拍指示燈狀態
let currentActiveSide = 'left'; // 追蹤當前應該亮的指示燈

// 查找並附加到 YouTube 視頻元素
function attachToYouTubeVideo() {
  const video = document.querySelector('video.html5-main-video');

  if (!video) {
    return false;
  }

  // 避免重複附加
  if (video === videoElement && isVideoAttached) {
    return true;
  }

  // 移除舊的監聽器
  if (videoElement && isVideoAttached) {
    detachFromVideo();
  }

  videoElement = video;

  // 附加事件監聽器
  videoElement.addEventListener('play', handleVideoPlay);
  videoElement.addEventListener('pause', handleVideoPause);
  videoElement.addEventListener('ended', handleVideoEnded);

  isVideoAttached = true;
  console.log('[Slow Jogging] 已連接到 YouTube 視頻');
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
  console.log('[Slow Jogging] 視頻播放中，發送 VIDEO_PLAY 消息');
  chrome.runtime.sendMessage({ action: 'VIDEO_PLAY' }).catch(err => {
    console.error('[Slow Jogging] 發送 VIDEO_PLAY 失敗:', err);
  });
}

function handleVideoPause() {
  // 如果視頻已結束，不發送暫停消息（由 ended 事件處理）
  if (videoElement && videoElement.ended) return;

  console.log('[Slow Jogging] 視頻暫停，發送 VIDEO_PAUSE 消息');
  chrome.runtime.sendMessage({ action: 'VIDEO_PAUSE' }).catch(err => {
    console.error('[Slow Jogging] 發送 VIDEO_PAUSE 失敗:', err);
  });
}

function handleVideoEnded() {
  console.log('[Slow Jogging] 視頻結束，發送 VIDEO_PAUSE 消息');
  chrome.runtime.sendMessage({ action: 'VIDEO_PAUSE' }).catch(err => {
    console.error('[Slow Jogging] 發送 VIDEO_PAUSE 失敗:', err);
  });
}

// 監聽 YouTube SPA 導航
function observeNavigation() {
  let lastUrl = location.href;

  const observer = new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('[Slow Jogging] YouTube 頁面導航，重新連接視頻');

      // 給 YouTube 時間加載新視頻
      setTimeout(() => {
        attachToYouTubeVideo();
      }, 1000);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  return observer;
}

// 初始化視頻同步功能
function initializeVideoSync() {
  // 嘗試立即連接
  const attached = attachToYouTubeVideo();

  if (!attached) {
    // 如果未找到，進行重試（最多 10 秒）
    let retryCount = 0;
    const maxRetries = 20;

    const retryInterval = setInterval(() => {
      retryCount++;
      const success = attachToYouTubeVideo();

      if (success || retryCount >= maxRetries) {
        clearInterval(retryInterval);
      }
    }, 500);
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
          <div id="slowjogging-bpm-info">120 BPM</div>
          <div class="slowjogging-beat-indicator" id="slowjogging-right-indicator"></div>
        </div>
      </div>
      <button id="slowjogging-toggle-btn">隱藏</button>
    </div>
  `;
  
  // 插入到頁面中
  document.body.appendChild(overlay);

  // 監聽來自 popup 的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateTimer') {
      const display = document.getElementById('slowjogging-timer-display');
      const bpmInfo = document.getElementById('slowjogging-bpm-info');

      if (display) display.textContent = request.time;
      if (bpmInfo) bpmInfo.textContent = request.bpm + ' BPM';
    }
    if (request.action === 'toggleVisibility') {
      const content = document.getElementById('slowjogging-timer-content');
      const toggleBtn = document.getElementById('slowjogging-toggle-btn');

      if (content && toggleBtn) {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';
        toggleBtn.textContent = isHidden ? '隱藏' : '顯示';

        // 當隱藏時，讓按鈕變小
        const widget = document.getElementById('slowjogging-timer-widget');
        if (widget) {
          widget.classList.toggle('minimized', !isHidden);
        }
      }
    }
    if (request.action === 'updateOpacity') {
      const widget = document.getElementById('slowjogging-timer-widget');
      if (widget) {
        // 將 0-100 的百分比轉換為 0-1 的透明度值
        const opacityValue = request.opacity / 100;
        widget.style.setProperty('--overlay-opacity', opacityValue);
      }
    }
    if (request.action === 'BEAT_PULSE') {
      handleBeatPulse(request.beatIndex, request.beatType);
    }
  });

  // 從 storage 載入透明度設置
  chrome.storage.local.get(['overlayOpacity'], (result) => {
    const widget = document.getElementById('slowjogging-timer-widget');
    if (widget && result.overlayOpacity !== undefined) {
      const opacityValue = result.overlayOpacity / 100;
      widget.style.setProperty('--overlay-opacity', opacityValue);
    }
  });

  // 切換顯示/隱藏
  const toggleBtn = document.getElementById('slowjogging-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const content = document.getElementById('slowjogging-timer-content');
      const widget = document.getElementById('slowjogging-timer-widget');

      if (content && widget) {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';
        toggleBtn.textContent = isHidden ? '隱藏' : '顯示';

        // 當隱藏時，讓按鈕變小
        widget.classList.toggle('minimized', !isHidden);
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

  // 150ms 後自動熄滅（與 CSS transition 時間一致）
  setTimeout(() => {
    leftIndicator.classList.remove('active');
    rightIndicator.classList.remove('active');
  }, 150);
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