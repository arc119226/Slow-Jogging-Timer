/**
 * Application constants
 * Centralized configuration values for easy tuning
 */

// ========== BPM Constants ==========
export const BPM_MIN = 60;
export const BPM_MAX = 360;
export const BPM_FORMULA_MS = 60000; // Milliseconds per minute

// ========== Timer Constants ==========
export const SCHEDULE_AHEAD_TIME_MS = 100; // Pre-schedule audio this far ahead
export const DRIFT_SAMPLE_SIZE = 10; // Number of samples for drift averaging
export const SLEEP_DETECTION_THRESHOLD_MS = 1000; // Detect system sleep if drift exceeds this

// ========== Retry Constants ==========
export const MAX_VIDEO_ATTACH_RETRIES = 20; // Max attempts to attach video event listeners
export const VIDEO_ATTACH_RETRY_INTERVAL_MS = 500; // Interval between retries

// ========== Opacity Constants ==========
export const OPACITY_MIN = 0;
export const OPACITY_MAX = 100;

// ========== Beat Animation Constants ==========
export const BEAT_PULSE_DURATION_MS = 150; // Duration of beat indicator pulse animation
