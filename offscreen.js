// ========== 工具函數導入 ==========
import { ACTIONS } from './utils/message-actions.js';
import { createLogger } from './utils/logger.js';
import { playAudioFile, preloadAudio } from './utils/audio-player.js';

const logger = createLogger('Offscreen');

let audioContext = null;
let audioBuffers = {}; // 音頻緩存
let soundType = 'beep'; // 當前音效類型

// 播放 BPM 音效（路由函數）
async function playBPMSound(beatType = 'weak', currentSoundType = 'beep') {
  soundType = currentSoundType; // 更新緩存的音效類型

  if (soundType === 'beep') {
    playBeepSound(beatType);
  } else if (soundType === 'castanets' || soundType === 'snaredrum') {
    await playAudioFile(
      soundType,
      beatType,
      null,
      audioContext,
      audioBuffers,
      playBeepSound
    );
  }
}

// 播放嗶聲（合成音效）
// scheduledTime: AudioContext 時間軸上的絕對時間（秒），null 表示立即播放
function playBeepSound(beatType = 'weak', scheduledTime = null) {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      logger.error('AudioContext 初始化失敗:', e);
      return;
    }
  }

  // 定義不同強度拍的音頻參數
  const beatConfigs = {
    strong: {
      startFreq: 1400,
      endFreq: 1000,
      volume: 0.45,
      duration: 0.12
    },
    medium: {
      startFreq: 1200,
      endFreq: 900,
      volume: 0.35,
      duration: 0.11
    },
    weak: {
      startFreq: 1000,
      endFreq: 700,
      volume: 0.25,
      duration: 0.10
    }
  };

  const config = beatConfigs[beatType] || beatConfigs.weak;

  try {
    // ========== 支持預調度：使用指定時間或立即播放 ==========
    const startTime = scheduledTime !== null
      ? scheduledTime
      : audioContext.currentTime;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.connect(gain);
    gain.connect(audioContext.destination);

    // 根據拍類型設置頻率掃描（使用 startTime）
    osc.frequency.setValueAtTime(config.startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(config.endFreq, startTime + config.duration * 0.5);

    // 音量包絡 - 快速攻擊，指數衰減（使用 startTime）
    gain.gain.setValueAtTime(config.volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + config.duration);

    // 預調度播放
    osc.start(startTime);
    osc.stop(startTime + config.duration);
  } catch (e) {
    logger.error('音效播放錯誤:', e);
  }
}

// 預加載響板音效
async function preloadCastanets() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      logger.error('AudioContext 初始化失敗:', e);
      return;
    }
  }
  await preloadAudio('castanets', audioContext, audioBuffers);
}

// 預加載小鼓音效
async function preloadSnaredrum() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      logger.error('AudioContext 初始化失敗:', e);
      return;
    }
  }
  await preloadAudio('snaredrum', audioContext, audioBuffers);
}

// 監聽來自 background 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // ========== 新增：預調度播放（階段二） ==========
  if (request.action === ACTIONS.SCHEDULE_BEEP) {
    const currentSoundType = request.soundType || soundType;
    const beatType = request.beatType || 'weak';
    const delay = request.delay;  // 相對延遲（毫秒）

    // 確保 AudioContext 已初始化
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        logger.error('AudioContext 初始化失敗:', e);
        sendResponse({ success: false, error: 'AudioContext 初始化失敗' });
        return true;
      }
    }

    // 計算 AudioContext 時間軸上的調度時間
    // 使用 Math.max(0, ...) 確保延遲不為負數
    const scheduledTime = audioContext.currentTime + Math.max(0, delay / 1000);

    if (currentSoundType === 'beep') {
      playBeepSound(beatType, scheduledTime);
      sendResponse({ success: true });
    } else if (currentSoundType === 'castanets' || currentSoundType === 'snaredrum') {
      // 使用統一的音頻播放器
      playAudioFile(
        currentSoundType,
        beatType,
        scheduledTime,
        audioContext,
        audioBuffers,
        playBeepSound
      ).then(() => {
        sendResponse({ success: true });
      }).catch(err => {
        logger.error(`${currentSoundType} 播放失敗:`, err);
        sendResponse({ success: false, error: err.message });
      });
      return true;  // 保持消息通道開啟以支援異步回應
    }

    return true;
  }

  // ========== 保留：立即播放（向後兼容） ==========
  if (request.action === ACTIONS.PLAY_BEEP) {
    const currentSoundType = request.soundType || soundType;
    playBPMSound(request.beatType || 'weak', currentSoundType);
    sendResponse({ success: true });
  }

  if (request.action === ACTIONS.PRELOAD_CASTANETS) {
    preloadCastanets().then(() => {
      sendResponse({ success: true });
    });
    return true; // 保持消息通道開啟以支援異步回應
  }

  if (request.action === ACTIONS.PRELOAD_SNAREDRUM) {
    preloadSnaredrum().then(() => {
      sendResponse({ success: true });
    });
    return true; // 保持消息通道開啟以支援異步回應
  }

  return true;
});

// 通知 background offscreen 已就緒
chrome.runtime.sendMessage({ action: ACTIONS.OFFSCREEN_READY }).catch(() => {
  // Background 可能尚未準備好，忽略錯誤
});
