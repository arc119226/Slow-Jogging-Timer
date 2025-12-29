// ========== 工具函數導入 ==========
import { ACTIONS } from './utils/message-actions.js';

let audioContext = null;
let audioBuffers = {}; // 音頻緩存
let soundType = 'beep'; // 當前音效類型

// 播放 BPM 音效（路由函數）
async function playBPMSound(beatType = 'weak', currentSoundType = 'beep') {
  soundType = currentSoundType; // 更新緩存的音效類型

  if (soundType === 'beep') {
    playBeepSound(beatType);
  } else if (soundType === 'castanets') {
    await playCastanetsSound(beatType);
  } else if (soundType === 'snaredrum') {
    await playSnaredrumSound(beatType);
  }
}

// 播放嗶聲（合成音效）
// scheduledTime: AudioContext 時間軸上的絕對時間（秒），null 表示立即播放
function playBeepSound(beatType = 'weak', scheduledTime = null) {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.error('AudioContext 初始化失敗:', e);
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
    console.error('音效播放錯誤:', e);
  }
}

// 播放響板音效（音頻文件）
// scheduledTime: AudioContext 時間軸上的絕對時間（秒），null 表示立即播放
async function playCastanetsSound(beatType = 'weak', scheduledTime = null) {
  // 定義不同強度拍的音頻參數
  const castanetsConfigs = {
    strong: {
      volume: 0.8,        // 80% 音量
      playbackRate: 1.1   // 110% 速度（音調稍高）
    },
    medium: {
      volume: 0.5,        // 50% 音量
      playbackRate: 1.0   // 正常速度
    },
    weak: {
      volume: 0.3,        // 30% 音量
      playbackRate: 0.95  // 95% 速度（音調稍低）
    }
  };

  const config = castanetsConfigs[beatType] || castanetsConfigs.weak;

  try {
    // 確保 AudioContext 已初始化
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.error('AudioContext 初始化失敗:', e);
        // 降級到嗶聲
        playBeepSound(beatType, scheduledTime);
        return;
      }
    }

    // 加載音頻文件（如果尚未緩存）
    if (!audioBuffers['castanets']) {
      await loadCastanetsAudio();
    }

    if (!audioBuffers['castanets']) {
      console.warn('響板音效不可用，切換至嗶聲');
      playBeepSound(beatType, scheduledTime);
      return;
    }

    // ========== 支持預調度：使用指定時間或立即播放 ==========
    const startTime = scheduledTime !== null
      ? scheduledTime
      : audioContext.currentTime;

    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();

    source.buffer = audioBuffers['castanets'];
    source.playbackRate.value = config.playbackRate;

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.setValueAtTime(config.volume, startTime);

    // 預調度播放
    source.start(startTime);
  } catch (e) {
    console.error('響板音效播放錯誤，使用嗶聲:', e);
    playBeepSound(beatType, scheduledTime);
  }
}

// 加載響板音頻文件
async function loadCastanetsAudio() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.error('AudioContext 初始化失敗:', e);
      return;
    }
  }

  try {
    const response = await fetch(chrome.runtime.getURL('sounds/castanets.wav'));
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    audioBuffers['castanets'] = await audioContext.decodeAudioData(arrayBuffer);
    console.log('響板音效加載成功');
  } catch (error) {
    console.error('響板音效加載失敗:', error);
    audioBuffers['castanets'] = null;
  }
}

// 預加載響板音效
async function preloadCastanets() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.error('AudioContext 初始化失敗:', e);
      return;
    }
  }

  if (!audioBuffers['castanets']) {
    await loadCastanetsAudio();
  }
}

// 播放小鼓音效（音頻文件）
// scheduledTime: AudioContext 時間軸上的絕對時間（秒），null 表示立即播放
async function playSnaredrumSound(beatType = 'weak', scheduledTime = null) {
  // 定義不同強度拍的音頻參數
  const snaredrumConfigs = {
    strong: {
      volume: 1.0,        // 100% 音量（小鼓強拍較響板突出）
      playbackRate: 1.1   // 110% 速度（更緊湊）
    },
    medium: {
      volume: 0.7,        // 70% 音量
      playbackRate: 1.0   // 正常速度
    },
    weak: {
      volume: 0.45,       // 45% 音量
      playbackRate: 0.95  // 95% 速度（稍低沈）
    }
  };

  const config = snaredrumConfigs[beatType] || snaredrumConfigs.weak;

  try {
    // 確保 AudioContext 已初始化
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.error('AudioContext 初始化失敗:', e);
        // 降級到嗶聲
        playBeepSound(beatType, scheduledTime);
        return;
      }
    }

    // 加載音頻文件（如果尚未緩存）
    if (!audioBuffers['snaredrum']) {
      await loadSnaredrumAudio();
    }

    if (!audioBuffers['snaredrum']) {
      console.warn('小鼓音效不可用，切換至嗶聲');
      playBeepSound(beatType, scheduledTime);
      return;
    }

    // ========== 支持預調度：使用指定時間或立即播放 ==========
    const startTime = scheduledTime !== null
      ? scheduledTime
      : audioContext.currentTime;

    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();

    source.buffer = audioBuffers['snaredrum'];
    source.playbackRate.value = config.playbackRate;

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.setValueAtTime(config.volume, startTime);

    // 預調度播放
    source.start(startTime);
  } catch (e) {
    console.error('小鼓音效播放錯誤，使用嗶聲:', e);
    playBeepSound(beatType, scheduledTime);
  }
}

// 加載小鼓音頻文件
async function loadSnaredrumAudio() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.error('AudioContext 初始化失敗:', e);
      return;
    }
  }

  try {
    const response = await fetch(chrome.runtime.getURL('sounds/snaredrum.mp3'));
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    audioBuffers['snaredrum'] = await audioContext.decodeAudioData(arrayBuffer);
    console.log('小鼓音效加載成功');
  } catch (error) {
    console.error('小鼓音效加載失敗:', error);
    audioBuffers['snaredrum'] = null;
  }
}

// 預加載小鼓音效
async function preloadSnaredrum() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.error('AudioContext 初始化失敗:', e);
      return;
    }
  }

  if (!audioBuffers['snaredrum']) {
    await loadSnaredrumAudio();
  }
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
        console.error('AudioContext 初始化失敗:', e);
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
    } else if (currentSoundType === 'castanets') {
      // 正確處理 async
      playCastanetsSound(beatType, scheduledTime).then(() => {
        sendResponse({ success: true });
      }).catch(err => {
        console.error('響板播放失敗:', err);
        // 降級到嗶聲
        playBeepSound(beatType, scheduledTime);
        sendResponse({ success: true });
      });
      return true;  // 保持消息通道開啟以支援異步回應
    } else if (currentSoundType === 'snaredrum') {
      // 正確處理 async
      playSnaredrumSound(beatType, scheduledTime).then(() => {
        sendResponse({ success: true });
      }).catch(err => {
        console.error('小鼓播放失敗:', err);
        // 降級到嗶聲
        playBeepSound(beatType, scheduledTime);
        sendResponse({ success: true });
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
