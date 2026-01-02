# Chrome Web Store Submission Guide

This guide provides step-by-step instructions for submitting Slow Jogging Timer v1.0.6 to the Chrome Web Store.

## 📦 Distribution Package

**Package Name:** `slow-jogging-timer-v1.0.6.zip`
**Package Size:** 280 KB (0.27 MB)
**Total Files:** 27 files
**Version:** 1.0.6
**Created:** 2026-01-02

### Package Contents

```
LICENSE                                       1,109 bytes
PRIVACY_POLICY.md                             2,260 bytes
_locales/ar/messages.json                     4,741 bytes
_locales/en/messages.json                     4,268 bytes
_locales/ja/messages.json                     4,545 bytes
_locales/ko/messages.json                     4,474 bytes
_locales/zh_CN/messages.json                  4,381 bytes
_locales/zh_TW/messages.json                  4,380 bytes
background.js                                26,314 bytes
content-script.js                            12,280 bytes
icon.png                                    232,639 bytes (128x128)
manifest.json                                 1,071 bytes
offscreen.html                                  182 bytes
offscreen.js                                  6,055 bytes
popup.html                                    3,571 bytes
popup.js                                     10,859 bytes
sounds/castanets.wav                         20,044 bytes
sounds/snaredrum.mp3                         23,405 bytes
styles.css                                   12,600 bytes
utils/audio-player.js                         3,597 bytes
utils/broadcast-utils.js                      1,649 bytes
utils/constants.js                            1,023 bytes
utils/logger.js                                 584 bytes
utils/message-actions.js                      1,374 bytes
utils/message-handlers.js                       672 bytes
utils/storage-utils.js                          853 bytes
utils/time-utils.js                             678 bytes
```

### ✅ Included Files

- ✓ All JavaScript source files (background, content, popup, offscreen)
- ✓ All HTML files (popup, offscreen)
- ✓ All CSS files (styles.css)
- ✓ Icon (icon.png - 128x128px)
- ✓ All utility modules (utils/*.js)
- ✓ All language files (_locales/*/messages.json)
- ✓ All sound files (sounds/*.wav, sounds/*.mp3)
- ✓ LICENSE file
- ✓ PRIVACY_POLICY.md

### ❌ Excluded Files (Not Needed for Distribution)

- ✗ .git/ (version control)
- ✗ .gitignore (development)
- ✗ .claude/ (development)
- ✗ README.md (documentation, not needed in extension)
- ✗ CLAUDE.md (development documentation)
- ✗ CHANGELOG.md (available on GitHub)
- ✗ PERMISSIONS.md (available on GitHub)
- ✗ RELEASE_NOTES_v1.0.6.md (available on GitHub)
- ✗ img/ (documentation images)
- ✗ Old .zip files

---

## 🚀 Submission Steps

### 1. Create Chrome Web Store Developer Account

1. **Go to Chrome Web Store Developer Dashboard:**
   - https://chrome.google.com/webstore/devconsole

2. **Sign in with Google Account**

3. **Pay One-Time Registration Fee:**
   - $5 USD (one-time fee)
   - Required for publishing extensions

### 2. Upload Extension Package

1. **Click "New Item" Button**

2. **Upload the ZIP File:**
   - Select: `slow-jogging-timer-v1.0.6.zip`
   - Wait for upload and automatic verification

3. **Review Upload Status:**
   - Check for any errors or warnings
   - Chrome will automatically validate manifest.json

### 3. Fill in Store Listing Information

#### A. Product Details

**Display Name (English):**
```
Slow Jogging Timer
```

**Display Name (Traditional Chinese):**
```
超慢跑計時器
```

**Summary (English):**
```
BPM timer with customizable beats for YouTube slow jogging videos
```

**Summary (Traditional Chinese):**
```
在 YouTube 上顯示超慢跑計時器和 BPM，並且有可選節奏
```

**Description (English):**
```
Slow Jogging Timer is a Chrome extension designed for slow jogging training on YouTube. It provides a customizable BPM (beats per minute) timer with audio feedback to help maintain proper running rhythm.

Features:
• Customizable timer duration (15/30/45 minutes or custom)
• Adjustable BPM speed (60-360 BPM)
• Multiple time signatures (2/4, 3/4, 4/4)
• Three sound types: Beep (synthesized), Castanets (real), Snare Drum (real)
• Adjustable panel opacity
• Auto-follow video playback (optional)
• Multi-language support (English, 中文, 日本語, 한국어, العربية)

How to Use:
1. Open any YouTube video
2. Click the extension icon
3. Set your timer duration and BPM
4. Click "Start" to begin
5. The timer overlay appears on the YouTube page

Privacy:
• Zero data collection
• All settings stored locally
• No external network requests
• Open source on GitHub

Perfect for slow jogging enthusiasts following YouTube training videos!
```

**Description (Traditional Chinese):**
```
超慢跑計時器是一個專為 YouTube 超慢跑訓練設計的 Chrome 擴充功能。它提供可自訂的 BPM（每分鐘節拍數）計時器和音頻反饋，幫助保持正確的跑步節奏。

功能特色：
• 可自訂時長的計時器（15/30/45 分鐘或自訂）
• 可調整 BPM 速度（60-360 BPM）
• 拍號支持（2/4、3/4、4/4）
• 三種音效類型：合成嗶聲、真實響板、小鼓
• 可調整面板透明度
• 自動跟隨視頻播放（可選）
• 多語言支持（英文、中文、日文、韓文、阿拉伯文）

使用說明：
1. 打開任意 YouTube 視頻
2. 點擊擴充功能圖標
3. 設定計時器時長和 BPM
4. 點擊「開始」啟動計時器
5. 計時器覆蓋層將顯示在 YouTube 頁面上

隱私保護：
• 零數據收集
• 所有設置本地保存
• 無外部網絡請求
• 在 GitHub 上開源

非常適合跟隨 YouTube 訓練視頻的超慢跑愛好者！
```

#### B. Category

**Primary Category:**
- Productivity

**Secondary Category (if available):**
- Health & Fitness

#### C. Language

**Supported Languages:**
- English (default)
- 中文 (繁體) - Traditional Chinese
- 中文 (简体) - Simplified Chinese
- 日本語 - Japanese
- 한국어 - Korean
- العربية - Arabic

#### D. Icon & Screenshots

**Icon:**
- Already included in package: `icon.png` (128x128px)
- Should be uploaded separately as a 128x128 PNG file

**Screenshots (Required - at least 1, up to 5):**

You'll need to create screenshots showing:

1. **Screenshot 1: Popup Interface (1280x800 or 640x400)**
   - Show the timer control popup
   - Highlight BPM slider, duration selector, and controls

2. **Screenshot 2: YouTube Overlay (1280x800 or 640x400)**
   - Show the overlay on a YouTube page
   - Timer running with BPM display

3. **Screenshot 3: Advanced Settings (1280x800 or 640x400)**
   - Show the advanced settings section
   - Sound type, time signature, opacity controls

4. **Screenshot 4: Multiple Language Support (1280x800 or 640x400)**
   - Show interface in different languages (optional)

5. **Screenshot 5: Working Example (1280x800 or 640x400)**
   - Show timer in action with a slow jogging video

**Promotional Image (Optional but Recommended):**
- Size: 1400x560 or 920x680
- Shows extension features and benefits

#### E. Website & Support

**Official Website:**
```
https://github.com/arc119226/Slow-Jogging-Timer
```

**Support Email:**
```
[Your support email]
```

**Support URL (Optional):**
```
https://github.com/arc119226/Slow-Jogging-Timer/issues
```

### 4. Privacy Practices

**Single Purpose:**
```
Provide a BPM timer overlay for YouTube slow jogging training videos
```

**Permissions Justification:**

**`storage`:**
```
Required to save user preferences (timer duration, BPM, sound settings) locally on the user's device. All data is stored using chrome.storage.local and never transmitted externally.
```

**`offscreen`:**
```
Required to play audio (BPM beat sounds) from the background service worker. Chrome Manifest V3 service workers cannot directly access Web Audio API, so an offscreen document is needed for audio playback.
```

**Host Permission: `https://www.youtube.com/*`:**
```
Required to inject the timer overlay on YouTube pages and monitor video playback state for the auto-follow feature. The extension only works on YouTube and does not access any other websites.
```

**Data Usage Declaration:**

**Does this extension collect user data?**
- ☑ No

**Remote Code:**
- ☐ This extension uses remote code

**Privacy Policy:**
- ☑ I have a privacy policy
- URL: Include contents of PRIVACY_POLICY.md or link to GitHub

### 5. Distribution

**Visibility:**
- ☑ Public (recommended)
- ☐ Unlisted

**Geographic Distribution:**
- ☑ All regions (recommended)

**Pricing:**
- ☑ Free

### 6. Review & Submit

1. **Review All Information:**
   - Check all fields for accuracy
   - Verify screenshots are clear and representative
   - Double-check privacy declarations

2. **Click "Submit for Review"**

3. **Wait for Review:**
   - Initial review: 1-3 business days (typically)
   - You'll receive email updates on review status

4. **Address Review Feedback (if needed):**
   - Chrome may request changes or clarifications
   - Respond promptly to speed up approval

---

## 📋 Pre-Submission Checklist

Before submitting, verify:

- [ ] Extension package uploaded successfully (slow-jogging-timer-v1.0.6.zip)
- [ ] manifest.json version is 1.0.6
- [ ] All required fields filled in Store Listing
- [ ] At least 1 screenshot uploaded (up to 5 recommended)
- [ ] Icon uploaded (128x128 PNG)
- [ ] Privacy practices declared correctly
- [ ] Privacy policy provided
- [ ] Permissions justified with clear explanations
- [ ] Support email provided
- [ ] Extension tested in Chrome before submission
- [ ] No console errors or warnings

---

## 🔍 Common Review Issues & Solutions

### Issue 1: Single Purpose Requirement

**Problem:** Extension must have a single, clear purpose.

**Solution:** Our extension has a single purpose: "Provide a BPM timer overlay for YouTube slow jogging training videos."

### Issue 2: Permission Justification

**Problem:** Each permission must be clearly justified.

**Solution:** All three permissions have clear, specific justifications (see section 4 above).

### Issue 3: Privacy Policy

**Problem:** Extensions collecting or transmitting data must have a privacy policy.

**Solution:** We have PRIVACY_POLICY.md stating we collect ZERO data. All settings are stored locally.

### Issue 4: Minimum Functionality

**Problem:** Extension must provide meaningful functionality.

**Solution:** Our extension provides:
- BPM timer with audio feedback
- Multiple sound options
- Customizable settings
- YouTube integration
- Multi-language support

### Issue 5: Content Quality

**Problem:** Screenshots and descriptions must be professional.

**Solution:** Use clear, high-quality screenshots showing actual functionality. Write concise, accurate descriptions.

---

## 📊 Expected Timeline

| Stage | Duration | Notes |
|-------|----------|-------|
| Upload & Configure | 1-2 hours | Fill in all store listing info |
| Initial Review | 1-3 days | Automated + manual review |
| Revisions (if needed) | 1-2 days | Address feedback |
| Publication | Immediate | Once approved |

**Total Expected Time:** 2-7 days from submission to publication

---

## 🎯 Post-Publication

### After Approval:

1. **Extension Listed:**
   - URL format: `https://chrome.google.com/webstore/detail/[extension-id]`
   - Share the link with users

2. **Update README.md:**
   - Replace "Coming soon!" with actual Chrome Web Store link

3. **Create GitHub Release Assets:**
   - Attach `slow-jogging-timer-v1.0.6.zip` to v1.0.6 release

4. **Monitor Reviews:**
   - Respond to user reviews promptly
   - Address bug reports and feature requests

5. **Analytics (Optional):**
   - Chrome Web Store provides basic install statistics
   - Monitor user engagement

---

## 🔄 Future Updates

When releasing v1.0.7 or later:

1. Update `manifest.json` version
2. Create new package: `slow-jogging-timer-vX.X.X.zip`
3. Go to Developer Dashboard → Your Extension → "Upload Updated Package"
4. Update Store Listing if needed
5. Submit for review (typically faster for updates)

---

## 📞 Support Resources

**Chrome Web Store Developer Dashboard:**
https://chrome.google.com/webstore/devconsole

**Chrome Web Store Developer Documentation:**
https://developer.chrome.com/docs/webstore/

**Chrome Extension Development Docs:**
https://developer.chrome.com/docs/extensions/

**Chrome Web Store Program Policies:**
https://developer.chrome.com/docs/webstore/program-policies/

**Extension Quality Guidelines:**
https://developer.chrome.com/docs/webstore/best_practices/

---

**Package Created:** 2026-01-02
**Package Version:** 1.0.6
**Ready for Submission:** ✅ Yes
