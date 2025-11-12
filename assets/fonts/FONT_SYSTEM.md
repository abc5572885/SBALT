# Font System Documentation

## 架構設計

本應用的字體系統採用分層架構，確保清晰、可維護和可擴展：

```
constants/fonts.ts          # 字體配置核心（字體名稱、粗細映射）
  ↓
components/themed-text.tsx # 字體應用邏輯（自動選擇中英文字體）
  ↓
app/_layout.tsx            # 字體載入（expo-font）
```

## 核心概念

### 1. 字體配置 (`constants/fonts.ts`)

這是字體系統的核心，定義了：
- **FontFamily**: 所有字體家族的名稱（必須與 `_layout.tsx` 中註冊的名稱一致）
- **FontWeight**: 字體粗細的語義化常數
- **Typography**: 不同文字類型的字體配置映射
- **getTypographyConfig**: 根據文字類型和語言返回正確的字體配置

### 2. 字體應用 (`components/themed-text.tsx`)

`ThemedText` 組件負責：
- 自動檢測文字語言（中文/英文）
- 根據 `type` prop 選擇合適的字體配置
- 確保字體設定不會被外部樣式覆蓋

### 3. 字體載入 (`app/_layout.tsx`)

使用 `expo-font` 載入字體檔案，字體名稱必須與 `constants/fonts.ts` 中的定義一致。

## 字體粗細設定

目前所有文字類型都使用以下粗細：

- **default**: Medium (500) - 比 Regular 更粗，提升可讀性
- **link**: Medium (500)
- **defaultSemiBold**: SemiBold (600)
- **title/subtitle**: Bold (700)

## Variable Font vs Fixed Weight Fonts

### 當前狀態

目前使用 Variable Font (`SourceHanSerifTC-VF.ttf`) 作為臨時方案，因為：
- React Native 對 Variable Font 的支援有限
- `fontWeight` 可能無法正確應用

### 理想狀態

應該使用固定粗細的字體檔案：
- `SourceHanSerif-Regular.otf` (weight 400)
- `SourceHanSerif-Medium.otf` (weight 500)
- `SourceHanSerif-Bold.otf` (weight 700)

### 如何取得固定粗細字體

1. 前往 [Adobe Fonts](https://fonts.adobe.com/fonts/source-han-serif) 或 [GitHub](https://github.com/adobe-fonts/source-han-serif)
2. 下載所需的固定粗細字體檔案（.otf 格式）
3. 將檔案放置在 `assets/fonts/` 目錄
4. 更新 `app/_layout.tsx` 中的字體載入配置

## 使用範例

```tsx
// 基本使用
<ThemedText>Hello World</ThemedText>  // 英文，使用 Inter Medium
<ThemedText>你好世界</ThemedText>      // 中文，使用思源宋體 Medium

// 指定類型
<ThemedText type="title">標題</ThemedText>        // Bold (700)
<ThemedText type="subtitle">副標題</ThemedText>  // Bold (700)
<ThemedText type="defaultSemiBold">半粗體</ThemedText> // SemiBold (600)
<ThemedText type="link">連結</ThemedText>        // Medium (500)
```

## 擴展性

要新增新的文字類型或字體：

1. 在 `constants/fonts.ts` 的 `Typography` 中新增配置
2. 在 `ThemedTextProps` 的 `type` 中新增選項
3. 在 `getTypographyConfig` 中處理新類型
4. 在 `ThemedText` 組件的樣式中新增對應樣式

## 注意事項

1. **字體名稱一致性**: `constants/fonts.ts` 中的字體名稱必須與 `app/_layout.tsx` 中註冊的名稱完全一致
2. **樣式覆蓋**: `ThemedText` 會自動移除外部樣式中的 `fontFamily` 和 `fontWeight`，確保字體配置始終生效
3. **Variable Font 限制**: 如果使用 Variable Font，`fontWeight` 可能無法正確應用，建議改用固定粗細字體檔案

