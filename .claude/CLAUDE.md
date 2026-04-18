# SBALT · 運動社交揪團 App

## 專案概覽

SBALT 是一個針對業餘運動社群（籃球、排球、羽球、跑步）的揪團管理 App。
核心功能：活動建立/報名/管理、計分板、QR 簽到、分享邀請。

目標用戶：竹北/新竹科技社群的運動愛好者。
商業定位：Phase 1 (MVP) 管理工具獲客 → Phase 2 AI 數據分析 → Phase 3 品牌商場。

## 技術棧

- **框架**：Expo SDK 54 + React Native 0.81 + React 19
- **路由**：expo-router (file-based routing, Stack + Tabs)
- **後端**：Supabase (Auth + PostgreSQL + Storage)
- **狀態管理**：Zustand (persist with AsyncStorage)
- **語言**：TypeScript
- **Design System**：constants/theme.ts (Colors, Shadows, Spacing, Radius)

## 資料模型 (Supabase Tables)

| Table | 用途 |
|-------|------|
| `events` | 活動 (含 sport_type, 週期性重複) |
| `registrations` | 報名 (registered/cancelled/waitlisted + 付款狀態) |
| `event_scores` | 活動比分紀錄 |
| `comments` | 留言 (polymorphic: event/game/team/player/news) |
| `likes` | 按讚 |
| `teams` | 球隊（未使用） |
| `players` | 球員（未使用） |
| `games` | 賽事（未使用，職業賽事已移除） |
| `news` | 新聞（未使用） |

Storage: `avatars` bucket 存使用者頭像。

## 專案結構

```
SBALT/
├── app/
│   ├── _layout.tsx          ← Root Stack (tabs + event + login + open)
│   ├── (tabs)/              ← 底部 Tab 導覽 (需登入)
│   │   ├── index.tsx        ← 首頁（活動列表）
│   │   ├── scores.tsx       ← 活動 Tab（篩選瀏覽）
│   │   ├── calendar.tsx     ← 日曆（日期選活動）
│   │   ├── profile.tsx      ← 個人檔案（統計、頭像）
│   │   └── settings.tsx     ← 設定
│   ├── event/               ← Event Stack（獨立導航）
│   │   ├── _layout.tsx      ← Stack navigator
│   │   ├── new.tsx          ← 建立活動
│   │   ├── [id].tsx         ← 編輯活動
│   │   ├── detail.tsx       ← 活動詳情/報名
│   │   ├── my-events.tsx    ← 我建立的活動
│   │   ├── joined.tsx       ← 我報名的活動
│   │   ├── registrations.tsx ← 報名管理
│   │   ├── scores.tsx       ← 全螢幕計分板
│   │   ├── checkin.tsx      ← QR Code 簽到
│   │   └── history.tsx      ← 歷史戰績
│   ├── login.tsx            ← 登入頁
│   └── open.tsx             ← Deep Link redirect
├── components/              ← UI 元件
├── constants/
│   ├── theme.ts             ← Colors, Shadows, Spacing, Radius
│   ├── fonts.ts             ← Typography system
│   └── sports.ts            ← 運動類型設定 (basketball/volleyball/badminton/running)
├── contexts/AuthContext.tsx  ← Auth state
├── hooks/                   ← useColorScheme (接 Zustand themeMode)
├── lib/supabase.ts          ← Supabase client
├── services/
│   ├── database.ts          ← 所有 DB 操作
│   ├── avatar.ts            ← 頭像上傳
│   └── notifications.ts     ← 推播通知
├── store/useAppStore.ts     ← Zustand (theme, notifications)
├── types/database.ts        ← TypeScript 型別
└── utils/                   ← dateFormat, rrule
```

## 常用指令

```bash
npm install                  # 安裝依賴
npx expo start               # 開發伺服器
npx expo run:ios             # iOS build（native module 變更後需要）
npx expo run:android         # Android build
```

## 工作方式

- 用繁體中文溝通
- 遇到不確定的地方直接問，不要猜
- 修改程式碼前，先說明「要改什麼」和「為什麼」
- 不輸出廢話，直接切入重點
- 不要加 emoji 到分享文字或 UI 中（使用者認為看起來廉價）
- 標題和大字用系統字體（Text），不用 ThemedText（避免字體裁切問題）

## 安全底線

- 未經確認不刪除任何檔案
- 覆蓋已有檔案前必須先確認
- `.env` 和 `app.json` 中的 credentials 不可 commit 敏感資料
- Supabase anon key 在 `app.json` extra 中（公開的，非 secret）

## 已知問題

- ThemedText 的字型處理會導致大字號被裁切，大字號改用原生 `Text`
- Supabase Storage 的 RLS 政策需在 Dashboard UI 設定（SQL 有時不生效）
- 模擬器的 Info.plist 有 cache，改權限後需要刪 App 重裝

## 語言

- 請用繁體中文和我溝通
