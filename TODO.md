# SBALT TODO

記錄待辦事項，依優先順序。完成後直接刪除或標記。

---

## 當前重點（實測準備）

- [ ] App Icon 設計
- [ ] Splash Screen 設計
- [ ] TestFlight 上架（需要 Apple Developer 帳號）
- [ ] 找朋友實測收集回饋

## 上架前法律合規

依 App Store 審核 + 台灣個資法要求，上架前必做。

- [x] 檢舉 / 封鎖機制 — App Store 審核硬性要求（UGC app 必備）（待執行 SQL 並實測）
- [ ] 隱私設定 — 讓用戶選身高體重等欄位公開與否
- [ ] 社群連結 opt-in — 預設空，用戶自填才顯示
- [ ] 服務條款 + 隱私權政策 — 需律師審核
- [ ] 登入頁同意 checkbox — 必勾才能登入
- [ ] DB 欄位 — `profiles.terms_accepted_at TIMESTAMPTZ`
- [ ] 決定營運主體：個人名義 vs 公司（影響條款內文）

## 比賽系統（分步做，等真有比賽方再建新表）

- [x] Step 1：`groups.type` 分類（casual / competition_org / team / venue_operator）+ UI 標籤 filter
- [x] Step 2：建 `tournaments` + `tournament_registrations` 表（個人報名 v1）
- [x] Discover 加「比賽」+「場地」區塊
- [x] Step 3：建 `player_stats` 表 + 計分板加「個人得分」按鈕
- [x] Step 4a：隊伍報名（隊長建隊 + 邀請 + 接受/拒絕）
- [ ] Step 4b：賽制晉級（單敗淘汰 / 循環的 bracket 顯示）
- [ ] Step 5：金流 / 保險 / 免責聲明（需公司登記）

## 場地方系統

- [x] `venues` + `venue_bookings` 表 + RLS
- [x] venue_operator 群組類型 + 群組頁「場地」tab
- [x] 場地 CRUD（新增 / 詳情 / 編輯 / 刪除）
- [x] 預約流程（選日期 / 時段 / 時長 / 衝突檢查）
- [x] 場地方管理預約（確認 / 拒絕 / 已完成 / 取消）
- [x] 我的預約頁面（個人頁入口，即將到來/過去紀錄分頁）
- [ ] 場地 cover 圖片上傳
- [ ] 與國民運動中心實際合作洽談

## 社群功能強化

- [x] 其他用戶個人頁（`app/user/[id].tsx`）
- [x] Profile 加 `instagram_url` / `facebook_url` / `line_id` / `avatar_url` 欄位
- [x] 他人個人頁右上角顯示社群連結（點擊開啟外部 app）
- [x] 活動詳情主辦人 / 留言 / 報名列表可點進用戶頁
- [ ] 實測：確認各入口點擊導航正常（跑完 SQL 後）

## 推廣數據追蹤（等有合作方再做）

- [ ] 建 `promotion_events` 表記錄曝光、點擊事件
- [ ] 推廣卡片曝光 / 點擊時送事件
- [ ] 個人頁「推廣資訊管理」改成數據分析面板

## Phase 2 功能（實測後依回饋排序）

### 中期
- [ ] 成就徽章系統（舉辦/參加里程碑、連續出席、社群貢獻）
- [ ] 運動數據追蹤（依運動類型記錄得分/籃板/攔網等）
- [ ] 場地地圖（串 Google Maps 顯示附近球場）
- [ ] 戶外活動天氣提示 + 下雨自動通知

### 長期（商業化）
- [ ] 收支報表（團長每月統計、匯出 Excel）
- [ ] 場地預約串接（平台抽佣）
- [ ] 教練 / 課程系統
- [ ] 線上金流（綠界 / 藍新）

---

相關 memory 檔案（更細節的 context）：

- `.claude/projects/-Users-fan-SBALT/memory/project_current_status.md` — 最新進度
- `.claude/projects/-Users-fan-SBALT/memory/project_legal_compliance.md` — 法律合規詳細
- `.claude/projects/-Users-fan-SBALT/memory/project_future_roadmap.md` — 未來功能路線圖
- `.claude/projects/-Users-fan-SBALT/memory/project_achievement_system.md` — 成就系統設計
- `.claude/projects/-Users-fan-SBALT/memory/project_promotion_analytics.md` — 推廣分析設計
