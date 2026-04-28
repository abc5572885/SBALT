-- 2026-04-28: Match 抽象層 — 一個 event 內可開多場 match
--
-- 為了支援「一場揪打 4 隊輪流打」「系隊邀請賽 6 場 round-robin」這類情境，
-- 在 event 與 stats 之間加入 event_matches 層。
--
-- 模型：
--   Event  ──┐
--            ├── Match #1  (A vs B)  ──┬── basketball_stats (多球員)
--            ├── Match #2  (C vs D)    ├── event_actions
--            ├── Match #3  (A vs C)    └── volleyball_sets / badminton_games
--            └── Match #4  (B vs D)
--
-- 球員可以跨 match 出現（不同 team_label），每場 match 有獨立計分／計時。
-- 比賽起訖時間從 events 移到 event_matches（每場各自）。
--
-- 既有的測試資料尚未上線，整批 TRUNCATE 重新開始。

-- ── 1. 清舊資料 ──
TRUNCATE TABLE public.basketball_stats CASCADE;
TRUNCATE TABLE public.volleyball_stats CASCADE;
TRUNCATE TABLE public.badminton_stats CASCADE;
TRUNCATE TABLE public.event_actions CASCADE;
TRUNCATE TABLE public.volleyball_sets CASCADE;
TRUNCATE TABLE public.badminton_games CASCADE;

-- ── 2. event_matches ──
CREATE TABLE IF NOT EXISTS public.event_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  match_number int NOT NULL,
  sport text NOT NULL,
  home_label text NOT NULL,
  away_label text NOT NULL,
  status text NOT NULL DEFAULT 'open',  -- 'open' | 'finished' | 'cancelled'
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, match_number)
);
CREATE INDEX IF NOT EXISTS idx_event_matches_event ON public.event_matches(event_id);

ALTER TABLE public.event_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_matches_select" ON public.event_matches;
CREATE POLICY "event_matches_select" ON public.event_matches
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "event_matches_modify" ON public.event_matches;
CREATE POLICY "event_matches_modify" ON public.event_matches
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_matches.event_id
        AND (e.organizer_id = auth.uid() OR e.id IN (
          SELECT event_id FROM public.registrations
          WHERE user_id = auth.uid() AND status = 'registered'
        ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_matches.event_id
        AND (e.organizer_id = auth.uid() OR e.id IN (
          SELECT event_id FROM public.registrations
          WHERE user_id = auth.uid() AND status = 'registered'
        ))
    )
  );

-- ── 3. 加 match_id 到所有 stats / 動作 / set 表 ──
ALTER TABLE public.basketball_stats
  ADD COLUMN IF NOT EXISTS match_id uuid REFERENCES public.event_matches(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_basketball_stats_match ON public.basketball_stats(match_id);

ALTER TABLE public.volleyball_stats
  ADD COLUMN IF NOT EXISTS match_id uuid REFERENCES public.event_matches(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_volleyball_stats_match ON public.volleyball_stats(match_id);

ALTER TABLE public.badminton_stats
  ADD COLUMN IF NOT EXISTS match_id uuid REFERENCES public.event_matches(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_badminton_stats_match ON public.badminton_stats(match_id);

ALTER TABLE public.event_actions
  ADD COLUMN IF NOT EXISTS match_id uuid REFERENCES public.event_matches(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_event_actions_match ON public.event_actions(match_id);

ALTER TABLE public.volleyball_sets
  ADD COLUMN IF NOT EXISTS match_id uuid REFERENCES public.event_matches(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_volleyball_sets_match ON public.volleyball_sets(match_id);

ALTER TABLE public.badminton_games
  ADD COLUMN IF NOT EXISTS match_id uuid REFERENCES public.event_matches(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_badminton_games_match ON public.badminton_games(match_id);

-- ── 4. Reload PostgREST schema cache ──
NOTIFY pgrst, 'reload schema';

DO $$ BEGIN
  RAISE NOTICE '=== Match layer migration done ===';
END $$;
