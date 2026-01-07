# Release v1.2.0: Internationalization Milestone

**Release Date:** 2026-01-07

## Overview

This release consolidates the internationalization efforts from v1.1.3 to v1.1.25, expanding language support from 7 to 31 languages. This is a milestone release marking the completion of Phase 1 internationalization for the Slow Jogging Timer extension.

## What's New

### Complete Internationalization (31 Languages)

The extension now speaks your language! We've added support for 25 new languages, covering major language families worldwide.

## Language Support

### Full Language List

| Code | Language | Native Name |
|------|----------|-------------|
| en | English | English |
| zh_TW | Traditional Chinese | 繁體中文 |
| zh_CN | Simplified Chinese | 简体中文 |
| ja | Japanese | 日本語 |
| ko | Korean | 한국어 |
| ar | Arabic | العربية |
| ru | Russian | Русский |
| es | Spanish | Español |
| fr | French | Français |
| de | German | Deutsch |
| pt | Portuguese | Português |
| it | Italian | Italiano |
| nl | Dutch | Nederlands |
| pl | Polish | Polski |
| tr | Turkish | Türkçe |
| sv | Swedish | Svenska |
| da | Danish | Dansk |
| no | Norwegian | Norsk |
| fi | Finnish | Suomi |
| el | Greek | Ελληνικά |
| cs | Czech | Čeština |
| hu | Hungarian | Magyar |
| ro | Romanian | Română |
| bg | Bulgarian | Български |
| uk | Ukrainian | Українська |
| sk | Slovak | Slovenčina |
| hr | Croatian | Hrvatski |
| sr | Serbian | Srpski |
| sl | Slovenian | Slovenščina |
| id | Indonesian | Bahasa Indonesia |
| ms | Malay | Bahasa Melayu |

### Languages by Region

| Region | Languages Added |
|--------|-----------------|
| **Original (v1.1.2)** | en, zh_TW, zh_CN, ja, ko, ar |
| **European - Western** | ru, es, fr, de, pt, it, nl |
| **European - Nordic** | sv, da, no, fi |
| **European - Central/Eastern** | pl, cs, hu, sk, el |
| **European - Southeastern** | ro, bg, uk, hr, sr, sl |
| **Asian** | tr, id, ms |

## Technical Details

- Each language includes all 34 message keys for complete UI localization
- Error messages for multi-tab conflicts localized in all 31 languages
- Chrome i18n API automatically selects user's preferred language
- Fallback to English for unsupported languages

## Version History (Consolidated)

This release consolidates the following versions:

- v1.1.3: Russian (ru)
- v1.1.4: Spanish (es)
- v1.1.5: French (fr)
- v1.1.6: German (de)
- v1.1.7: Portuguese (pt)
- v1.1.8: Italian (it)
- v1.1.9: Dutch (nl)
- v1.1.10: Polish (pl)
- v1.1.11: Turkish (tr)
- v1.1.12: Swedish (sv)
- v1.1.13: Danish (da)
- v1.1.14: Norwegian (no)
- v1.1.15: Finnish (fi)
- v1.1.16: Greek (el)
- v1.1.17: Czech (cs)
- v1.1.18: Hungarian (hu)
- v1.1.19: Romanian (ro)
- v1.1.20: Bulgarian (bg)
- v1.1.21: Ukrainian (uk)
- v1.1.22: Slovak (sk)
- v1.1.23: Croatian (hr)
- v1.1.24: Serbian (sr)
- v1.1.25: Slovenian (sl), Indonesian (id), Malay (ms)

## Upgrade Notes

- No breaking changes from v1.1.x
- All settings preserved during upgrade
- Simply reload the extension in chrome://extensions/

## Statistics

- **Languages Added**: 25 new (v1.1.3 to v1.1.25)
- **Total Languages**: 31
- **Message Keys per Language**: 34
- **Files Changed**: 31 messages.json files + documentation

## Installation

### From Chrome Web Store (Recommended)

Visit: https://chromewebstore.google.com/detail/slow-jogging-timer/clbpbomlccokhipbamiaagpfiflldbni

### From Source

1. Download or clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project folder

---

**Full Changelog**: https://github.com/nicbh/Slow-Jogging-Timer/compare/v1.1.2...v1.2.0

Generated with [Claude Code](https://claude.com/claude-code)
