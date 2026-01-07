# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Extension (Manifest V3) that provides a slow jogging timer with BPM audio feedback for YouTube videos. The extension displays an overlay timer on YouTube pages and allows users to set custom workout durations with adjustable BPM (beats per minute) for rhythm pacing.

**Name:** 超慢跑計時器 (Slow Jogging Timer)
**Target Platform:** YouTube (https://www.youtube.com/*)

## Architecture

The extension follows the standard Chrome Extension MV3 architecture with four main components:

### 1. Popup (popup.html + popup.js)
- Main user interface for controlling the timer
- Manages BPM slider (60-360 BPM range)
- Sends control messages to background service worker
- Receives state updates from background via chrome.runtime.onMessage
- Does NOT contain timer logic (delegated to background)
- Persists state to chrome.storage.local (remainingSeconds, currentBPM, soundEnabled)

### 2. Content Script (content-script.js + content-script.css)
- Injected into YouTube pages (document_idle)
- Creates an overlay widget showing timer and BPM info
- Listens for messages from background worker
- Monitors YouTube video play/pause events for auto-start feature
- Widget includes a hide/show toggle button
- Widget ID: 'slowjogging-timer-overlay'
- CSS uses namespaced selectors (`#slowjogging-*`) to avoid polluting YouTube styles

### 3. Background Service Worker (background.js)
- CORE timer logic runs here (persistent across popup close)
- Manages BPM beat scheduling with drift compensation
- Coordinates offscreen document for audio playback
- Broadcasts state to popup and content scripts
- Uses chrome.runtime.onMessage listener

### 4. Offscreen Document (offscreen.html + offscreen.js)
- Handles Web Audio API playback (required for MV3 service workers)
- Supports synthesized beeps and audio file playback (castanets, snaredrum)
- Receives pre-scheduled audio commands from background
- Lives in a hidden document to enable audio in service worker context

## Key Implementation Details

### Timer Logic (background.js)
- Main timer runs with dynamic precision (10-50ms intervals based on BPM)
- BPM beats use drift-compensated scheduling algorithm
- Pre-schedules audio 100ms ahead to offscreen document
- Uses `lastBeatTime` to track when to play the next beat
- Implements sleep detection and recovery for laptop suspend scenarios
- State persists in chrome.storage.local (survives popup close)

### State Management
- Timer state persists in chrome.storage.local
- State includes: remainingSeconds, currentBPM, soundEnabled
- BPM slider uses 'input' event for real-time updates during running timer

### Communication Flow
```
Background (timer + state)
  ↓ broadcasts
  ├→ Popup (UI sync via chrome.runtime.sendMessage)
  ├→ Content Script (overlay update via chrome.tabs.sendMessage)
  └→ Offscreen (audio playback via chrome.runtime.sendMessage)

Content Script → Background (video play/pause events)
Popup → Background (user actions: start, pause, stop, settings changes)
```

### Multi-Tab Conflict Resolution

The extension implements a **tab ownership model** to prevent multiple YouTube tabs from simultaneously triggering BPM audio playback.

#### Ownership Model
- Only **one tab can own the timer** at any given time
- Ownership is acquired on first successful timer start (manual or automatic via auto-follow)
- Ownership is released only when the timer is completely stopped
- If the owning tab closes, the timer becomes **orphaned** but continues running

#### State Fields
- `activeTabId` (number | null): Tab ID that owns the current timer session (NOT persisted to storage)
- `timerSource` (string): How the timer was started ('manual' | 'auto' | 'none' | 'orphaned')

#### Behavior by Scenario

**Manual Start Conflict:**
- Tab A starts timer → acquires ownership
- Tab B attempts to start timer → **rejected with error message**
- Error displays in popup: "Timer is already running in another tab" (localized in 8 languages: en, zh_TW, zh_CN, ja, ko, ar, ru, es)
- UI state restored to allow retry

**Auto-Follow Conflict:**
- Tab A plays video → timer auto-starts, Tab A acquires ownership
- Tab B plays video → event **silently ignored**
- Only Tab A's timer runs, single audio instance

**Video Pause from Non-Owner:**
- Tab A owns timer, Tab B pauses video
- Tab B's pause event → **silently ignored**
- Only Tab A can pause/resume the timer

**Tab Closure:**
- Tab A owns timer → user closes Tab A
- Ownership cleared: `activeTabId = null`, `timerSource = 'orphaned'`
- Timer continues running (audio persists)
- Any tab's auto-follow events ignored (orphaned state)
- User can still control timer via popup (pause/stop)

**After Stop:**
- User stops timer → ownership cleared
- Next tab to start timer (manual or auto) acquires fresh ownership

#### Technical Implementation
- Uses `sender.tab.id` from Chrome message API to identify message source
- `activeTabId` is volatile (not persisted) since tab IDs become invalid after browser restart
- Event filtering happens in background.js message handlers (START_TIMER, VIDEO_PLAY, VIDEO_PAUSE)
- `chrome.tabs.onRemoved` listener detects tab closure and clears ownership
- No "tabs" permission required (sender.tab.id automatically provided, onRemoved doesn't need permission for just tabId)

#### User Experience
- **Global audio protection**: Only one BPM audio instance plays across all browser tabs
- **Predictable behavior**: First tab to start gets exclusive control
- **Clear feedback**: Error messages displayed when conflicts occur
- **State sharing**: All tabs see the same timer state (BPM, duration, remaining time)
- **Popup control**: Timer always controllable from popup regardless of tab ownership

## Development

### Testing the Extension
1. Load unpacked extension in Chrome: navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory
4. Navigate to any YouTube page to see the overlay
5. Click the extension icon to open the popup and start the timer

### Key Files to Modify
- **background.js**: Core timer logic, BPM beat scheduling, state management
- **popup.js**: UI controls, user interaction handling
- **content-script.js**: YouTube overlay widget behavior, video event monitoring
- **offscreen.js**: Audio playback (Web Audio API for beeps, audio files for castanets/snaredrum)
- **styles.css**: Popup-only styling (global resets, buttons, controls)
- **content-script.css**: YouTube overlay styling (namespaced selectors only, no global pollution)
- **manifest.json**: Permissions, content script matching, web accessible resources

### CSS Architecture
The extension uses **two separate CSS files** to prevent style pollution:
- **styles.css**: Used by `popup.html` only. Contains global resets (`html`, `body`, `*`) safe for standalone popup window.
- **content-script.css**: Injected into YouTube pages via `manifest.json`. Contains **only** namespaced selectors (`#slowjogging-*`, `.slowjogging-*`) to avoid overriding YouTube's native styles.

**Important**: Never add global selectors to `content-script.css` as they will pollute YouTube's page styling.

### Audio System
The extension uses Web Audio API in the offscreen document (offscreen.js) to enable audio in a service worker context. It supports three sound types:
- **Beep**: Synthesized tones using OscillatorNode (1200Hz → 800Hz exponential ramp, 0.1s duration)
- **Castanets**: Audio file (sounds/castanets.wav)
- **Snaredrum**: Audio file (sounds/snaredrum.mp3)

Audio files are declared as web accessible resources in manifest.json and loaded dynamically in the offscreen document.

### Permissions
- **storage**: Persist timer state across sessions
- **offscreen**: Create offscreen document for Web Audio API playback
- **host_permissions**: Only YouTube domain (https://www.youtube.com/*)

## Limitations & Notes

### Behavior
- Timer DOES persist when popup closes (runs in background service worker)
- BPM audio continues playing when popup is closed (via offscreen document)
- Content script widget is always created on YouTube pages (no lazy loading)
- Overlay widget position is fixed at top-right corner (not draggable)
- Auto-start feature requires manual toggle in popup (not enabled by default)

### Resource Management
- Storage writes are throttled to 5-second intervals (reduces writes from 60/min to 12/min)
- Offscreen document auto-closes after 30 seconds of pause to save resources
- AudioBuffer cache limited to 10 items with FIFO eviction
- MutationObserver cleaned up on page unload to prevent memory leaks

### Technical Constraints
- BPM range: 60-360 (validated in background.js)
- Opacity range: 0-100 (validated in background.js)
- Timer precision: 10-50ms intervals (dynamic based on BPM)
- Audio pre-scheduling: 100ms ahead to prevent timing drift
- Storage quota: Uses chrome.storage.local (no quota monitoring)

### Browser Compatibility
- Requires Chrome/Edge with Manifest V3 support
- Requires Web Audio API support
- Requires offscreen document API (Chrome 109+)
- Only tested on YouTube domain (https://www.youtube.com/*)

### Known Issues
- Sleep/suspend detection may cause brief audio desync (auto-recovers)
- YouTube SPA navigation may require page refresh in rare cases
- Custom duration input has no maximum validation (intentional for flexibility)
