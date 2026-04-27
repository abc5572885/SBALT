-- 2026-04-27: Stats schema 對齊國際標準
--
-- 擴充 3 個 stats 表，新增命中率與失誤分類所需欄位。
-- 因為現有資料只是測試用，先 TRUNCATE 清乾淨再 ALTER。
--
-- 改動概要：
--   basketball_stats:
--     + misses_1pt / misses_2pt / misses_3pt（罰球/2分/3分未進）
--     + offensive_rebounds / defensive_rebounds（進攻/防守籃板）
--     舊 rebounds 欄位保留（未來可廢，目前不再寫入）
--
--   volleyball_stats:
--     + spike_errors / block_errors / serve_errors
--     + reception_successes / reception_errors
--     舊 errors 欄位保留作為通用未分類失誤
--
--   badminton_stats:
--     + smash_errors / drop_errors / net_kill_errors
--     舊 errors 保留作為通用失誤（網觸/服務違例等）

-- ── 1. 清測試資料 ──
TRUNCATE TABLE public.basketball_stats CASCADE;
TRUNCATE TABLE public.volleyball_stats CASCADE;
TRUNCATE TABLE public.badminton_stats CASCADE;

-- ── 2. Basketball ──
ALTER TABLE public.basketball_stats
  ADD COLUMN IF NOT EXISTS misses_1pt INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS misses_2pt INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS misses_3pt INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS offensive_rebounds INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS defensive_rebounds INT NOT NULL DEFAULT 0;

-- ── 3. Volleyball ──
ALTER TABLE public.volleyball_stats
  ADD COLUMN IF NOT EXISTS spike_errors INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS block_errors INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS serve_errors INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reception_successes INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reception_errors INT NOT NULL DEFAULT 0;

-- ── 4. Badminton ──
ALTER TABLE public.badminton_stats
  ADD COLUMN IF NOT EXISTS smash_errors INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS drop_errors INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_kill_errors INT NOT NULL DEFAULT 0;

-- ── 5. 確認 ──
DO $$
BEGIN
  RAISE NOTICE 'basketball_stats columns: %', (
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'basketball_stats'
  );
  RAISE NOTICE 'volleyball_stats columns: %', (
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'volleyball_stats'
  );
  RAISE NOTICE 'badminton_stats columns: %', (
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'badminton_stats'
  );
END $$;
