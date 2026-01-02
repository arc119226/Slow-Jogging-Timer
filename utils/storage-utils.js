/**
 * Chrome Storage utilities
 * Provides safe storage operations with error handling
 */

import { createLogger } from './logger.js';

const logger = createLogger('Storage');

/**
 * 安全地保存設定到 chrome.storage.local，並處理錯誤
 * @param {Object} items - 要保存的設定項
 * @param {string} context - 操作上下文（用於日誌）
 * @returns {Promise<boolean>} - 保存是否成功
 */
export async function safeStorageSet(items, context = '保存設定') {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        logger.error(`${context}失敗:`, chrome.runtime.lastError);
        resolve(false);
      } else {
        logger.info(`${context}成功:`, Object.keys(items));
        resolve(true);
      }
    });
  });
}
