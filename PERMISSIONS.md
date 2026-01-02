# Permissions Documentation

This document explains all permissions requested by the Slow Jogging Timer extension and their purpose.

## Permissions (`manifest.json` → `permissions`)

### `storage`
**Purpose:** Persist user settings and timer state across browser sessions

**Usage:**
- Save timer state (remainingSeconds, currentBPM, isRunning, isPaused)
- Save user preferences (soundEnabled, soundType, timeSignature, opacity)
- Save default duration setting
- Storage writes are throttled (5-second batching) to optimize performance

**Storage Type:** chrome.storage.local (no sync, local only)

**Data Stored:**
```javascript
{
  remainingSeconds: Number,      // Current timer countdown value
  currentBPM: Number,             // Current BPM setting (60-360)
  isRunning: Boolean,             // Timer running state
  isPaused: Boolean,              // Timer paused state
  defaultDuration: Number,        // Default timer duration in seconds
  soundEnabled: Boolean,          // Whether sound is enabled
  soundType: String,              // "beep", "castanets", or "snaredrum"
  timeSignature: String,          // "2/4", "3/4", or "4/4"
  opacity: Number,                // Overlay opacity (0-100)
  autoFollowVideo: Boolean        // Auto-follow video playback setting
}
```

**Privacy:** All data is stored locally on the user's device. No data is transmitted to external servers.

---

### `offscreen`
**Purpose:** Create offscreen documents for Web Audio API playback in Service Worker context

**Why Required:**
- Manifest V3 service workers cannot directly access Web Audio API
- Offscreen documents provide DOM context required for audio playback
- Required for Chrome 109+ to play audio from background service workers

**Usage:**
- Create offscreen.html document when audio playback is needed
- Play BPM beat sounds (beep, castanets, snaredrum)
- Auto-close after 30 seconds of pause to save resources
- Only one offscreen document exists at a time

**Justification:** Shown to users in Chrome as:
> "Play BPM beat sounds for the slow jogging timer"

**Resource Management:**
- Document is only created when sound is enabled
- Automatically closed when timer stops
- Automatically closed after 30 seconds of pause
- AudioBuffer cache limited to 10 items

---

## Host Permissions (`manifest.json` → `host_permissions`)

### `https://www.youtube.com/*`
**Purpose:** Inject content script and display timer overlay on YouTube pages

**Usage:**
- Inject content-script.js to create overlay widget
- Inject styles.css for popup UI styling
- Monitor YouTube video play/pause events for auto-follow feature
- Communicate with background service worker for timer state sync

**Access Level:**
- Read: Monitor video playback state (play/pause events)
- Write: Inject overlay DOM elements, modify page CSS (overlay only)
- No access to: YouTube account data, video history, search history, comments

**Why YouTube Only:**
This extension is specifically designed for slow jogging training videos on YouTube. No other websites are accessed.

**Content Script Details:**
- Run timing: `document_idle` (after page load)
- Files injected: content-script.js, styles.css
- Widget ID: `slowjogging-timer-overlay`
- Position: Fixed top-right corner
- Z-index: High (overlay on top of video player)

---

## Web Accessible Resources (`manifest.json` → `web_accessible_resources`)

### Audio Files
**Resources:**
- `sounds/castanets.wav` - Real castanets sound effect
- `sounds/snaredrum.mp3` - Real snare drum sound effect

**Purpose:**
Allow offscreen document to load audio files from extension package

**Access Restrictions:**
- Only accessible from YouTube domain (`https://www.youtube.com/*`)
- Cannot be accessed from other websites
- Loaded via `chrome.runtime.getURL()` in offscreen.js

**Usage:**
- Decoded into AudioBuffer using Web Audio API
- Cached in memory (max 10 buffers)
- Played on beat schedule from background service worker

**File Sizes:**
- castanets.wav: ~50KB
- snaredrum.mp3: ~30KB

---

## Privacy & Security

### Data Collection
**We collect ZERO personal data:**
- ✗ No user analytics
- ✗ No browsing history
- ✗ No video watching history
- ✗ No account information
- ✗ No external network requests

### Data Storage
**All data is stored locally:**
- ✓ chrome.storage.local only (no sync)
- ✓ Settings persist across sessions
- ✓ No cloud backup
- ✓ No external servers

### Network Activity
**This extension makes ZERO network requests:**
- ✗ No analytics endpoints
- ✗ No update checks (handled by Chrome)
- ✗ No telemetry
- ✗ No external APIs

### Security Measures
- Input validation for all user settings (BPM, opacity, duration)
- Safe storage operations with error handling
- Promise rejection handling to prevent crashes
- No eval() or unsafe JavaScript execution
- No inline scripts in HTML files

---

## Permission Changes History

### Version 1.0.5 (Current)
**Removed:**
- ✗ `tabs` permission (was unnecessary, content script handles everything)

**Reason:** The `tabs` permission was originally added for querying YouTube tabs, but this functionality is handled by `chrome.tabs.sendMessage()` which doesn't require explicit `tabs` permission when sending messages to content scripts.

### Version 1.0.0 (Initial)
**Added:**
- ✓ `storage` - Timer state persistence
- ✓ `offscreen` - Audio playback
- ✓ `tabs` - YouTube tab management (later removed)
- ✓ `https://www.youtube.com/*` - Content script injection

---

## Frequently Asked Questions

### Q: Why does the extension need access to YouTube?
**A:** The extension injects a timer overlay on YouTube pages to help with slow jogging training videos. It only accesses YouTube, no other websites.

### Q: Does the extension track my YouTube viewing history?
**A:** No. The extension only monitors video play/pause events to sync the timer with video playback. It does not track, record, or transmit any viewing history.

### Q: Can the extension access my YouTube account?
**A:** No. The extension only has permission to inject UI elements on the YouTube page. It cannot access your account, subscriptions, watch history, or any personal data.

### Q: Why does it need storage permission?
**A:** To save your timer settings (BPM, duration, sound preferences) so they persist when you close and reopen the browser. All data is stored locally on your device.

### Q: What happens to my data if I uninstall the extension?
**A:** All stored data (timer settings, preferences) is automatically deleted when you uninstall the extension. Nothing remains on your device.

### Q: Does the extension work offline?
**A:** Partially. The timer and audio playback work offline, but you need to be on a YouTube page to see the overlay. The extension does not make any network requests.

---

## Developer Notes

### Adding New Permissions
If you need to add new permissions in the future:

1. **Document the purpose** in this file first
2. **Justify why it's necessary** and consider alternatives
3. **Update PRIVACY_POLICY.md** if it affects user data
4. **Request minimal scope** (e.g., specific hosts instead of `<all_urls>`)
5. **Add to CHANGELOG.md** for transparency

### Testing Permissions
To verify permissions are working:

```javascript
// Check storage permission
chrome.storage.local.get(null, (data) => console.log(data));

// Check offscreen permission
chrome.offscreen.createDocument({
  url: 'offscreen.html',
  reasons: ['AUDIO_PLAYBACK'],
  justification: 'Test'
});

// Check host permission
chrome.tabs.query({url: 'https://www.youtube.com/*'}, (tabs) => {
  console.log('YouTube tabs:', tabs.length);
});
```

### Permission Best Practices
- ✓ Request minimum necessary permissions
- ✓ Document all permissions clearly
- ✓ Remove unused permissions promptly
- ✓ Use optional permissions when possible
- ✓ Test without optional permissions
- ✓ Explain to users why each permission is needed

---

**Last Updated:** 2026-01-02
**Extension Version:** 1.0.5
