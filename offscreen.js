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
  }
}

// 播放嗶聲（合成音效）
function playBeepSound(beatType = 'weak') {
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
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.connect(gain);
    gain.connect(audioContext.destination);

    // 根據拍類型設置頻率掃描
    osc.frequency.setValueAtTime(config.startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(config.endFreq, now + config.duration * 0.5);

    // 音量包絡 - 快速攻擊，指數衰減
    gain.gain.setValueAtTime(config.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + config.duration);

    osc.start(now);
    osc.stop(now + config.duration);
  } catch (e) {
    console.error('音效播放錯誤:', e);
  }
}

// 播放響板音效（音頻文件）
async function playCastanetsSound(beatType = 'weak') {
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
        playBeepSound(beatType);
        return;
      }
    }

    // 加載音頻文件（如果尚未緩存）
    if (!audioBuffers['castanets']) {
      await loadCastanetsAudio();
    }

    if (!audioBuffers['castanets']) {
      console.warn('響板音效不可用，切換至嗶聲');
      playBeepSound(beatType);
      return;
    }

    const now = audioContext.currentTime;
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();

    source.buffer = audioBuffers['castanets'];
    source.playbackRate.value = config.playbackRate;

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.setValueAtTime(config.volume, now);

    source.start(now);
  } catch (e) {
    console.error('響板音效播放錯誤，使用嗶聲:', e);
    playBeepSound(beatType);
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

// 監聽來自 background 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PLAY_BEEP') {
    const currentSoundType = request.soundType || soundType;
    playBPMSound(request.beatType || 'weak', currentSoundType);
    sendResponse({ success: true });
  }

  if (request.action === 'PRELOAD_CASTANETS') {
    preloadCastanets().then(() => {
      sendResponse({ success: true });
    });
    return true; // 保持消息通道開啟以支援異步回應
  }

  return true;
});

// 通知 background offscreen 已就緒
chrome.runtime.sendMessage({ action: 'OFFSCREEN_READY' }).catch(() => {
  // Background 可能尚未準備好，忽略錯誤
});
