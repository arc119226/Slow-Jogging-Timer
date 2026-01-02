/**
 * Message handler utilities
 * Provides handler abstraction for background message processing
 */

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
