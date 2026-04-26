-- 2026-04-26: Venue Phase 1 — GPS 感知 + Google Places 整合
-- 對應「在地社群圖」系統 Phase 1
--
-- 改動：
-- 1. 加 latitude/longitude 欄位（GPS 距離計算）
-- 2. 加 google_place_id 欄位（從 Google Places 拉的地點，用 place_id 去重）
-- 3. 加 is_public_landmark 欄位（區分公共地標 vs 商家自建）
-- 4. operator_group_id 改 nullable（公共地標 / Google POI 沒經營者群組）
--
-- 資料來源策略：
-- - 不寫死 seed 資料
-- - 用戶查附近場地時，動態從 Google Places API 拉
-- - 一旦有 SBALT 用戶在某 Google POI 建活動 / 打卡，該 POI 升級為 SBALT venue（寫入此表）
-- - 之後其他 SBALT 用戶看該 venue 會看到活動 / 球友 / 場地王

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS google_place_id TEXT,
  ADD COLUMN IF NOT EXISTS is_public_landmark BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE public.venues
  ALTER COLUMN operator_group_id DROP NOT NULL;

COMMENT ON COLUMN public.venues.latitude IS 'GPS 緯度 (WGS84)';
COMMENT ON COLUMN public.venues.longitude IS 'GPS 經度 (WGS84)';
COMMENT ON COLUMN public.venues.google_place_id IS 'Google Places place_id — 從 Google 匯入的場地，用此去重';
COMMENT ON COLUMN public.venues.is_public_landmark IS '是否為公共地標（無 operator_group_id 的場地：公園、跑步道、公立運動中心等）';

-- google_place_id 唯一索引（防止重複匯入同一個 Google POI）
CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_google_place
  ON public.venues(google_place_id)
  WHERE google_place_id IS NOT NULL;

-- 地理位置索引（給附近場地查詢用）
CREATE INDEX IF NOT EXISTS idx_venues_geo
  ON public.venues(latitude, longitude)
  WHERE latitude IS NOT NULL AND status = 'active';

-- 分類索引（給 Discover 場地 tab filter 用）
CREATE INDEX IF NOT EXISTS idx_venues_landmark_region
  ON public.venues(is_public_landmark, region)
  WHERE status = 'active';
