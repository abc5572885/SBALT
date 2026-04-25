-- 2026-04-25: Recording System Stage 0 — 清地基
-- 對應 docs/RECORDING_SYSTEM_PLAN.md Section 5 第 0 梯
-- 砍 player_stats、加 tagging_privacy、加 runs.event_id
-- 必須跟 Stage 1（三張 sport_stats）一起部署，否則 achievements/scoreboard 中斷

-- 1. DROP 舊 player_stats
DROP TABLE IF EXISTS public.player_stats CASCADE;

-- 2. profiles 加 tagging_privacy（預設 approval_required，保守）
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tagging_privacy TEXT NOT NULL DEFAULT 'approval_required'
    CHECK (tagging_privacy IN ('public', 'approval_required'));

-- 3. runs 加 event_id（揪團跑可關聯到活動）
-- 若 runs 表存在才執行
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'runs') THEN
    ALTER TABLE public.runs
      ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_runs_event ON public.runs(event_id) WHERE event_id IS NOT NULL;
  END IF;
END $$;
