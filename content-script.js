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
        <div id="slowjogging-bpm-info">120 BPM</div>
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

// 頁面加載完成後初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeYouTubeOverlay);
} else {
  initializeYouTubeOverlay();
}