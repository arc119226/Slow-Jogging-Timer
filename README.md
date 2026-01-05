# 超慢跑計時器 / Slow Jogging Timer

> 為 YouTube 超慢跑訓練視頻提供 BPM 節拍計時器的 Chrome 擴充功能

## 功能特色 / Features

- 可自訂時長的計時器（1-3600秒）
- BPM 節拍音效（60-360 BPM）
- 拍號支持（2/4、3/4、4/4）
- 三種音效類型（合成嗶聲 + 真實響板 + 小鼓）
- 可調整面板透明度
- YouTube 頁面覆蓋層顯示
- 設置自動保存

## 安裝 / Installation

### 從 Chrome Web Store 安裝（推薦）
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-安裝擴充功能-blue?style=for-the-badge&logo=googlechrome)](https://chromewebstore.google.com/detail/slow-jogging-timer/clbpbomlccokhipbamiaagpfiflldbni)

點擊上方按鈕前往 Chrome Web Store 安裝

### 從源碼安裝（開發者模式）
1. 下載或 Clone 此儲存庫
2. 打開 Chrome 瀏覽器，前往 `chrome://extensions/`
3. 開啟右上角的「開發人員模式」
4. 點擊「載入未封裝項目」
5. 選擇此項目的資料夾

## 使用說明 / Usage

1. 打開任意 YouTube 視頻
2. 點擊瀏覽器工具列上的擴充功能圖標
3. 設定計時器時長和 BPM
4. 點擊「開始」啟動計時器
5. 計時器將顯示在 YouTube 頁面右上角

### 控制選項

- **計時器時長**：設定 1-3600 秒的訓練時間
- **BPM 設定**：調整節拍速度（60-360 BPM）
- **音效類型**：選擇合成嗶聲、真實響板或小鼓音效
- **拍號**：選擇 2/4、3/4 或 4/4 拍號
- **面板透明度**：調整覆蓋層的透明度（0-100%）
- **自動啟動**：啟用後，視頻播放時自動啟動計時器，暫停時自動暫停
- **顯示/隱藏**：可從 popup 或頁面上的按鈕控制覆蓋層顯示

## 自動跟隨播放邏輯 / Auto-Follow Playback Logic

### 功能概述

啟用「自動啟動」功能後，計時器會智能跟隨 YouTube 影片的播放狀態：
- 影片播放 → 計時器自動啟動或恢復
- 影片暫停 → 計時器自動暫停
- 切換新影片 → 計時器從剩餘時間重新開始

### 三種場景說明

#### 場景 1：同一影片暫停
**觸發條件：** 暫停當前播放的影片

**計時器行為：**
- ✅ 自動暫停計時器
- ✅ 停止 BPM 音效
- ✅ Popup 顯示「暫停」狀態
- ✅ 保持剩餘時間不變

**用戶體驗：** 暫停影片後，計時器同步暫停，剩餘時間凍結

---

#### 場景 2：同一影片恢復
**觸發條件：** 恢復播放被暫停的影片

**計時器行為：**
- ✅ 自動恢復計時器
- ✅ 繼續播放 BPM 音效
- ✅ Popup 顯示「運行中」狀態
- ✅ 從暫停時的剩餘時間繼續倒數

**用戶體驗：** 恢復影片後，計時器從暫停處無縫繼續

---

#### 場景 3：新影片播放
**觸發條件：** 播放不同的 YouTube 影片

**計時器行為：**
- ✅ 保持當前剩餘時間
- ✅ 重置節拍調度（重新計算節奏起點）
- ✅ 從剩餘時間重新啟動計時器
- ✅ Popup 顯示「運行中」狀態

**用戶體驗：** 切換新影片時，計時器不會重置到預設時長，而是保持當前進度重新開始

**範例：**
- 預設時長：600 秒
- 影片 A 播放到剩餘 400 秒 → 切換到影片 B
- 結果：計時器從 400 秒重新開始倒數

---

### 影片識別機制

**技術實現：** 透過解析 YouTube URL 的影片 ID 判斷是否為新影片

```
YouTube URL 格式：https://www.youtube.com/watch?v=VIDEO_ID
正則表達式：/[?&]v=([^&]+)/

範例：
- 影片 A：https://www.youtube.com/watch?v=abc123 → ID: "abc123"
- 影片 B：https://www.youtube.com/watch?v=xyz789 → ID: "xyz789"

判斷邏輯：
- 當前影片 ID ≠ 上次啟動的影片 ID → 新影片
- 當前影片 ID = 上次啟動的影片 ID → 同一影片
```

**容錯設計：**
- 如果 URL 解析失敗（無法獲取影片 ID），視為新影片
- 不會因為解析失敗而阻止計時器啟動

---

### 多標籤頁衝突保護 (Tab Ownership Model)

#### 為什麼需要？
防止多個 YouTube 標籤頁同時播放影片時，BPM 音效重疊播放。

#### 工作原理

**所有權規則：**
1. **獲取所有權**：首次啟動計時器（手動或自動）的標籤頁成為擁有者
2. **保持所有權**：計時器運行期間，所有權不會轉移
3. **釋放所有權**：停止計時器時釋放所有權
4. **孤立狀態**：擁有者標籤頁關閉後，計時器變為孤立狀態（繼續運行但不響應影片事件）

**衝突處理：**

| 場景 | 行為 |
|------|------|
| 標籤頁 A 手動啟動計時器 → 標籤頁 B 嘗試手動啟動 | ❌ 拒絕，顯示錯誤：「計時器已在其他分頁運行中」 |
| 標籤頁 A 自動啟動計時器 → 標籤頁 B 播放影片 | ⚠️ 靜默忽略，標籤頁 B 的影片事件不影響計時器 |
| 標籤頁 A 擁有計時器 → 標籤頁 B 暫停影片 | ⚠️ 靜默忽略，只有標籤頁 A 能控制計時器 |
| 標籤頁 A 擁有計時器 → 關閉標籤頁 A | ⚠️ 計時器變為孤立狀態，繼續運行但不響應任何影片事件 |

**技術細節：**
- 使用 `chrome.runtime.sendMessage` 的 `sender.tab.id` 識別消息來源
- `activeTabId` 不持久化到 storage（標籤頁 ID 在瀏覽器重啟後失效）
- 孤立計時器可透過 Popup 手動控制（暫停/停止）

---

### 決策流程圖

#### VIDEO_PLAY 事件處理流程

```
收到 VIDEO_PLAY 消息（包含 videoId）
    │
    ├─ 自動跟隨已啟用？
    │  ├─ 否 → 忽略事件，返回成功
    │  └─ 是 ↓
    │
    ├─ videoId ≠ lastAutoStartVideoId？（新影片檢測）
    │  │
    │  ├─ 是 →【場景 1：新影片播放】
    │  │      ├─ 更新 currentVideoId 和 lastAutoStartVideoId
    │  │      ├─ 計時器運行中？
    │  │      │  ├─ 是 → 保持 remainingSeconds，重置節拍調度，重啟計時器
    │  │      │  └─ 否 → 從 defaultDuration 啟動新計時器
    │  │      └─ 廣播狀態更新
    │  │
    │  └─ 否 →（同一影片）
    │         ├─ 計時器運行中 && 已暫停？
    │         │  ├─ 是 →【場景 2：同一影片恢復】
    │         │  │       ├─ runTimer() 恢復計時
    │         │  │       └─ 廣播狀態更新
    │         │  └─ 否 ↓
    │         │
    │         └─ 計時器未運行？
    │            ├─ 是 →【場景 3：自動啟動】
    │            │       ├─ 從 defaultDuration 啟動計時器
    │            │       └─ 廣播狀態更新
    │            └─ 否 → 忽略（計時器運行中且未暫停）
```

#### VIDEO_PAUSE 事件處理流程

```
收到 VIDEO_PAUSE 消息
    │
    ├─ 自動跟隨已啟用？
    │  ├─ 否 → 忽略事件
    │  └─ 是 ↓
    │
    └─ 計時器運行中 && 未暫停？
       ├─ 是 →【暫停計時器】
       │       ├─ 清除計時器 interval
       │       ├─ isPaused = true
       │       └─ 廣播狀態更新
       └─ 否 → 忽略（計時器已暫停或未運行）
```

---

### 使用建議

1. **訓練場景**：在跟隨 YouTube 訓練影片時啟用自動跟隨
   - 影片暫停講解 → 計時器同步暫停
   - 恢復訓練 → 計時器自動繼續
   - 切換不同訓練影片 → 計時器保持進度重新開始

2. **自由訓練**：不跟隨影片時關閉自動跟隨
   - 手動控制計時器開始/暫停/停止
   - 影片播放狀態不影響計時器

3. **多標籤頁使用**：
   - 一次只在一個標籤頁使用計時器
   - 如需在不同標籤頁使用，先停止當前計時器再啟動新的

## 技術架構 / Technical Architecture

- **Manifest V3**：使用最新的 Chrome 擴充標準
- **Offscreen Document API**：後台音頻播放
- **Web Audio API**：合成節拍音效
- **Chrome Storage API**：本地設置持久化

## 限制與注意事項 / Limitations & Notes

### 系統需求 / System Requirements
- Chrome/Edge 瀏覽器版本 109+ (需支援 Offscreen Document API)
- 僅在 YouTube 網站 (https://www.youtube.com/*) 上運作
- 需要 Web Audio API 支援

### 功能限制 / Feature Limitations
- 覆蓋層位置固定在右上角（無法拖曳）
- 計時器面板透明度範圍：0-100
- BPM 範圍限制：60-360
- 自動追隨視頻播放功能需手動啟用（預設關閉）

### 資源管理 / Resource Management
- 設定保存採用 5 秒批次寫入，優化存儲性能
- 暫停超過 30 秒後自動關閉音頻文檔以節省資源
- 音頻緩存限制為 10 項，採用先進先出策略

### 已知問題 / Known Issues
- 電腦休眠/睡眠後可能短暫音頻不同步（會自動恢復）
- YouTube SPA 導航在極少數情況下可能需要刷新頁面
- 自訂時長輸入無最大值限制（為靈活性考量）

## 開發 / Development

### 項目結構
```
/
├── manifest.json          # 擴充配置
├── popup.html/js          # 控制面板
├── content-script.js      # YouTube 頁面注入
├── background.js          # Service Worker
├── offscreen.html/js      # 音頻播放
├── styles.css             # 樣式
└── sounds/                # 音效資源
    ├── castanets.wav      # 響板音效
    └── snaredrum.mp3      # 小鼓音效
```

### 本地開發
1. 修改代碼
2. 前往 `chrome://extensions/` 點擊「重新載入」
3. 刷新 YouTube 頁面測試

### 技術特點
- 使用 Offscreen Document 確保背景音頻在 Service Worker 中正常播放
- Web Audio API 實時合成嗶聲，無需外部音頻文件
- 支持強拍、次強拍、弱拍的音量和音調區分
- 100ms 精度的計時器邏輯

## 許可證 / License

MIT License - 詳見 [LICENSE](LICENSE) 文件

## 隱私政策 / Privacy Policy

本擴充功能不收集任何個人數據，所有設置僅保存在您的本地設備上。詳見 [PRIVACY_POLICY.md](PRIVACY_POLICY.md)

## 貢獻 / Contributing

歡迎提交 Issue 和 Pull Request！

## 致謝 / Acknowledgments

感謝所有超慢跑愛好者的支持！
