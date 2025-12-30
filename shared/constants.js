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
export const SECOND_MS = 1000; // Milliseconds per second
export const DRIFT_THRESHOLD_MS = 50; // Threshold for drift detection
export const DRIFT_SAMPLE_SIZE = 10; // Number of samples for drift averaging
export const SLEEP_DETECTION_THRESHOLD_MS = 1000; // Detect system sleep if drift exceeds this

// ========== Retry Constants ==========
export const MAX_VIDEO_ATTACH_RETRIES = 20; // Max attempts to attach video event listeners
export const VIDEO_ATTACH_RETRY_INTERVAL_MS = 500; // Interval between retries

// ========== Check Interval Thresholds (BPM-based) ==========
export const CHECK_INTERVAL_FAST_MS = 10; // For BPM > 300
export const CHECK_INTERVAL_MED_MS = 25; // For BPM 150-300
export const CHECK_INTERVAL_SLOW_MS = 50; // For BPM < 150
export const BEAT_INTERVAL_FAST_THRESHOLD = 200; // Beat interval < 200ms = fast BPM
export const BEAT_INTERVAL_MED_THRESHOLD = 400; // Beat interval < 400ms = medium BPM

// ========== Opacity Constants ==========
export const OPACITY_MIN = 0;
export const OPACITY_MAX = 100;

// ========== Beat Animation Constants ==========
export const BEAT_PULSE_DURATION_MS = 150; // Duration of beat indicator pulse animation
