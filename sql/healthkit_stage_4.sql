-- 2026-04-25: Recording System Stage 4 — HealthKit/Health Connect 跑步匯入
-- 對應 docs/RECORDING_SYSTEM_PLAN.md Section 4.4 + Stage 4
--
-- 加 source / external_id 欄位讓我們能：
-- 1. 區分 manual / healthkit / strava / nike_run 來源
-- 2. external_id (HealthKit workout UUID 等) 用於去重
-- 3. (user_id, source, external_id) UNIQUE 防止重複同步

ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS source_metadata JSONB;

COMMENT ON COLUMN public.runs.source IS 'manual | healthkit | strava | nike_run';
COMMENT ON COLUMN public.runs.external_id IS 'External system workout ID for dedup';
COMMENT ON COLUMN public.runs.source_metadata IS 'Source-specific extra data (device, app, etc)';

-- Dedup unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_runs_user_source_external
  ON public.runs(user_id, source, external_id)
  WHERE source IS NOT NULL AND external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_runs_started_at ON public.runs(started_at DESC);
