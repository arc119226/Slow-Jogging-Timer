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

/**
 * 安全地從 chrome.storage.local 讀取設定，並處理錯誤
 * @param {string|string[]|null} keys - 要讀取的鍵（null 表示讀取全部）
 * @param {string} context - 操作上下文（用於日誌）
 * @returns {Promise<Object|null>} - 讀取的設定對象，失敗時返回 null
 */
export async function safeStorageGet(keys, context = '讀取設定') {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        logger.error(`${context}失敗:`, chrome.runtime.lastError);
        resolve(null);
      } else {
        logger.info(`${context}成功`);
        resolve(result);
      }
    });
  });
}

/**
 * 檢查存儲空間使用情況
 * @returns {Promise<{bytesInUse: number, quota: number, percentage: number}>}
 */
export async function checkStorageQuota() {
  return new Promise((resolve) => {
    chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
      if (chrome.runtime.lastError) {
        logger.error('檢查存儲配額失敗:', chrome.runtime.lastError);
        resolve({ bytesInUse: 0, quota: 0, percentage: 0 });
      } else {
        const quota = chrome.storage.local.QUOTA_BYTES || 10485760; // 10MB
        const percentage = (bytesInUse / quota) * 100;
        logger.info(`存儲使用: ${bytesInUse} / ${quota} bytes (${percentage.toFixed(2)}%)`);
        resolve({ bytesInUse, quota, percentage });
      }
    });
  });
}
