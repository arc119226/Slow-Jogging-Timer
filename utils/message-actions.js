/**
 * Message action types
 * Centralized action strings to prevent typos and enable autocomplete
 */

export const ACTIONS = {
  // ========== Timer Control ==========
  START_TIMER: 'START_TIMER',
  PAUSE_TIMER: 'PAUSE_TIMER',
  RESUME_TIMER: 'RESUME_TIMER',
  STOP_TIMER: 'STOP_TIMER',

  // ========== Settings Updates ==========
  UPDATE_BPM: 'UPDATE_BPM',
  TOGGLE_SOUND: 'TOGGLE_SOUND',
  UPDATE_OPACITY: 'UPDATE_OPACITY',
  UPDATE_TIME_SIGNATURE: 'UPDATE_TIME_SIGNATURE',
  UPDATE_SOUND_TYPE: 'UPDATE_SOUND_TYPE',
  UPDATE_DEFAULT_DURATION: 'UPDATE_DEFAULT_DURATION',
  TOGGLE_AUTO_START: 'TOGGLE_AUTO_START',

  // ========== State Management ==========
  GET_STATE: 'GET_STATE',
  STATE_UPDATE: 'STATE_UPDATE',

  // ========== Audio ==========
  PLAY_BEEP: 'PLAY_BEEP',
  SCHEDULE_BEEP: 'SCHEDULE_BEEP',
  PRELOAD_CASTANETS: 'PRELOAD_CASTANETS',
  PRELOAD_SNAREDRUM: 'PRELOAD_SNAREDRUM',

  // ========== Video Sync ==========
  VIDEO_PLAY: 'VIDEO_PLAY',
  VIDEO_PAUSE: 'VIDEO_PAUSE',

  // ========== Overlay (Content Script) ==========
  UPDATE_TIMER: 'updateTimer',
  TOGGLE_VISIBILITY: 'toggleVisibility',
  TOGGLE_OVERLAY_VISIBILITY: 'TOGGLE_OVERLAY_VISIBILITY',
  UPDATE_OPACITY_DISPLAY: 'updateOpacity',
  BEAT_PULSE: 'BEAT_PULSE',

  // ========== Lifecycle ==========
  OFFSCREEN_READY: 'OFFSCREEN_READY'
};
