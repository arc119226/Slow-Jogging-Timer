/**
 * Message handler utilities
 * Provides handler abstraction for background message processing
 */

import { safeStorageSet } from './storage-utils.js';
import { createLogger } from './logger.js';

const logger = createLogger('MessageHandlers');

/**
 * 標準消息處理器包裝器
 * 自動處理：狀態更新 → 持久化 → 廣播 → 響應
 */
export function createMessageHandler({
  handler,
  getStateUpdate = null,
  storageContext = '狀態更新',
  shouldBroadcast = true
}) {
  return async (request, timerState, { broadcastState, sendResponse }) => {
    try {
      await handler(request, timerState);

      if (getStateUpdate) {
        const stateUpdate = getStateUpdate(request, timerState);
        await safeStorageSet(stateUpdate, storageContext);
      }

      if (shouldBroadcast) {
        broadcastState();
      }

      sendResponse({ success: true });
    } catch (error) {
      logger.error(`${storageContext}失敗:`, error);
      sendResponse({ success: false, error: error.message });
    }
  };
}

/**
 * 重置節拍調度狀態
 * 消除 START_TIMER、RESUME_TIMER、VIDEO_PLAY 中的重複代碼
 */
export function resetBeatScheduling(timerState, now = Date.now()) {
  timerState.timerStartTime = now;
  timerState.expectedBeatNumber = 0;

  const beatInterval = 60000 / timerState.currentBPM;
  timerState.nextBeatTime = timerState.timerStartTime + beatInterval;

  timerState.lastBPM = timerState.currentBPM;
  timerState.currentBeatInBar = 0;
  timerState.driftSamples = [];
  timerState.avgDrift = 0;
  timerState.lastTickTime = now;
}
