/**
 * Audio playback utilities
 * Generic audio file player with beat type support
 */

import { createLogger } from './logger.js';

const logger = createLogger('AudioPlayer');

// 音效配置映射
const AUDIO_CONFIGS = {
  castanets: {
    file: 'sounds/castanets.wav',
    beatParams: {
      strong: { volume: 0.8, playbackRate: 1.1 },
      medium: { volume: 0.5, playbackRate: 1.0 },
      weak: { volume: 0.3, playbackRate: 0.95 }
    }
  },
  snaredrum: {
    file: 'sounds/snaredrum.mp3',
    beatParams: {
      strong: { volume: 1.0, playbackRate: 1.1 },
      medium: { volume: 0.7, playbackRate: 1.0 },
      weak: { volume: 0.45, playbackRate: 0.95 }
    }
  }
};

/**
 * 通用音頻文件播放器
 */
export async function playAudioFile(
  soundType,
  beatType = 'weak',
  scheduledTime = null,
  audioContext,
  audioBuffers,
  fallbackFn
) {
  const config = AUDIO_CONFIGS[soundType];

  if (!config) {
    logger.error(`未知音效類型: ${soundType}`);
    return fallbackFn(beatType, scheduledTime);
  }

  const beatConfig = config.beatParams[beatType] || config.beatParams.weak;

  try {
    if (!audioContext) {
      logger.error('AudioContext 未初始化');
      return fallbackFn(beatType, scheduledTime);
    }

    if (!audioBuffers[soundType]) {
      await loadAudioFile(soundType, config.file, audioContext, audioBuffers);
    }

    if (!audioBuffers[soundType]) {
      logger.warn(`${soundType} 音效不可用，切換至嗶聲`);
      return fallbackFn(beatType, scheduledTime);
    }

    const startTime = scheduledTime !== null
      ? scheduledTime
      : audioContext.currentTime;

    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();

    source.buffer = audioBuffers[soundType];
    source.playbackRate.value = beatConfig.playbackRate;

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.setValueAtTime(beatConfig.volume, startTime);

    source.start(startTime);
  } catch (error) {
    logger.error(`${soundType} 音效播放錯誤:`, error);
    fallbackFn(beatType, scheduledTime);
  }
}

/**
 * 加載音頻文件到緩存
 */
async function loadAudioFile(soundType, filePath, audioContext, audioBuffers) {
  try {
    const response = await fetch(chrome.runtime.getURL(filePath));
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    audioBuffers[soundType] = await audioContext.decodeAudioData(arrayBuffer);
    logger.info(`${soundType} 音效加載成功`);
  } catch (error) {
    logger.error(`${soundType} 音效加載失敗:`, error);
    audioBuffers[soundType] = null;
  }
}

/**
 * 預加載音效
 */
export async function preloadAudio(soundType, audioContext, audioBuffers) {
  const config = AUDIO_CONFIGS[soundType];

  if (!config) {
    logger.error(`未知音效類型: ${soundType}`);
    return;
  }

  if (!audioBuffers[soundType]) {
    await loadAudioFile(soundType, config.file, audioContext, audioBuffers);
  }
}
