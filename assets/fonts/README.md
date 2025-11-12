# 字體檔案說明

## 需要的字體檔案

### Inter 字體（英文）
請將以下 Inter 字體檔案放在此目錄中：

1. **Inter-Regular.ttf** - 一般文字
2. **Inter-Bold.ttf** - 粗體
3. **Inter-SemiBold.ttf** - 半粗體
4. **Inter-Medium.ttf** - 中等粗細
5. **Inter-Light.ttf** - 細體

### 思源黑體（中文）
請將以下思源黑體字體檔案放在此目錄中：

1. **SourceHanSans-Regular.otf** - 一般文字
2. **SourceHanSans-Bold.otf** - 粗體
3. **SourceHanSans-Medium.otf** - 中等粗細

## 如何取得字體

### Inter 字體
- **官方網站**：https://rsms.me/inter/
- **GitHub**：https://github.com/rsms/inter
- **免費使用**：Inter 是開源字體，可免費使用

### 思源黑體（Source Han Sans）
- **官方網站**：https://source.typekit.com/source-han-sans/
- **GitHub**：https://github.com/adobe-fonts/source-han-sans
- **免費使用**：思源黑體是開源字體，可免費使用

## 檔案格式

- Inter：支援 `.ttf` 格式
- 思源黑體：支援 `.otf` 格式
- 檔案名稱必須完全符合上述名稱（大小寫敏感）

## 字體自動切換

應用程式會自動檢測文字內容：
- **英文文字** → 使用 Inter 字體
- **中文文字** → 使用思源黑體
- **混合文字** → 根據內容自動選擇合適的字體

## 暫時使用系統字體

如果還沒有字體檔案，應用程式會使用系統預設字體作為後備方案。

## 測試

加入字體檔案後，重新啟動應用程式即可看到：
- 英文文字使用 Inter 字體
- 中文文字使用思源黑體

