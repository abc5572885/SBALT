-- 2026-04-27: Stats Phase 4 — 羽球進階擊球類型（BWF 對齊）
--
-- BWF 統計：clear（高遠球）、drive（平抽球）、lift（挑球）等擊球類型，
-- 各自有成功與失誤。本階段補上欄位，讓球經能完整記錄。

ALTER TABLE public.badminton_stats
  ADD COLUMN IF NOT EXISTS clears INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clear_errors INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS drives INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS drive_errors INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lift_errors INT NOT NULL DEFAULT 0;

DO $$ BEGIN
  RAISE NOTICE 'badminton_stats: clears / drives / lifts (+ each _errors) added';
END $$;
