# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Portuguese language support** (`pt` locale)
  - All 34 message keys translated to Portuguese
  - Supported languages now: zh_TW, zh_CN, en, ja, ko, ar, ru, es, fr, de, pt (11 total)

## [1.1.6] - 2026-01-07

### Added
- **German language support** (`de` locale)
  - All 34 message keys translated to German
  - Supported languages now: zh_TW, zh_CN, en, ja, ko, ar, ru, es, fr, de (10 total)

## [1.1.5] - 2026-01-07

### Added
- **French language support** (`fr` locale)
  - All 34 message keys translated to French
  - Supported languages now: zh_TW, zh_CN, en, ja, ko, ar, ru, es, fr (9 total)

## [1.1.4] - 2026-01-07

### Added
- **Spanish language support** (`es` locale)
  - All 34 message keys translated to Spanish
  - Supported languages now: zh_TW, zh_CN, en, ja, ko, ar, ru, es (8 total)

## [1.1.3] - 2026-01-07

### Added
- **Russian language support** (`ru` locale)
  - All 34 message keys translated to Russian
  - Supported languages now: zh_TW, zh_CN, en, ja, ko, ar, ru (7 total)

## [1.1.2] - 2026-01-07

### Fixed
- **CSS style pollution affecting YouTube pages** after extension installation
  - YouTube Premium logo was hidden, showing only "TW"
  - Video titles changed from white to blue color
  - Player control buttons rendered abnormally
  - Root cause: Global CSS selectors (`html`, `body`, `*`, `h1`, `button`) in `styles.css` were injected into YouTube pages, overriding native styles

### Changed
- Separated YouTube overlay styles into dedicated `content-script.css` file
  - Contains only namespaced selectors (`#slowjogging-*`, `.slowjogging-*`)
  - No global selectors that could affect YouTube's native styling
- Updated `manifest.json` to inject `content-script.css` instead of `styles.css` for content scripts
- Cleaned up `styles.css` by removing redundant overlay styles (moved to `content-script.css`)

### Technical Details
- `styles.css` now serves popup UI only (requires global resets for standalone window)
- `content-script.css` serves YouTube overlay only (fully namespaced, no pollution)
- CSS injection scope properly isolated between popup and content script contexts

## [1.1.1] - 2026-01-05

### Fixed
- **Auto-follow video playback completely broken** after v1.1.0 tab ownership implementation
  - Video pause not updating popup status to "paused"
  - Video resume not restarting timer from remaining time
  - New video playback not triggering timer restart
  - Root cause: Tab Ownership model was over-restrictive, blocking all auto-follow scenarios

### Changed
- Refactored auto-follow event handling logic with intelligent video tracking:
  - **Video ID tracking**: Added `getYouTubeVideoId()` function to parse YouTube video ID from URL
  - **Three-scenario model**: Rewrote VIDEO_PLAY handler to distinguish between:
    - Same video resume: continues from paused state
    - New video playback: restarts timer from remaining time (preserves progress)
    - Auto-start: starts timer from default duration
  - **Simplified VIDEO_PAUSE**: Removed tab ownership checks for auto-follow mode
  - **Tab Ownership adjustment**: Preserved for manual start conflicts, removed for auto-follow events
- Added video tracking state fields (not persisted to storage):
  - `currentVideoId`: Current playing video ID (for logging/debugging)
  - `lastAutoStartVideoId`: Last auto-started video ID (for new video detection)
- Enhanced STOP_TIMER to clear video tracking state

### Technical Details
- Video identification via regex: `/[?&]v=([^&]+)/` extracts YouTube video ID
- New video detection: `playVideoId !== lastAutoStartVideoId`
- Timer restart strategy for new videos:
  - Preserves `remainingSeconds` (doesn't reset to default duration)
  - Calls `resetBeatScheduling()` to recalculate beat timing
  - Restarts `timerInterval` for fresh rhythm scheduling
- Auto-follow now bypasses tab ownership checks (users only play one video at a time)
- Manual start (START_TIMER) still protected by tab ownership (multi-tab conflict prevention)

### User Experience Improvements
- ✅ Video pause → popup correctly shows "paused" status
- ✅ Video resume → timer continues from remaining time
- ✅ New video playback → timer restarts from remaining time (not default duration)
- ✅ Manual controls unaffected (START_TIMER still has multi-tab protection)
- ✅ Backward compatible (message format extended, doesn't break existing functionality)

### Documentation
- Added comprehensive auto-follow playback logic documentation to README.md
- Includes three scenario explanations, video ID identification mechanism, tab ownership model, and decision flow diagrams

## [1.1.0] - 2026-01-02

### Added
- **Multi-tab conflict resolution system** to prevent audio overlap
  - Tab ownership model: only one tab can own the timer at a time
  - `activeTabId` state field to track which tab owns the current timer session
  - `timerSource` state field to record timer start source ('manual' | 'auto' | 'none' | 'orphaned')
  - `chrome.tabs.onRemoved` listener for automatic cleanup when tabs close
- Event filtering for multi-tab scenarios:
  - `START_TIMER`: Rejects requests from non-owning tabs with error response
  - `VIDEO_PLAY`: Silently ignores auto-start events from non-owning tabs
  - `VIDEO_PAUSE`: Only responds to pause events from owning tab
- Multilingual error messages for timer conflicts:
  - English: "Timer is already running in another tab"
  - Traditional Chinese: "計時器已在其他分頁運行中"
  - Simplified Chinese: "计时器已在其他标签页运行中"
  - Japanese: "タイマーは既に別のタブで実行中です"
  - Korean: "타이머가 이미 다른 탭에서 실행 중입니다"
  - Arabic: "المؤقت يعمل بالفعل في علامة تبويب أخرى"
- Error response handling in popup.js with UI state restoration
- Orphaned timer support: timer continues running when owning tab closes

### Changed
- Enhanced START_TIMER handler with ownership acquisition and conflict detection
- Updated VIDEO_PLAY handler to filter events from non-owning tabs
- Updated VIDEO_PAUSE handler to only respond to owning tab
- Modified STOP_TIMER handler to clear ownership on timer stop
- Improved popup.js to handle error responses from background service worker

### Fixed
- Multiple YouTube tabs playing overlapping BPM audio simultaneously
- Auto-follow feature triggering multiple timers from different tabs
- Confusion when video playback in one tab affects timer in another tab
- Timer state inconsistency across multiple tabs

### Technical Details
- Uses `sender.tab.id` from Chrome message API to identify message source
- `activeTabId` is volatile (not persisted) since tab IDs become invalid after browser restart
- No new permissions required (sender.tab.id automatically provided, onRemoved doesn't need permission)
- Implements predictable "first-tab-wins" ownership model
- Global audio protection ensures only one BPM audio instance plays across all browser tabs

## [1.0.6] - 2026-01-02

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
