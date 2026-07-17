# FamilyNote

FamilyNote 是給家人查看重要提醒的靜態網站。只要把 HTML 檔案放進 `pages/`，建置時就會自動成為網站子頁，首頁也會自動顯示連結。

## 新增一個家人專頁

1. 準備完整的 HTML 檔案，例如 `family-trip.html`。
2. 把檔案放進 `pages/`。
3. 提交到 GitHub 的 `main` 分支。
4. Vercel 建置完成後，網址就是 `/family-trip`。

檔名可以使用英文大小寫、數字、連字號與底線。網址會自動轉成小寫，底線也會自動轉成連字號，例如：

- `health-check.html` → `/health-check`
- `family-trip-2026.html` → `/family-trip-2026`
- `TRIP260721.html` → `/trip260721`
- `TRIP_260721.html` → `/trip-260721`

如果兩個檔名轉換後得到相同網址（例如 `TRIP_01.html` 與 `trip-01.html`），建置會停止並提示需要改名。

首頁卡片名稱會讀取 HTML 的 `<title>`。如要自訂卡片摘要，可在 HTML 的 `<head>` 加入：

```html
<meta name="family-note:summary" content="這裡放給家人看的簡短說明">
```

## 本機建置

```bash
npm run build
```

建置結果會放在 `dist/`；這個資料夾不需要提交到 GitHub。

## 隱私提醒

目前網站與 GitHub 儲存庫都是公開的。請勿放入身分證字號、病歷、密碼或其他不適合公開的資料。
