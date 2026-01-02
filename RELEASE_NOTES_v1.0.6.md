# Release Notes v1.0.6

This release focuses on stability improvements, performance optimizations, code quality enhancements, and comprehensive documentation.

## 🔧 Stability Improvements

- **Fixed critical BPM and opacity adjustment failures** - Resolved missing constant imports that broke adjustment controls
- **Comprehensive error handling** - Added validation across all components
- **Input validation** - BPM range (60-360) and opacity range (0-100) enforcement
- **Sleep/suspend detection** - Automatic recovery mechanism for laptop sleep scenarios

## ⚡ Performance Optimizations

- **Storage write reduction (80%)** - Optimized from 60 writes/min to 12 writes/min with 5-second batching
- **Resource management** - Offscreen document auto-closes after 30 seconds of pause
- **Memory optimization** - AudioBuffer cache limited to 10 items with FIFO eviction
- **Memory leak prevention** - MutationObserver cleanup on page unload

## 🏗️ Code Quality

- **Modular refactoring** - Reorganized into 8 utility modules:
  - `utils/constants.js` - Centralized configuration
  - `utils/message-actions.js` - Type-safe message routing
  - `utils/time-utils.js` - Shared time formatting
  - `utils/logger.js` - Standardized logging
  - `utils/storage-utils.js` - Safe storage operations
  - `utils/message-handlers.js` - Message handling utilities
  - `utils/broadcast-utils.js` - Tab communication utilities
  - `utils/audio-player.js` - Audio playback management
- **Code cleanup** - Removed 145 lines of unused code
- **Standardized logging** - Consistent log levels and categorization

## 📚 Documentation

- **Added CHANGELOG.md** - Comprehensive change log following Keep a Changelog format
- **Added PERMISSIONS.md** - Detailed permissions documentation and privacy policy
- **Updated README.md** - Added "Limitations & Notes" section (bilingual)
- **Updated CLAUDE.md** - Enhanced developer guide with technical constraints

## 🐛 Bug Fixes

- Fixed BPM adjustment failure due to missing constant imports (`BPM_MIN`, `BPM_MAX`)
- Fixed opacity adjustment failure due to missing constant imports (`OPACITY_MIN`, `OPACITY_MAX`)
- Fixed i18n text not displaying correctly across all 6 languages (en, zh_TW, zh_CN, ja, ko, ar)
- Fixed settings not persisting after extension reload
- Fixed custom duration input being overlapped by control buttons
- Fixed popup panel width inconsistency (now fixed to 480px)
- Fixed magic numbers and hardcoded strings throughout codebase
- Fixed memory leaks from uncleaned observers
- Fixed potential storage quota issues

## 🗑️ Removed

- Unused utility functions (3 total)
- Unused constants (7 total)
- Unused i18n key (`format_opacity`) from all language files
- Unnecessary `tabs` permission from manifest

## 🔒 Security & Privacy

- Zero data collection policy maintained
- All data stored locally (chrome.storage.local)
- No external network requests
- Input validation to prevent out-of-range values
- Safe storage operations with error recovery

## ⚙️ Breaking Changes

**None** - This is a backward compatible update.

## 📦 Installation

### From Chrome Web Store
Coming soon!

### Manual Installation (Developer Mode)
1. Download the source code (zip or tar.gz below)
2. Extract to a folder
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" (top right)
5. Click "Load unpacked" and select the extracted folder

## 🔄 Upgrade Notes

If you're already using version 1.0.5:
- Simply reload the extension in `chrome://extensions/`
- All your settings will be preserved automatically
- No manual configuration needed

## 📊 Commit History

This release includes the following commits:
- `04d97aa` - docs: 完成階段 5 文檔更新
- `f779786` - chore: 移除未使用的代碼和 i18n 鍵
- `0932a10` - perf: 實施 4 項資源管理優化，減少內存和存儲壓力
- `24147c5` - fix: 修復 BPM 和透明度調整失效問題
- `974d0ee` - fix: 添加 7 個驗證和錯誤處理改進，提升擴展健壯性
- `bbe0918` - fix: 修復 5 個高優先級穩定性問題，防止崩潰和數據丟失

## 🙏 Acknowledgments

Thanks to all slow jogging enthusiasts for your support!

---

**Full Changelog**: https://github.com/arc119226/Slow-Jogging-Timer/blob/main/CHANGELOG.md
**Permissions Documentation**: https://github.com/arc119226/Slow-Jogging-Timer/blob/main/PERMISSIONS.md
