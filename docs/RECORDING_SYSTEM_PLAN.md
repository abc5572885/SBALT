# SBALT 戰績系統 Plan

> 本文件為戰績 / 打卡 / 球友網 / 記錄台 / 分享卡 整套系統的完整設計文件。
> 所有決策皆經過「紅隊質疑 + 方向漂移偵測」確認，實作階段以此為單一真實來源。
> 若實作時發現決策需調整，先更新本文件，再動手。

---

## 1. 系統定位

### 目的
服務「**業餘但打正式比賽**」的競技型使用者，建立可累積、可炫耀的生涯戰績資產。

### 對齊 CLAUDE.md 的護城河
對應「社群鎖定」這條護城河（戰績、球友網、群組）。不是要服務每個 SBALT 使用者，也不是 DAU 工具。

### 關鍵認知：戰績牆是少數人的資產，不是 DAU 工具
- 多數 SBALT 使用者打的是鬥牛/揪團，戰績牆會是空的或很淺
- 只有「會打正式比賽的少數人」會有豐富戰績
- 不要為了 DAU 加 gamification（連續登入、每日勳章）
- 衡量成功看「重度使用者留存」，不看 DAU lift

### 設計邊界
- **打卡 ≠ 正式戰績**：打卡是個人紀錄 + 發文用，**永不進生涯統計**
- **跑步 GPS 紀錄 = 正式戰績**（有客觀資料）
- **非揪團的個人運動 / 鬥牛練球** → 打卡，不進戰績

---

## 2. 核心決策（17 項）

| # | 類別 | 決定 | 理由 |
|---|---|---|---|
| 1 | 戰績路線 | 路線 A：只有正式比賽進生涯；打卡不進 | 保護戰績可信度 |
| 2 | 跑步戰績 | GPS 紀錄自動算正式 | 有客觀資料、無需見證 |
| 3 | 打卡 vs 正式 | 兩張表分開（check_ins / 各 sport_stats）| 結構性隔離，避免污染 |
| 4 | 細欄位儲存 | 方案 1：每運動一張表 | 型別保護、查詢效能、solo dev 友善 |
| 5 | 欄位完整度 | 正式比賽全欄位記錄 | 業內標準、使用者會看 |
| 6 | 跑步社交層 | C 方案：runs.event_id + run_participants | 揪團自動關聯 + 手動標記 |
| 7 | 標記隱私 | profiles.tagging_privacy（預設 approval_required）| 保守預設 |
| 8 | 球友網主幹 | 靠 events 自動推導為主，手動標記為輔 | 隱私與資料密度雙贏 |
| 9 | 記錄台模式 | Pro + Solo 都做進 MVP | 使用者堅持 |
| 10 | UI 骨架 | 球員橫列上方 + 主次動作下方 + 最近紀錄可 undo | 跨運動通用 |
| 11 | 模式切換 | 記錄員自己切 | 靈活，主揪不需關心 |
| 12 | 陣容來源 | registrations 優先 + 臨時球員（臨時不進生涯）| 兼顧現場彈性 |
| 13 | 版面 | 直立底部 / 橫放側邊 | 橫放是記錄標準姿勢 |
| 14 | 按鈕文字 | 完整中文（「得分 +2」「籃板」）| 新人好懂、按鈕大 |
| 15 | Solo 次動作 | A+B 混合：預設值 + 記錄員可改 | 彈性 + 初次友好 |
| 16 | 對帳機制 | 只有「球員看自己紀錄」，App 不介入紛爭 | 避免濫用，場地方處理 |
| 17 | 歷史資料 | 方案 C：砍舊 player_stats 重來 | 無種子使用者，可直接清 |
| 18 | 跑步資料源 | HealthKit / Health Connect 寄生匯入為主，Strava API 次要 | 不跟 Strava 紅海競爭，覆蓋廣、授權門檻低 |
| 19 | 跑步打卡手填 | 廢棄（從打卡 UI 移除）| 手填品質差，靠設備同步取代 |
| 20 | 排行榜資料源 | 只取 sport_stats（球類正式）+ 設備記錄（跑步）；打卡永不上榜 | 防灌水保誠信 |
| 21 | 排行榜時序 | 用戶 < 30 不做、30-100 做跑步榜、> 100 做球類榜 | 過早做 = 空榜 = 反效果 |
| 22 | 球場分層 | 球場 × 時段 / 月份分層（多王並存）| 避免「永遠贏不過一個王」勸退 |

---

## 3. 資料模型

### 3.1 凍結與廢棄
- `player_stats`（舊）**砍掉**。schema 太薄（只有 points），不足以支撐完整戰績
- `event_scores` **保留**。它是「整場比分」的正確抽象，新架構繼續用

### 3.2 新增表
- `basketball_stats` / `volleyball_stats` / `badminton_stats`
- `check_ins`
- `run_participants`

### 3.3 既有表變更
- `profiles` 新增 `tagging_privacy` 欄位
- `runs` 新增 `event_id` 欄位（可選 FK 到 events）

### 3.4 完整 SQL

#### 籃球統計
```sql
CREATE TABLE basketball_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  team_label TEXT NOT NULL,
  display_name TEXT,         -- 臨時球員（user_id=null 時必填）
  jersey_number TEXT,
  
  -- 統計欄位
  points_1pt INT NOT NULL DEFAULT 0,
  points_2pt INT NOT NULL DEFAULT 0,
  points_3pt INT NOT NULL DEFAULT 0,
  rebounds INT NOT NULL DEFAULT 0,
  assists INT NOT NULL DEFAULT 0,
  steals INT NOT NULL DEFAULT 0,
  blocks INT NOT NULL DEFAULT 0,
  turnovers INT NOT NULL DEFAULT 0,
  fouls INT NOT NULL DEFAULT 0,
  
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT user_or_display CHECK (user_id IS NOT NULL OR display_name IS NOT NULL)
);
CREATE INDEX idx_bballstats_event ON basketball_stats(event_id);
CREATE INDEX idx_bballstats_user ON basketball_stats(user_id) WHERE user_id IS NOT NULL;
```

#### 排球統計
```sql
CREATE TABLE volleyball_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  team_label TEXT NOT NULL,
  display_name TEXT,
  jersey_number TEXT,
  position TEXT,             -- 主攻 / 副攻 / 舉球 / 自由 / 接應
  
  spikes INT NOT NULL DEFAULT 0,         -- 扣殺得分
  blocks INT NOT NULL DEFAULT 0,         -- 攔網
  serve_aces INT NOT NULL DEFAULT 0,     -- 發球得分
  set_assists INT NOT NULL DEFAULT 0,    -- 舉球助攻
  digs INT NOT NULL DEFAULT 0,           -- 救球
  errors INT NOT NULL DEFAULT 0,         -- 失誤
  points_total INT NOT NULL DEFAULT 0,   -- 個人總得分（冗餘，利查詢）
  
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT user_or_display CHECK (user_id IS NOT NULL OR display_name IS NOT NULL)
);
CREATE INDEX idx_vballstats_event ON volleyball_stats(event_id);
CREATE INDEX idx_vballstats_user ON volleyball_stats(user_id) WHERE user_id IS NOT NULL;
```

#### 羽球統計
```sql
CREATE TABLE badminton_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  team_label TEXT NOT NULL,
  display_name TEXT,
  jersey_number TEXT,
  match_format TEXT NOT NULL CHECK (match_format IN ('singles', 'doubles')),
  partner_id UUID REFERENCES profiles(id),   -- 雙打搭檔（單打為 null）
  
  sets_won INT NOT NULL DEFAULT 0,
  sets_lost INT NOT NULL DEFAULT 0,
  smashes INT NOT NULL DEFAULT 0,        -- 殺球得分
  drops INT NOT NULL DEFAULT 0,          -- 切球得分
  net_kills INT NOT NULL DEFAULT 0,      -- 網前撲球
  errors INT NOT NULL DEFAULT 0,         -- 失誤
  points_won INT NOT NULL DEFAULT 0,
  points_lost INT NOT NULL DEFAULT 0,
  
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT user_or_display CHECK (user_id IS NOT NULL OR display_name IS NOT NULL)
);
CREATE INDEX idx_bminstats_event ON badminton_stats(event_id);
CREATE INDEX idx_bminstats_user ON badminton_stats(user_id) WHERE user_id IS NOT NULL;
```

#### 打卡
```sql
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sport_type TEXT NOT NULL,
  played_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  stats JSONB,                -- 自由格式：{points:18, three_pt:3, rebounds:4, ...}
  partners JSONB,             -- [{user_id, status: 'accepted'|'pending'|'rejected'}]
  notes TEXT,
  photo_url TEXT,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,  -- 揪團打卡才有
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_checkins_user ON check_ins(user_id);
CREATE INDEX idx_checkins_played_at ON check_ins(played_at DESC);
```

**注意**：check_ins 用 JSONB 不是因為我收回方案 1 的推薦，而是因為打卡本來就不進生涯、不 aggregate 重度 query、彈性 > 型別保護。正式戰績三張表仍是固定欄位。

#### 跑步社交層
```sql
ALTER TABLE runs ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE SET NULL;
CREATE INDEX idx_runs_event ON runs(event_id) WHERE event_id IS NOT NULL;

CREATE TABLE run_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK (relationship IN ('tagged', 'from_event')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(run_id, user_id)
);
CREATE INDEX idx_runparticipants_user ON run_participants(user_id);
CREATE INDEX idx_runparticipants_run ON run_participants(run_id);
```

#### 標記隱私
```sql
ALTER TABLE profiles ADD COLUMN tagging_privacy TEXT NOT NULL
  DEFAULT 'approval_required'
  CHECK (tagging_privacy IN ('public', 'approval_required'));
```

#### RLS 政策草稿
（細節在 Supabase Dashboard 設定。以下為策略方向。）

**各 sport_stats 三張表**
- SELECT：authenticated 可讀（戰績公開）
- INSERT / UPDATE：活動組織者（events.owner_id）+ 活動指定的記錄員
- DELETE：同上

**check_ins**
- SELECT：public 可讀（打卡是給人看的）
- INSERT / UPDATE / DELETE：僅本人

**run_participants**
- SELECT：run 的擁有者 + 被標記的 user_id
- INSERT：authenticated（搭配 tagging_privacy 在 app 層控制）
- UPDATE：被標記的 user_id 可改 status

**profiles.tagging_privacy**
- SELECT：public
- UPDATE：本人

---

## 4. UI 設計

### 4.1 記錄台

#### Pro 模式（直立）
```
┌─ 籃球記錄台 [Pro] ──────┐
│ Team A  45  ─  38 Team B │
│ Q3  剩 8:42              │
├──────────────────────────┤
│ [模式: Pro ▼]            │
├──────────────────────────┤
│ Team A 陣容（水平滑動）   │
│ [#5 小明 ●] [#8 阿華] [#23 大強] │
│ [#10 阿信] [#11 小黃]    │
│ ── 切到 Team B ──         │
├──────────────────────────┤
│ 主要動作（大按鈕）        │
│ [得分 +1] [得分 +2] [得分 +3]│
│ [籃板] [助攻]            │
├──────────────────────────┤
│ 次要動作（可折疊）▼      │
│ [抄截] [阻攻] [失誤] [犯規] │
├──────────────────────────┤
│ 最近紀錄（Tap = undo）    │
│ ← 12:34  小明 +2         │
│ ← 12:28  阿華 籃板        │
│ ← 12:15  小黃 助攻        │
└──────────────────────────┘
```

#### Solo 模式（直立）
```
┌─ 籃球記錄台 [Solo] ─────┐
│ Team A  45  ─  38 Team B │
├──────────────────────────┤
│ [模式: Solo ▼] [次動作: 犯規 ▼]│
├──────────────────────────┤
│ [#5 小明 ●] [#8 阿華]... │
├──────────────────────────┤
│ [得分+1] [得分+2] [得分+3]│
│ [犯規]                   │
│                          │
│ [+ 更多動作] (臨時展開)   │
├──────────────────────────┤
│ 最近紀錄                 │
└──────────────────────────┘
```

#### 橫放
- 球員陣列變成**左右兩側**
- 動作按鈕在**中間**
- 最近紀錄在**右側邊**

#### 進場前陣容設定
```
┌─ 設定陣容 ────────────┐
│ Team A                 │
│ 從報名者加入（registrations）│
│ ☑ #5 小明               │
│ ☑ #8 阿華               │
│ ☐ #11 小黃              │
│ + 臨時球員（非報名者）    │
│   姓名: [___] 號碼: [__]│
│ ─────────────         │
│ Team B                 │
│ ... (同上)              │
│                        │
│ [開始記錄]              │
└────────────────────────┘
```

#### 操作流程
1. Tap 球員 → 該球員選中（●）
2. Tap 動作 → 寫一筆，同時更新 event_scores 總分 + basketball_stats 個人統計
3. 同球員連續動作：不用重選
4. 換球員：再 tap 另一個球員
5. 錯了：tap 最近紀錄 = undo（恢復分數 + 刪除 stat row）

### 4.2 戰績牆（個人 Profile）

```
┌─ 個人檔案（自己）──────┐
│ 頭像  小明              │
│ [編輯]                  │
├─────────────────────────┤
│ [籃球] [跑步]           │  ← 沿用 S 按鈕運動切換
├─────────────────────────┤
│ ─ 籃球生涯戰績 ─         │
│ 場次 42  勝率 65%       │
│ MVP 3 次                │
│ 場均: 18.5 分 / 5.2 板 │
│       / 3.1 助          │
│ 總計: 775 分 / 218 板   │
│ 常打球友: 小華, 阿明...  │
│ 常去場館: 新竹運中       │
├─────────────────────────┤
│ ─ 最近活動 ─             │
│ [正式] 03/15 vs 鬥魂隊  │
│   小明 22 分 6 板 4 助  │
│ [打卡] 03/10 自辦鬥牛   │
│   小明 5 場 18 分       │
│ [正式] 03/01 vs 火箭    │
├─────────────────────────┤
│ [我的球友 ▷]             │
└─────────────────────────┘
```

#### 修 bug：自己看得到自己生涯
目前 `user/[id].tsx`（看別人）有生涯卡、`(tabs)/profile.tsx`（看自己）沒有。第 2 梯要把自己這邊補上，邏輯重用 `getUserCareerStats()`。

#### 統計卡依運動別動態渲染

| 運動 | 主要顯示欄位 |
|---|---|
| 籃球 | 場次、勝率、MVP、場均得分 / 籃板 / 助攻 |
| 排球 | 場次、勝率、扣殺、攔網、發球得分 |
| 羽球 | 場次、局勝率、殺球、切球 |
| 跑步 | 跑步次數、總距離、平均配速、常跑夥伴 |

### 4.3 打卡介面

```
┌─ 打卡 (籃球) ──────────┐
│ 日期 [今天]             │
│ 時間 [21:30]             │
│ 地點 [新竹國民運動中心]  │
│                         │
│ 場數   [5]  (必填)      │
│ 得分   [18] (必填)      │
│ ─ 細項（選填）─          │
│ 三分   [3]              │
│ 籃板   [4]              │
│ 助攻   [2]              │
│                         │
│ ─ 同伴標記 ─             │
│ + 從好友選擇            │
│ ✓ 小華                  │  ← tagging_privacy='public'
│ ⏳ 阿明（待確認）        │  ← tagging_privacy='approval_required'
│                         │
│ 心得 [今天手感不錯...]   │
│                         │
│ [預覽分享卡] [儲存]     │
└─────────────────────────┘
```

#### 同伴標記流程
```
Tap 同伴 → 讀該 user 的 tagging_privacy
├─ 'public' → 直接寫 partners=[{user_id, status:'accepted'}]
│             發通知告知（不需對方動作）
└─ 'approval_required' → 寫 partners=[{user_id, status:'pending'}]
                         發通知請對方確認
                         對方在通知中心可接受/拒絕
```

### 4.4 跑步社交層（HealthKit / Health Connect 寄生匯入策略）

#### 為什麼不自建追蹤
跑步追蹤是 Strava / Apple Watch / Nike Run 的紅海，自建 zero-sum 死戰沒勝算。SBALT 不跟它們競爭跑步**紀錄**，而是寄生在它們之上：用戶照常用熟悉工具跑，SBALT 透過設備整合匯入資料，作為戰績、球友網、排行榜的來源。

#### 資料源優先序
1. **HealthKit (iOS) + Health Connect (Android)** 主要來源
   - 覆蓋最廣：Apple Watch / 內建活動 / Nike Run / Strava 紀錄都會回流到這裡
   - 授權門檻低：系統權限對話框（一鍵）
   - 不含 GPS 軌跡（HKWorkoutRoute API 較進階，第二輪補）
   - 套件：`react-native-health` (iOS) + `react-native-health-connect` (Android)
2. **Strava API** 次要來源
   - 補完整 polyline 軌跡（給跑步分享卡 / 路線分析用）
   - OAuth 流程，門檻較高（要登入 Strava + 授權）
   - 只給有意願的進階用戶
3. **不再使用** SBALT 自建 Mapbox 追蹤作為主要 source（保留現有頁面但定位調整為「補充記錄」，非主動線）

#### 揪團跑完自動關聯
```
活動 scheduled_at ± 2 小時內，
若同一 event 多位參加者各自有 HealthKit workout 落在區間內
→ 自動寫 run_participants（含 distance / duration / pace）
```
不需用戶任何動作。需要的後端邏輯：
- HealthKit 同步任務每天執行（或 app foreground 時觸發）
- 同步後檢查 runs.played_at 是否落在某 event 時段內 → 自動關聯

#### 個人跑（非揪團）
直接同步進 `runs` 表，不寫 run_participants。
若想做球友關係，使用者可手動標記跑友（沿用打卡的 partner tagging 流程，含 tagging_privacy 控制）。

#### 跑步打卡手填表單已廢棄
原本「打卡選跑步 → 手填距離/時間」的 UI 不該存在。**跑步資料來自設備同步，不靠手填**——避免低品質資料污染戰績。打卡頁運動類型選項已移除「跑步」。

#### 跑友查詢（球友網子集）
```
─ 我的跑友 ─
1. Anna   10 次一起跑   上次 04/20
2. Bob    3 次一起跑    上次 03/15
...
```

### 4.5 分享卡

#### 正式戰績分享卡（有 SBALT 認證）
```
┌───────────────────────┐
│ ★ SBALT 認證戰績      │
│                       │
│ 小明                   │
│ 2025-03-15             │
│ 新竹甲組聯賽 R3        │
│ 鬥魂隊 vs 火箭隊        │
│                       │
│ 22 分 / 6 籃板 / 4 助攻│
│                       │
│ Team 85 - 72 Win       │
│                       │
│      from SBALT        │
└───────────────────────┘
```

#### 打卡分享卡（個人紀錄標示）
```
┌───────────────────────┐
│ 個人紀錄               │
│                       │
│ 小明 · 籃球            │
│ 2025-03-10 21:30       │
│ 新竹科學園區體育館      │
│                       │
│ 5 場 / 18 分           │
│ 三分: 3 / 籃板: 4      │
│                       │
│      from SBALT        │
└───────────────────────┘
```

關鍵視覺差異：
- 正式卡有 **★ SBALT 認證戰績** 標記
- 打卡卡標示 **個人紀錄**，無認證星號
- 使用者看卡片一眼能分辨

實作：用 `react-native-view-shot` 截圖分享，範本在 `components/shareCards/`。

### 4.6 在地球王排行榜系統

#### 定位
排行榜（含「在地球王」頭銜）是 CLAUDE.md「社群鎖定」護城河的具體展示，也是 Phase 1 的**行銷素材槓桿**。
但這**不是 DAU 工具**——對核心 TA「每週運動 1-3 次」是仰望/競爭目標，不是天天看的東西。

#### 上榜資料源（嚴守誠信原則）
| 資料來源 | 上榜? | 原因 |
|---|---|---|
| 打卡（手動自填） | ❌ | 可灌水，會毀榜 |
| sport_stats（正式賽事，記錄員見證） | ✅ | 球類榜主來源 |
| HealthKit / Health Connect / Strava 匯入 | ✅ | GPS + 感應器難造假 |

打卡資料**永不進排行榜**。

#### 排行榜分層設計（避免「永遠贏不過那一個王」）
不只一個王。同一場域多軸切片：
- 球場 × 時段：「2026 Q1 新竹國民運動中心籃球王」
- 球場 × 月份：「2026 年 4 月新竹國民運動中心 PR 跑者」
- 球場 × 等級：（有等級分組時做，先不做）

這樣同球場有 N 個王，仰望但不會放棄。

#### 各運動的排榜指標（待真實資料定）
| 運動 | 主榜指標 | 次榜（之後再加）|
|---|---|---|
| 籃球 | 總得分（單月）/ 場均得分（min 5 場）| 三分球王 / 籃板王 / 助攻王 |
| 排球 | 扣殺成功數 | 攔網王 / 發球得分王 |
| 羽球 | 勝局數（單月）| 單打勝率 / 雙打勝率 |
| 跑步 | 總公里數 / 最快 5K | 最長單次距離 / 月跑量 |

實際指標等真實資料累積後再定，避免空想。

#### 場地正規化前置（必做）
排行榜要算「球場王」需要 venues 是正規化 entity，不能是自由文字。
- 既有 `venues` 表已存在（venue 預約功能用）
- 需要：打卡 / sport_stats 都關聯到 `venue_id`，而不只是 location 文字

#### 數據誠信延伸：球類雙方確認制（未來功能）
為了讓未來球類資料**沒有正式記錄員時也能上榜**，可加「對戰雙方都按確認，數據才上榜」機制：
- 1v1（羽球單打、籃球 SOLO）→ 雙方確認
- 多人對抗 → 組長確認 / 過半確認

這條**等正式賽事資料源穩定後再做**，不是 MVP。

#### 行銷頭銜（Phase 1 商業槓桿）
有了真實資料的球王 → 「2026 新竹甲組籃球場分數王 - 小明」可印 T-shirt / 做訪談影片 / 做廣告素材。
**前提**：要有真王才能行銷，沒資料量就沒頭銜。所以排行榜時序對齊用戶量成長：
- 用戶 < 30：完全不做排行榜 UI（資料不夠，做了反效果）
- 用戶 30-100：先做跑步排行榜（資料源最容易滿）
- 用戶 > 100：球類排行榜（看正式賽事 + 雙方確認制資料量）

#### 不做的東西（避免錯路）
- **連續登入排行**、**每日勳章排行** → 違反 CLAUDE.md「不為 DAU 加 gamification」
- **全國總榜** → 跨球場可比性差（水平不同），地方榜更有意義
- **包含打卡的混合榜** → 灌水殺手

---

## 5. 實作分梯次

目標：每梯完成後可以單獨驗證，不是「全部做完才能測」。

### 第 0 梯 — 清地基（1-2 天）
- [ ] DROP TABLE `player_stats`（舊）
- [ ] ALTER `profiles` 加 `tagging_privacy`
- [ ] ALTER `runs` 加 `event_id`
- [ ] 更新 `types/database.ts`
- [ ] 刪除 `services/playerStats.ts`（或重構檔名）

### 第 1 梯 — 正式戰績資料層 + 記錄台 Pro 模式（5-10 天）
- [ ] 建三張 sport_stats 表 + RLS
- [ ] 新 service：`services/basketballStats.ts`、`volleyballStats.ts`、`badmintonStats.ts`
- [ ] `event/scores.tsx` 重構為 Pro 模式 UI
- [ ] 進場前陣容設定畫面（registrations 多選 + 臨時球員）
- [ ] Undo 邏輯
- [ ] 直立 / 橫放版面

**驗證**：找一場實體籃球賽，用新 UI 記一場，看有沒有記完整。

### 第 2 梯 — 戰績牆 + 修 bug（5-7 天）
- [ ] `(tabs)/profile.tsx` 加生涯統計卡（修自己看不到 bug）
- [ ] 統計卡依 S 按鈕 selectedSport 動態渲染
- [ ] 時間線（混合正式 + 打卡呈現，含標籤）
- [ ] 統一 `calendar.tsx`、`profile.tsx`、`user/[id].tsx` 的呈現邏輯

**驗證**：打開自己 Profile，有生涯卡；切籃球 / 跑步 tab，統計卡內容跟著變。

### 第 3 梯 — 打卡功能（已完成 2026-04-25）
- [x] 建 `check_ins` 表 + RLS
- [x] `services/checkIns.ts`
- [x] 打卡表單畫面（運動別動態欄位）
- [x] 同伴標記 + 隱私分流邏輯
- [x] 打卡分享卡（運動別視覺差異化、`components/shareCards/CheckInShareCard.tsx`）
- [x] 打卡完成 → 自動跳分享 preview
- [x] 跑步從打卡選項移除（手填動線廢棄）

**驗證**：✅ 完整走「打開 App → 打卡 → 分享到 IG」流程已可用。

### 第 4 梯 — HealthKit / Health Connect 跑步匯入（5-8 天）
跑步資料源從「自建追蹤」改為「設備寄生匯入」（Section 4.4）。

- [ ] 安裝 `react-native-health` (iOS) + 設定 entitlements
- [ ] 設定頁加「連結 Apple Health」按鈕（系統授權對話框）
- [ ] 拉最近 30 天 HKWorkoutType.Running → 寫 `runs` 表
- [ ] 同步任務：app foreground 時觸發增量同步
- [ ] 揪團跑自動關聯：scheduled_at ± 2 小時匹配 → 寫 `run_participants`
- [ ] Android 補：`react-native-health-connect`（第二輪，可在主線後 2-3 週內）
- [ ] Strava API 為次要來源，**不在本梯**（等用戶反映需要軌跡再做）

**驗證**：iOS 模擬器 / 實機跑一次 Apple Watch，HealthKit 同步後 SBALT 看得到該筆 run；揪團跑活動後三個人的 run_participants 自動串好。

### 第 5 梯 — venue 正規化 + 場地關聯（2-3 天）
排行榜的「球場王」必須建立在正規化的 venue entity 上。

- [ ] 打卡 / sport_stats / runs 都加 `venue_id` 欄位（或關聯方式）
- [ ] 打卡時 location 改為「從現有 venues 搜尋 / 新增」（不純文字輸入）
- [ ] 既有打卡資料的 venue 補資料策略（暫不做，等量大再考慮）

**驗證**：每筆打卡 / 戰績都能對應到唯一 venue_id。

### 第 6 梯 — 戰績牆 + 修 bug（5-7 天）
- [ ] `(tabs)/profile.tsx` 加生涯統計卡（已部分完成）
- [ ] 統計卡依 S 按鈕 selectedSport 動態渲染（已部分完成）
- [ ] 時間線整合 HealthKit 跑步紀錄（profileTimeline 加 runs 來源）
- [ ] 統一 `calendar.tsx`、`profile.tsx`、`user/[id].tsx` 的呈現邏輯

### 第 7 梯 — 球友網（5-7 天）
- [ ] 從多源推導查詢（registrations + run_participants + check_ins.partners）
- [ ] 球友網 UI（列表 + 排序 + 篩選 + 按運動）
- [ ] Profile 整合「常打球友」顯示

### 第 8 梯 — 正式戰績分享卡 + 跑步分享卡（部分完成 2026-04-26）
- [ ] 正式戰績卡設計（含 ★ SBALT 認證 標記）
- [ ] 從活動結算頁觸發分享
- [x] 跑步分享卡 `components/shareCards/RunShareCard.tsx` — Mapbox Static Images API + polyline overlay（不依賴 Strava）
- [x] `RunShareModal` + run-detail 頁分享按鈕入口
- [x] `utils/polyline.ts`（Google polyline 編碼 + Douglas-Peucker 簡化）

### 第 9 梯 — 跑步排行榜 v1（用戶 30+ 後做）
跑步資料是排行榜資料源中**最容易達到 critical mass** 的（HealthKit 自動進）。

- [ ] 跑步排行榜 UI：總公里數（單月）/ 最快 5K
- [ ] 範圍切片：全部 / 區域（profile.region）/ 球場（venue_id）
- [ ] 個人成就頁顯示自己排名

**驗證**：至少 10 個人有跑步資料時，排行榜內容看起來合理。

### 第 10 梯（用戶 100+ 後做）— 球類排行榜
- [ ] 球場 × 月份 × 運動 排行榜
- [ ] 球場王頭銜系統 + 行銷素材生成
- [ ] 雙方確認制（補球類資料源誠信）

**前提**：正式賽事 sport_stats 累積到一定密度。

### 第 11 梯（可選、延後）— Solo 模式 UI（3-5 天）
- [ ] Solo 模式畫面（簡化版 + 1 項自選次動作）
- [ ] 模式切換入口
- [ ] Solo 預設值（籃球=犯規、排球=扣殺、羽球=勝局）+ 可改

### 總估
跑步匯入 + venue + 戰績牆 + 球友網 + 跑步榜 ≈ 25-35 天 solo dev 純工時。
球類排行榜（梯 10）等用戶 > 100 才做，時間取決於用戶成長。

**每梯完成後訪談 2-3 個目標 TA** 再進下一梯。

---

## 6. 風險與待驗證假設

這些是我們討論時就知道有風險的假設。**實作前或第 1 梯後要驗證**，不然是空中樓閣。

### 風險 1：全欄位真的會被看嗎？
**假設**：業餘正式比賽的使用者會認真看自己的籃板、助攻、抄截。
**風險**：若只看得分和勝率，全欄位記錄是 over-engineering。
**驗證**：第 1 梯做完後，訪談 5 個目標 TA：「你看戰績時會深入看哪些欄位？」
**觸發調整**：若 80% 受訪者只看得分勝率 → 考慮次要欄位預設折疊、甚至砍。

### 風險 2：2 人記錄台比例多高？
**假設**：使用者宣稱 2 人記錄台是業內常態。
**風險**：若實際只有少數正式賽事有 2 人，Pro 模式過度複雜。
**驗證**：訪談 + 觀察前 20 場正式比賽實際是 1 人還是 2 人。
**觸發調整**：若 < 30% 是 2 人 → Solo 模式升為主要、Pro 模式簡化。

### 風險 3：球友網密度起不起來？
**假設**：靠 events 自動推導 + 少量手動標記，足以建立有感的球友網。
**風險**：揪團活動量不夠，球友網資料稀薄，無社交鎖定效果。
**驗證**：觀察前 100 個揪團活動產生的球友連結總數，平均每人連結 > 5 才算有感。
**觸發調整**：若密度低 → 加強揪團頻率 / 增加標記 UX / 考慮開放公開預設。

### 風險 4：approval_required 預設會阻斷手動標記嗎？
**假設**：雖然預設保守，多數球友間會接受標記。
**風險**：大家懶得改預設 → 標記大量 pending → 接受率低 → 球友網變形。
**驗證**：上線後追蹤「標記發送 vs 接受」比率。
**觸發調整**：接受率 < 50% → 重新評估預設值，或在 onboarding 強制選擇。

### 風險 5：記錄員訓練和資料品質
**假設**：記錄員會正確使用新 UI。
**風險**：舊習慣轉不過、漏記、誤記。
**驗證**：第 1 梯找 3 位實際記錄員做可用性測試。
**觸發調整**：UI 改版、加教學模式、加檢查警示（例：隊分和個人得分總和不符）。

---

## 7. 後續調整觸發條件

### 三個月回顧
實作全部完成三個月後，檢視：
- 哪些功能**無人使用**（打卡發多少次？球友網打開率？分享卡分享次數？）→ 砍
- 哪些欄位**零填入**（例如排球的「救球」從沒被記錄）→ 考慮從 UI 隱藏，或改為選填
- 使用者**主動反應**的需求 → 納入下個規劃週期

### 訪談觸發調整
- 收到 3+ 個使用者相同需求 → 加
- 收到 3+ 個使用者抱怨相同痛點 → 優先修
- 明確拒訪 / 不想聊的使用者 → 重審 TA 對齊度

### 記錄員回饋專線
- 開一個「記錄員意見回饋」入口
- 每月整理一次、定期 review UI

---

## 附錄 A：未處理的邊界情況（要時再決定）

這些是實作時會冒出來的，先記下不卡主線：
- **事前記錄 vs 事後修正**：記錄員記錯怎麼改？目前只能 undo 20 秒內，長期錯誤要怎麼辦？
- **跨運動混合同場**（例如籃球+排球聯合賽）：目前 schema 每場一個運動，這類需求怎麼辦？
- **雙打羽球的 partner_id**：如果搭檔沒註冊 SBALT 怎麼辦？（目前只能留空）
- **分享卡的多語言**：只做中文還是英日韓？
- **通知風暴**：同伴標記通知、戰績更新通知、球友加入通知，如何收斂？

---

## 附錄 B：CLAUDE.md 的關係

本 Plan 是 CLAUDE.md 的**實作細節延伸**，不是方向宣告。

當實作過程中發現方向需要調整（例如 TA 認知變化、護城河策略變化）：
1. 先停下來和使用者確認這是方向變動還是例外
2. 若是方向變動 → 先改 CLAUDE.md → 再改本 Plan → 再實作
3. 若是例外 → 只改本 Plan 附錄 A，CLAUDE.md 不動

本 Plan 中的任何決策，若和 CLAUDE.md 的核心方向衝突，**以 CLAUDE.md 為準**，本 Plan 要修正對齊。

---

## 維護記錄

| 日期 | 變動 | 原因 |
|---|---|---|
| 2026-04-23 | 初版 | 經多輪討論 + 紅隊挑戰 + 現況盤點後成形 |
| 2026-04-25 | 第 0~3 梯實作完成（清地基、sport_stats、打卡、分享卡）| 跟 Plan 對齊 |
| 2026-04-25 | 4.4 跑步社交層改為 HealthKit/Health Connect 寄生匯入策略；新增 4.6 在地球王排行榜系統章節；決策表加 18~22 項；實作梯次重排（HealthKit / venue / 排行榜插入並重編號到第 11 梯） | 用戶 TA 可能多元使用 Apple Watch / Strava / Nike Run，自建追蹤跟 Strava 紅海競爭沒勝算；排行榜需資料密度，要先鋪資料層 |
| 2026-04-26 | 跑步分享卡實作完成（第 8 梯部分完成）。與球類分享卡同 design family（深色漸層、SBALT 浮水印、運動 pill）但底圖改用 Mapbox Static Images API 顯示實際路線（polyline 編碼 + 簡化）。沒有 GPS route 時 fallback 漸層底圖 | 跑步戰績必有路線資訊強化分享動機；用 Mapbox static 比 ViewShot live MapView 在小尺寸畫布上穩定 |