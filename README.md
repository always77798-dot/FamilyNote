# FamilyNote

FamilyNote 是給家人查看重要提醒的靜態網站。只要把 HTML 檔案放進 `pages/`，建置時就會自動成為網站子頁，`/main` 的管理首頁也會自動顯示連結。

- 網站根目錄 `/` 保持空白，避免分享單一子頁時順手回到分頁清單。
- 真正的管理首頁位於 `/main`。
- 建置時會為所有頁面加入 `noindex, nofollow, noarchive`，並且不再公開產生 `pages.json`。

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

`/main` 的卡片名稱會讀取 HTML 的 `<title>`。如要自訂卡片摘要，可在 HTML 的 `<head>` 加入：

```html
<meta name="family-note:summary" content="這裡放給家人看的簡短說明">
```

## 本機建置

```bash
npm run build
```

建置結果會放在 `dist/`；這個資料夾不需要提交到 GitHub。

## 隱私提醒

根頁空白與防搜尋引擎索引只能降低意外看見其他分頁的機會，並不是登入保護。知道或猜到 `/main`、子頁網址的人仍可開啟頁面；GitHub 儲存庫若為公開，也能直接看到原始 HTML。請勿放入身分證字號、病歷、密碼或其他不適合公開的資料。若要放敏感內容，應再加上密碼或登入驗證。
