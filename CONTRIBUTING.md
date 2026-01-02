# Contributing to Slow Jogging Timer

Thank you for your interest in contributing to Slow Jogging Timer! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Internationalization](#internationalization)
- [Questions](#questions)

## Code of Conduct

This project follows a simple code of conduct:

- **Be respectful** - Treat everyone with respect and kindness
- **Be constructive** - Provide helpful feedback and suggestions
- **Be collaborative** - Work together towards improving the project
- **Be patient** - Remember that contributors may have different skill levels

## Getting Started

### Prerequisites

- Chrome or Edge browser (latest version)
- Basic knowledge of JavaScript (ES6+)
- Familiarity with Chrome Extension APIs (helpful but not required)
- Git installed on your system

### Finding Something to Work On

1. **Check existing issues:**
   - Browse [open issues](https://github.com/arc119226/Slow-Jogging-Timer/issues)
   - Look for issues labeled `good first issue` or `help wanted`

2. **Report bugs:**
   - Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md)
   - Provide detailed steps to reproduce

3. **Suggest features:**
   - Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md)
   - Explain the use case and benefits

4. **Ask questions:**
   - Use the [Question template](.github/ISSUE_TEMPLATE/question.md)
   - Check existing issues first to avoid duplicates

## How to Contribute

### Reporting Bugs

1. **Search existing issues** to avoid duplicates
2. **Use the bug report template** when creating a new issue
3. **Include:**
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs. actual behavior
   - Browser and OS information
   - Console errors (if any)
   - Screenshots (if applicable)

### Suggesting Features

1. **Search existing feature requests** to avoid duplicates
2. **Use the feature request template**
3. **Explain:**
   - The problem or use case
   - Proposed solution
   - Who would benefit
   - Alternatives considered

### Improving Documentation

Documentation improvements are always welcome! This includes:

- Fixing typos or grammar
- Clarifying unclear instructions
- Adding examples
- Translating documentation
- Updating outdated information

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/Slow-Jogging-Timer.git
cd Slow-Jogging-Timer
```

### 2. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the cloned repository folder

### 3. Make Changes

1. Create a new branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes to the code

3. Test your changes thoroughly

### 4. Testing Your Changes

After making changes:

1. **Reload the extension:**
   - Go to `chrome://extensions/`
   - Click the reload icon on the extension card

2. **Test on YouTube:**
   - Open a YouTube video
   - Click the extension icon
   - Test all functionality

3. **Check console for errors:**
   - Right-click extension popup → Inspect
   - Press F12 on YouTube page
   - Look for errors in Console tab

## Coding Standards

### JavaScript Style

- **ES6+ syntax** - Use modern JavaScript features
- **No var** - Use `const` and `let` instead
- **Arrow functions** - Prefer arrow functions for callbacks
- **Template literals** - Use backticks for string interpolation
- **Destructuring** - Use destructuring when appropriate

### Code Organization

- **Modular structure** - Keep related code together
- **Utility functions** - Place shared utilities in `utils/` directory
- **Constants** - Define constants in `utils/constants.js`
- **Avoid duplication** - Extract common code into functions

### Naming Conventions

- **Variables and functions** - camelCase (`currentBPM`, `updateTimer`)
- **Constants** - UPPER_SNAKE_CASE (`BPM_MIN`, `OPACITY_MAX`)
- **Classes** - PascalCase (if used)
- **Files** - kebab-case (`content-script.js`, `audio-player.js`)

### Comments and Documentation

```javascript
// Good: Explain WHY, not WHAT
// Throttle storage writes to reduce I/O operations
const storageSaveTimer = null;

// Bad: Obvious comment
// Set timer to null
const storageSaveTimer = null;
```

- **JSDoc comments** for functions:
  ```javascript
  /**
   * Updates the timer display with remaining time
   * @param {number} seconds - Remaining seconds
   */
  function updateTimerDisplay(seconds) {
    // ...
  }
  ```

- **Explain complex logic** with inline comments
- **No commented-out code** - Remove it or explain why it's kept
- **TODOs** - Use `// TODO:` for future improvements

### Best Practices

1. **Error Handling:**
   ```javascript
   // Good: Always handle Promise rejections
   chrome.storage.local.set(data)
     .catch(error => logger.error('Storage failed:', error));

   // Bad: Unhandled rejection
   chrome.storage.local.set(data);
   ```

2. **Resource Cleanup:**
   ```javascript
   // Good: Clean up observers
   window.addEventListener('beforeunload', () => {
     observer.disconnect();
   });
   ```

3. **Input Validation:**
   ```javascript
   // Good: Validate and constrain input
   const bpm = Math.max(BPM_MIN, Math.min(BPM_MAX, userInput));
   ```

4. **No Console Pollution:**
   - Use `logger.js` for logging
   - Remove debug `console.log` statements before committing

## Commit Guidelines

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic changes)
- `refactor:` - Code refactoring (no feature changes)
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks (dependencies, build, etc.)

### Examples

```bash
# Good commit messages
feat(timer): add custom duration input validation
fix(bpm): resolve adjustment failure due to missing imports
docs(readme): update installation instructions
perf(storage): implement 5-second write throttling
refactor(utils): extract message handlers to separate file

# Bad commit messages
update code
fix bug
changes
wip
```

### Commit Message Body

For complex changes, add a detailed body:

```
fix(bpm): resolve adjustment failure due to missing imports

The BPM adjustment was failing because BPM_MIN and BPM_MAX
constants were used in validation logic but not imported from
utils/constants.js. This caused ReferenceError exceptions.

Fixes #42
```

### Signing Commits

Add the following footer to commits:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

(Only if you actually used Claude Code for assistance)

## Pull Request Process

### Before Submitting

1. **Test thoroughly:**
   - Manual testing on Chrome
   - Test all affected features
   - Check console for errors
   - Test on different YouTube videos

2. **Update documentation:**
   - Update CHANGELOG.md
   - Update README.md (if needed)
   - Update PERMISSIONS.md (if permissions changed)

3. **Code quality:**
   - Remove debug code
   - Follow coding standards
   - Add comments for complex logic
   - Ensure no console warnings

### Submitting a Pull Request

1. **Push your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request on GitHub:**
   - Use the [PR template](.github/pull_request_template.md)
   - Fill in all required sections
   - Link related issues

3. **PR Checklist:**
   - [ ] Code follows project style
   - [ ] All tests pass
   - [ ] Documentation updated
   - [ ] CHANGELOG.md updated
   - [ ] No breaking changes (or clearly documented)
   - [ ] All languages updated (if UI text changed)

### Review Process

1. **Automated checks** - PR must pass any automated checks
2. **Code review** - Maintainers will review your code
3. **Feedback** - Address any requested changes
4. **Approval** - Once approved, PR will be merged

### After Merge

- Your contribution will be included in the next release
- You'll be credited in CHANGELOG.md
- Thank you for contributing! 🎉

## Testing

### Manual Testing Checklist

Test these scenarios before submitting:

**Timer Functionality:**
- [ ] Start timer
- [ ] Pause timer
- [ ] Resume timer
- [ ] Stop timer
- [ ] Timer completes successfully
- [ ] Timer persists after closing popup

**BPM Controls:**
- [ ] Adjust BPM slider (60-360)
- [ ] BPM changes during running timer
- [ ] Audio plays at correct BPM
- [ ] BPM validation works (rejects out-of-range values)

**Sound Settings:**
- [ ] Toggle sound on/off
- [ ] Switch between beep/castanets/snaredrum
- [ ] Volume is appropriate
- [ ] Sound stops when timer stops

**Time Signature:**
- [ ] Switch between 2/4, 3/4, 4/4
- [ ] Strong/weak beats are distinguishable
- [ ] Pattern repeats correctly

**Duration Settings:**
- [ ] Select preset durations (15/30/45 min)
- [ ] Enter custom duration
- [ ] Validation works for custom input

**Opacity:**
- [ ] Adjust opacity slider (0-100)
- [ ] Overlay opacity changes in real-time

**Auto-follow:**
- [ ] Enable/disable auto-follow
- [ ] Timer starts with video play
- [ ] Timer pauses with video pause

**Persistence:**
- [ ] Settings persist after browser restart
- [ ] Timer state persists when popup closes

**Languages:**
- [ ] Test in multiple browser languages
- [ ] All text displays correctly
- [ ] No missing translations

### Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Edge (latest, if possible)

## Internationalization

### Adding/Updating Translations

The extension supports 6 languages. When adding user-facing text:

1. **Never hardcode strings** - Use `chrome.i18n.getMessage()`

2. **Update all 6 language files:**
   - `_locales/en/messages.json` (English)
   - `_locales/zh_TW/messages.json` (Traditional Chinese)
   - `_locales/zh_CN/messages.json` (Simplified Chinese)
   - `_locales/ja/messages.json` (Japanese)
   - `_locales/ko/messages.json` (Korean)
   - `_locales/ar/messages.json` (Arabic)

3. **Format:**
   ```json
   {
     "message_key": {
       "message": "Translated text",
       "description": "Explanation for translators"
     }
   }
   ```

4. **Usage in code:**
   ```javascript
   const text = chrome.i18n.getMessage('message_key');
   ```

5. **Test all languages:**
   - Change browser language in `chrome://settings/languages`
   - Reload extension
   - Verify text displays correctly

## Questions?

If you have questions about contributing:

1. **Check existing documentation:**
   - README.md
   - CLAUDE.md (developer guide)
   - PERMISSIONS.md
   - This CONTRIBUTING.md

2. **Search existing issues:**
   - Someone may have asked the same question

3. **Create a new issue:**
   - Use the [Question template](.github/ISSUE_TEMPLATE/question.md)

4. **Contact:**
   - GitHub Issues: https://github.com/arc119226/Slow-Jogging-Timer/issues

---

## Attribution

Contributors will be recognized in:
- CHANGELOG.md for their contributions
- GitHub's automatic contributor recognition

Thank you for contributing to Slow Jogging Timer! Your efforts help make slow jogging training better for everyone. 🏃‍♂️💨
