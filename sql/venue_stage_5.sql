-- 2026-04-25: Recording System Stage 5 — venue 正規化
-- 對應 docs/RECORDING_SYSTEM_PLAN.md Section 4.6 + Stage 5
--
-- 將「球場」從自由文字升級為 entity，作為「在地球王」排行榜的關聯主鍵。
-- venue_id 全部 nullable + ON DELETE SET NULL，讓既有資料 / 自由文字打卡仍可運作。
-- 這梯先補欄位，UI 漸進改用 VenuePicker，老資料不強制回填。

ALTER TABLE public.check_ins
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL;

ALTER TABLE public.basketball_stats
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL;

ALTER TABLE public.volleyball_stats
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL;

ALTER TABLE public.badminton_stats
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL;

ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL;

-- 排行榜要按 venue 聚合查詢，每張表都加 index
CREATE INDEX IF NOT EXISTS idx_checkins_venue ON public.check_ins(venue_id) WHERE venue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_basketball_stats_venue ON public.basketball_stats(venue_id) WHERE venue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_volleyball_stats_venue ON public.volleyball_stats(venue_id) WHERE venue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_badminton_stats_venue ON public.badminton_stats(venue_id) WHERE venue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_venue ON public.events(venue_id) WHERE venue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_runs_venue ON public.runs(venue_id) WHERE venue_id IS NOT NULL;
