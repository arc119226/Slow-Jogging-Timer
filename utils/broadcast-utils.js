/**
 * Broadcast utilities for sending messages to content scripts
 */

import { createLogger } from './logger.js';

const logger = createLogger('Broadcast');

/**
 * 向所有 YouTube 標籤頁廣播消息
 *
 * @param {Object} message - 要發送的消息對象
 * @param {Object} options - 可選配置
 * @param {boolean} options.activeOnly - 只發送給當前活動標籤 (默認 false)
 * @param {boolean} options.logErrors - 是否記錄錯誤 (默認 false)
 * @returns {Promise<number>} 成功發送的標籤頁數量
 */
export async function broadcastToYouTubeTabs(message, options = {}) {
  const {
    activeOnly = false,
    logErrors = false
  } = options;

  const query = activeOnly
    ? { active: true, currentWindow: true }
    : { url: 'https://www.youtube.com/*' };

  return new Promise((resolve) => {
    chrome.tabs.query(query, (tabs) => {
      if (!tabs || tabs.length === 0) {
        resolve(0);
        return;
      }

      let successCount = 0;
      const promises = tabs.map(tab =>
        chrome.tabs.sendMessage(tab.id, message)
          .then(() => {
            successCount++;
          })
          .catch((error) => {
            if (logErrors) {
              logger.warn(`發送到標籤 ${tab.id} 失敗:`, error.message);
            }
          })
      );

      Promise.allSettled(promises).then(() => {
        resolve(successCount);
      });
    });
  });
}

/**
 * 向當前活動的 YouTube 標籤頁發送消息
 */
export async function sendToActiveTab(message) {
  return broadcastToYouTubeTabs(message, { activeOnly: true });
}
