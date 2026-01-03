# Release v1.1.0: Multi-Tab Conflict Resolution

## 🎉 What's New

### Multi-Tab BPM Audio Conflict Protection

This release introduces a **tab ownership model** that prevents multiple YouTube tabs from simultaneously triggering BPM audio playback, eliminating audio overlap issues.

## ✨ New Features

- **Global Audio Protection**: Only one BPM audio instance plays across all browser tabs
- **Tab Ownership Tracking**: First tab to start the timer gets exclusive control
- **Automatic Conflict Resolution**:
  - Manual start conflicts show clear error messages
  - Auto-follow conflicts are silently ignored
- **Multilingual Error Messages**: Support for 6 languages (English, Traditional Chinese, Simplified Chinese, Japanese, Korean, Arabic)
- **Orphaned Timer Handling**: Timer continues running even if the owning tab closes

## 🔧 Technical Changes

### State Management
- Added `activeTabId` field to track which tab owns the timer
- Added `timerSource` field to record timer start source ('manual' | 'auto' | 'none' | 'orphaned')

### Event Filtering
- `START_TIMER`: Rejects requests from non-owning tabs with error response
- `VIDEO_PLAY`: Silently ignores auto-start events from non-owning tabs
- `VIDEO_PAUSE`: Only responds to pause events from owning tab

### Tab Lifecycle Management
- Added `chrome.tabs.onRemoved` listener for cleanup when tabs close
- Ownership automatically cleared when owning tab closes
- Timer becomes "orphaned" but continues running

## 💡 User Experience Improvements

- **Predictable Behavior**: First tab to start gets exclusive control, no unexpected timer switches
- **Clear Feedback**: Error messages displayed when conflicts occur (instead of silent failures)
- **State Sharing**: All tabs see the same timer state (BPM, duration, remaining time)
- **Popup Control**: Timer always controllable from popup regardless of which tab owns it

## 🐛 Bug Fixes

- Fixed issue where multiple YouTube tabs could play overlapping BPM audio
- Resolved confusion when auto-follow triggered timers in multiple tabs simultaneously

## 📋 Files Changed

- `background.js` - Core tab ownership logic (+67 lines)
- `popup.js` - Error response handling (+27 lines)
- `_locales/*/messages.json` - Error messages in 6 languages (+30 lines)
- `manifest.json` - Version bump to 1.1.0

**Total:** 8 files changed, 120 insertions(+), 15 deletions(-)

## 🧪 Testing

To verify the multi-tab protection works:

1. **Test Manual Start Conflict**:
   - Tab A: Start timer
   - Tab B: Try to start timer
   - ✅ Expected: Error message "Timer is already running in another tab"

2. **Test Auto-Follow Conflict**:
   - Enable "Auto-follow video playback"
   - Tab A: Play YouTube video (timer starts)
   - Tab B: Play YouTube video
   - ✅ Expected: Only one audio instance playing, Tab B ignored

3. **Test Tab Closure**:
   - Tab A running timer → Close Tab A
   - ✅ Expected: Timer continues, audio keeps playing

4. **Verify Audio Overlap**:
   - Open `chrome://media-internals`
   - Start timer in multiple tabs
   - ✅ Expected: Only ONE AudioContext active

## 📦 Installation

### From Source
```bash
git clone https://github.com/arc119226/Slow-Jogging-Timer.git
cd Slow-Jogging-Timer
git checkout v1.1.0
# Load unpacked in chrome://extensions/
```

### Upgrade from v1.0.x
Simply reload the extension in `chrome://extensions/`. All settings and timer state will be preserved.

## 🔄 Breaking Changes

None. This release is fully backward-compatible with v1.0.x.

## 🙏 Acknowledgments

This feature was developed in response to user feedback about audio overlap when using multiple YouTube tabs for slow jogging training.

---

**Full Changelog**: https://github.com/arc119226/Slow-Jogging-Timer/compare/v1.0.5...v1.1.0

🤖 Generated with [Claude Code](https://claude.com/claude-code)
