# SBALT · 運動社交揪團 App

## 專案現況一句話
以「揪團管理 + 社群」為核心，已延伸出跑步追蹤 / 賽事 / 場地 / 推廣 / 成就等模組的 Expo App。
Solo 開發、AI 代寫 code、目前在 MVP 驗證階段。

## 目標用戶

**核心 TA**：全台灣 25-45 歲、會固定揪朋友打球的業餘運動愛好者（籃球/排球/羽球/跑步）。
典型情境：竹科/內科/南軟工程師下班揪球、週末固定場、從 LINE 群揪團流程遷入。

產品對所有運動愛好者開放（誰都可下載使用），但**設計決策、功能取捨、UX 判斷以核心 TA 為準**，不為邊緣用戶妥協。

### 這對產品決策代表什麼
- 願意為「省麻煩」付費（算分、簽到、收費對帳）
- 不吃過度 gamification（連續登入、勳章堆這類年輕向設計）
- LINE 群是真實替代品，切換成本是門檻
- 每週運動 1-3 次，**不是每天打開 App** 的頻率

## 商業定位

Phase 1（MVP）管理工具獲客 → Phase 2 品牌商場 → Phase 3 AI 數據分析。

**注意**：這是商業敘事，**不是嚴格的開發優先序**。目前已跨 Phase 開發（venue 預約、tournament、promotion 都早於嚴格 Phase 2）。
功能決策用「目標用戶 + 護城河」判斷，不要死套 Phase。

## 真正的護城河（不是功能清單）

只有兩件：
1. **揪團管理核心**（建立/報名/簽到/計分/結算）
2. **社群鎖定**（戰績、球友網、群組、**在地排行榜 / 球場王**）

其他（跑步追蹤、推廣、場地、賽事）是**支援角色**，不該當成投入重心。

## 排行榜與資料誠信

排行榜（含「在地球王」頭銜）是「社群鎖定」護城河的展示形式，也是 Phase 1 的行銷素材槓桿。但要等資料密度才做（用戶 < 30 不做），**過早做 = 空榜 = 反效果**。

### 資料源誠信原則（哪些資料能上榜）
- **打卡（手動自填）**：不上榜，僅做個人紀錄 / 分享卡 / 球友關係源
- **正式賽事 sport_stats**（記錄員見證）：球類排行榜主來源
- **HealthKit / Strava / 設備記錄**：跑步排行榜主來源（GPS + 感應器難造假）

打卡資料**永不進排行榜**，避免灌水毀榜。

## 跑步策略：寄生匯入，不自建追蹤

不跟 Strava 競爭跑步追蹤（zero-sum 死戰）。透過 **HealthKit (iOS) + Health Connect (Android)** 匯入用戶在 Apple Watch / Nike Run / Strava / 內建活動 紀錄的資料，作為 SBALT 跑步戰績與排行榜來源。Strava API 為次要來源（補軌跡）。

**跑步打卡手填動線已廢棄**——資料來自設備同步，不靠用戶手填。打卡頁的運動類型選項已不含跑步。

## 技術棧

- Expo SDK 54 + React Native 0.81 + React 19 + TypeScript
- expo-router（file-based, Stack + Tabs）
- Supabase（Auth + Postgres + Storage）
- Zustand + AsyncStorage（主題、通知、全域 selectedSport）
- Mapbox（跑步追蹤、地點搜尋）
- 關鍵 native：expo-location、expo-speech、expo-notifications、expo-calendar、expo-apple-authentication、react-native-view-shot、react-native-qrcode-svg

## 資料模型

### 實際使用中（新程式碼用這些）
- **活動**：`events`, `registrations`, `event_scores`, `player_stats`
- **使用者/社群**：`profiles`, `groups`, `group_members`, `group_posts`
- **賽事**：`tournaments`, `tournament_teams`, `tournament_team_members`, `tournament_registrations`
- **場地**：`venues`, `venue_bookings`
- **其他**：`promotions`, `runs`, `achievements`, `user_achievements`, `notifications`, `comments`, `likes`, `reports`, `blocks`

Schema 欄位細節：看 `types/database.ts`（source of truth），不在這裡重複記錄。

### 凍結的舊 tables（不要碰）
`teams`, `players`, `games`, `news`
- 保留、**勿寫入、勿改 schema、新 migration 勿 reference**
- 裡面可能還有歷史資料，清理決策留給人類

### Storage Buckets
`avatars`, `event-images`, `promotion-images`
- **RLS 政策要在 Supabase Dashboard UI 設定，寫 SQL 常不生效**

## 專案結構

```
app/                    頁面（expo-router）
  (tabs)/               底部 Tab：index/scores/center/calendar/discover，profile/settings 隱藏
  event/                活動 CRUD + 簽到 + 計分 + 成就
  sport/                跑步追蹤 + 路線規劃 + 戰術板
  group/ tournament/ venue/ promotion/ user/  各領域 CRUD
components/             可重用元件
services/               DB 和業務邏輯（20+ 模組，檔名直接對應領域）
constants/theme.ts      Design system（Colors/Shadows/Spacing/Radius）
constants/sports.ts     運動類型定義
lib/supabase.ts         Supabase client
lib/mapbox.ts           Mapbox token + client
store/useAppStore.ts    Zustand（theme, selectedSport 全域運動過濾器）
types/database.ts       Supabase 型別（source of truth）
```

Services 職責細節：直接看 `services/*.ts`，不在這裡列清單。

## 開發環境

### 指令
```bash
npm install                  # 依賴
npx expo start               # 開發
npx expo run:ios             # iOS build（native module 變更後）
npx expo run:android         # Android build
npm run lint                 # Expo lint
```
**沒有 test script**（目前無自動化測試基線）。

### 環境變數
- Supabase URL / anon key 寫在 `app.json` 的 `extra` 區塊（anon key 公開合法）
- Mapbox token 用 `EXPO_PUBLIC_MAPBOX_TOKEN`
- 讀取統一走：`Constants.expoConfig?.extra?.X || process.env.EXPO_PUBLIC_X`

### Database Migration
**沒有 repo 內的 migration folder**，schema 變更在 Supabase Dashboard 執行。
AI 產 SQL 時：
- 直接給人類可貼到 Dashboard 的完整 SQL
- **不要建議** `supabase db push` / CLI 流程（未建置）

## 運動類型全域過濾

底部中央 S 按鈕 → modal 選運動 → 存 `useAppStore.selectedSport`。
值：`'all' | 'basketball' | 'volleyball' | 'badminton' | 'running'`

**不是每個頁面都該過濾**。會讀的頁面：首頁、發現、數據、某些列表頁。
會衝突的頁面：跑步追蹤進行中、活動建立中、各 CRUD 表單。
新頁面是否跟隨 selectedSport：**明確判斷是否合理**，不要機械套用。

## 工作方式

### 溝通
- 繁體中文
- 不輸出廢話
- 不確定就問，**不要猜**
- 修改前先說「要改什麼 + 為什麼」

### 對使用者決策的態度
**不預設同意。** 使用者提出想法或功能時，責任是：
- 用紅隊視角質疑（必要性 / UX / 實作正確性 三軸）
- 挑戰模糊假設（「大家會喜歡」「有了比較好」不算答案）
- 提出替代方案，不是照單全收

使用者偏好被挑戰，不喜歡奉承式回答。

### 方向漂移偵測
當使用者的發言和本 CLAUDE.md 的核心方向不一致時（例如目標用戶、護城河、戰績路線、UI 原則、凍結舊 tables）：
- **停下來**指出差異
- 確認是有意識改變方向，還是一次性例外
- 若是改變方向：先討論共識 → 再修改 CLAUDE.md → 再繼續
- 若是例外：在當前任務處理，不動 CLAUDE.md

### 功能評估三軸
任何「要不要做 X」的決策先問：
1. 對使用者是不是必須？
2. 使用者體驗夠不夠好？
3. 實作方向對不對？

三軸任一不過關就不該做。**工時不是考量點**（AI 代寫）。

### 品質優先於時間（強制原則）
**所有開發決策都忽略時間成本，以最高品質、最優解為優先。**

- 看到「快速做 vs 正確做」的取捨時，**永遠選正確做**
- 不要因為「省 1 小時」推用戶選 quick fix；該做的架構就做
- 提案時不要用「這要 X 小時，要不要折衷」當主要 framing
- 「撇除時間成本最佳做法是什麼」永遠是先問的問題
- 例外：當改動會破壞 production 資料 / 跨 phase 大重構時，仍要先確認

這條牴觸「不為未來擴充過度設計」時：以**目前已知的明確需求**為界，但實作該需求要做到最好；**不要為了想像中的未來需求**過度抽象。

### 開發模式
- Solo + AI 代寫：瓶頸是產品定位紀律，不是寫 code 速度
- 不為未來擴充過度設計
- bug fix 不順便重構、不順手加功能

### UI / 文字
- 分享文字 / UI 文案**不加 emoji**（使用者認為看起來廉價）
- 大字號用原生 `Text`，**不用 `ThemedText`**（字體裁切問題）
- 顏色 / 間距 / 圓角從 `constants/theme.ts` 取，不硬寫

## 安全底線

- 未經確認不刪除任何檔案
- 覆蓋既有檔案前先確認
- 不 commit 真正的 secret（Supabase anon key 可公開）
- 破壞性動作（rm、git reset --hard、DB DROP）一律先問

## 踩過的坑

- **ThemedText 大字號被裁切** → 大字改用原生 Text
- **Supabase Storage RLS SQL 有時不生效** → 在 Dashboard UI 設
- **模擬器 Info.plist cache** → 改權限後要刪 App 重裝

## 語言

繁體中文。
