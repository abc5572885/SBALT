-- ============================================================================
-- profiles 表擴充：運動偏好、身體數據
-- 在 Supabase Dashboard > SQL Editor 執行
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS height INTEGER,
  ADD COLUMN IF NOT EXISTS weight INTEGER,
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  ADD COLUMN IF NOT EXISTS age_range TEXT CHECK (age_range IN ('18-24', '25-34', '35-44', '45+')),
  ADD COLUMN IF NOT EXISTS favorite_sports TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sport_positions JSONB DEFAULT '{}';

-- sport_positions 結構範例：
-- {
--   "basketball": "PG",
--   "volleyball": "opposite",
--   "badminton": "doubles",
--   "running": "marathon"
-- }
