-- 2026-04-19: 場地加入每週時段
-- 結構：{ mon: {start:6,end:22}, tue:null, ... }
-- null 代表公休；非 null 表該天從 start 到 end 小時可預約
-- 預設：每天 06:00 - 22:00

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS weekly_schedule JSONB NOT NULL DEFAULT
    '{"mon":{"start":6,"end":22},"tue":{"start":6,"end":22},"wed":{"start":6,"end":22},"thu":{"start":6,"end":22},"fri":{"start":6,"end":22},"sat":{"start":6,"end":22},"sun":{"start":6,"end":22}}'::jsonb;
