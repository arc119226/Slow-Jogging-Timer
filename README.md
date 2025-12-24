# 超慢跑計時器 / Slow Jogging Timer

> 為 YouTube 超慢跑訓練視頻提供 BPM 節拍計時器的 Chrome 擴充功能

## 功能特色 / Features

- 可自訂時長的計時器（1-3600秒）
- BPM 節拍音效（60-360 BPM）
- 拍號支持（2/4、3/4、4/4）
- 雙音效系統（合成嗶聲 + 真實響板）
- 可調整面板透明度
- YouTube 頁面覆蓋層顯示
- 設置自動保存

## 安裝 / Installation

### 從 Chrome Web Store 安裝（推薦）
即將上架，敬請期待！

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
- **音效類型**：選擇合成嗶聲或真實響板音效
- **拍號**：選擇 2/4、3/4 或 4/4 拍號
- **面板透明度**：調整覆蓋層的透明度（0-100%）
- **顯示/隱藏**：可從 popup 或頁面上的按鈕控制覆蓋層顯示

## 技術架構 / Technical Architecture

- **Manifest V3**：使用最新的 Chrome 擴充標準
- **Offscreen Document API**：後台音頻播放
- **Web Audio API**：合成節拍音效
- **Chrome Storage API**：本地設置持久化

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
    └── castanets.wav      # 響板音效
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
