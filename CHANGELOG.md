# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive error handling and validation across all components
- Storage write throttling (5-second batching) to reduce I/O operations
- AudioBuffer cache limit (10 items) with FIFO eviction
- MutationObserver cleanup on page unload to prevent memory leaks
- Offscreen document auto-close after 30 seconds of pause
- Input validation for BPM (60-360) and opacity (0-100) ranges
- Sleep/suspend detection and recovery mechanism
- Detailed logging system with categorized log levels

### Changed
- Refactored codebase into modular utility structure:
  - `utils/constants.js`: Centralized configuration
  - `utils/message-actions.js`: Type-safe message routing
  - `utils/time-utils.js`: Shared time formatting
  - `utils/logger.js`: Standardized logging
  - `utils/storage-utils.js`: Safe storage operations
  - `utils/message-handlers.js`: Message handling utilities
  - `utils/broadcast-utils.js`: Tab communication utilities
  - `utils/audio-player.js`: Audio playback management
- Improved timer precision with dynamic intervals (10-50ms based on BPM)
- Enhanced drift compensation algorithm for accurate beat scheduling
- Optimized storage operations from 60 writes/min to 12 writes/min

### Fixed
- BPM adjustment failure due to missing constant imports (BPM_MIN, BPM_MAX)
- Opacity adjustment failure due to missing constant imports (OPACITY_MIN, OPACITY_MAX)
- i18n text not displaying correctly across all 6 languages (en, zh_TW, zh_CN, ja, ko, ar)
- Settings not persisting after extension reload
- Custom duration input being overlapped by control buttons (two-row layout)
- Popup panel width inconsistency (fixed to 480px)
- Magic numbers and hardcoded strings throughout codebase
- Memory leaks from uncleaned observers
- Potential storage quota issues

### Removed
- Unused utility functions:
  - `safeStorageGet()` from storage-utils.js
  - `checkStorageQuota()` from storage-utils.js
  - `createMessageHandler()` from message-handlers.js
- Unused constants (7 total):
  - `SECOND_MS`, `DRIFT_THRESHOLD_MS`
  - Various `CHECK_INTERVAL_*` constants
  - Various `BEAT_INTERVAL_*_THRESHOLD` constants
- Unused i18n key `format_opacity` from all language files
- Unnecessary `tabs` permission from manifest.json

### Security
- Added Promise rejection handling to prevent uncaught errors
- Implemented safe storage operations with error recovery
- Added input validation to prevent out-of-range values

## [1.0.5] - Previous Release

### Changed
- Refactored message action constants for better maintainability
- Extracted timer interval helper function for code reusability

## [1.0.4] - Previous Release

### Added
- Progressive disclosure design for advanced settings
- Collapsible advanced settings section

### Changed
- Fixed popup panel width to 480px
- Improved button layout (no wrapping, stable positioning)

### Fixed
- Custom duration input field being covered by buttons (two-row Flexbox layout)

## Earlier Versions

See git history for earlier version changes.

---

**Legend:**
- `Added`: New features
- `Changed`: Changes in existing functionality
- `Deprecated`: Soon-to-be removed features
- `Removed`: Removed features
- `Fixed`: Bug fixes
- `Security`: Security improvements
