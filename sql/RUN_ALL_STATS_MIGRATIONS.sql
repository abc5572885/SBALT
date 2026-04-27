-- 2026-04-27: 一次跑完所有 stats 相關 migration
-- 順序很重要，請整份貼到 Supabase Dashboard → SQL Editor 執行。

-- ============================================================
-- 0. 清測試資料 + 命中率欄位 + 進攻/防守籃板
-- (原 sql/stats_full_alignment.sql)
-- ============================================================

TRUNCATE TABLE public.basketball_stats CASCADE;
TRUNCATE TABLE public.volleyball_stats CASCADE;
TRUNCATE TABLE public.badminton_stats CASCADE;

ALTER TABLE public.basketball_stats
  ADD COLUMN IF NOT EXISTS misses_1pt INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS misses_2pt INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS misses_3pt INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS offensive_rebounds INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS defensive_rebounds INT NOT NULL DEFAULT 0;

ALTER TABLE public.volleyball_stats
  ADD COLUMN IF NOT EXISTS spike_errors INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS block_errors INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS serve_errors INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reception_successes INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reception_errors INT NOT NULL DEFAULT 0;

ALTER TABLE public.badminton_stats
  ADD COLUMN IF NOT EXISTS smash_errors INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS drop_errors INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_kill_errors INT NOT NULL DEFAULT 0;

-- ============================================================
-- 1. 單局比分 + 比賽計時
-- (原 sql/stats_phase1_sets_and_time.sql)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.volleyball_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  set_number int NOT NULL,
  home_label text NOT NULL,
  away_label text NOT NULL,
  home_score int NOT NULL DEFAULT 0,
  away_score int NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  UNIQUE(event_id, set_number)
);
CREATE INDEX IF NOT EXISTS idx_volleyball_sets_event ON public.volleyball_sets(event_id);

ALTER TABLE public.volleyball_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "volleyball_sets_select" ON public.volleyball_sets;
CREATE POLICY "volleyball_sets_select" ON public.volleyball_sets
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "volleyball_sets_modify" ON public.volleyball_sets;
CREATE POLICY "volleyball_sets_modify" ON public.volleyball_sets
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = volleyball_sets.event_id
        AND (e.organizer_id = auth.uid() OR e.id IN (
          SELECT event_id FROM public.registrations
          WHERE user_id = auth.uid() AND status = 'registered'
        ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = volleyball_sets.event_id
        AND (e.organizer_id = auth.uid() OR e.id IN (
          SELECT event_id FROM public.registrations
          WHERE user_id = auth.uid() AND status = 'registered'
        ))
    )
  );

CREATE TABLE IF NOT EXISTS public.badminton_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  game_number int NOT NULL,
  home_label text NOT NULL,
  away_label text NOT NULL,
  home_score int NOT NULL DEFAULT 0,
  away_score int NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  UNIQUE(event_id, game_number)
);
CREATE INDEX IF NOT EXISTS idx_badminton_games_event ON public.badminton_games(event_id);

ALTER TABLE public.badminton_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "badminton_games_select" ON public.badminton_games;
CREATE POLICY "badminton_games_select" ON public.badminton_games
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "badminton_games_modify" ON public.badminton_games;
CREATE POLICY "badminton_games_modify" ON public.badminton_games
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = badminton_games.event_id
        AND (e.organizer_id = auth.uid() OR e.id IN (
          SELECT event_id FROM public.registrations
          WHERE user_id = auth.uid() AND status = 'registered'
        ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = badminton_games.event_id
        AND (e.organizer_id = auth.uid() OR e.id IN (
          SELECT event_id FROM public.registrations
          WHERE user_id = auth.uid() AND status = 'registered'
        ))
    )
  );

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS match_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS match_ended_at timestamptz;

-- ============================================================
-- 2. event_actions 動作 log + 替補 + is_starter
-- (原 sql/stats_phase2_actions_and_subs.sql)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.event_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sport text NOT NULL,
  stat_id uuid,
  user_id uuid,
  team_label text NOT NULL,
  action_type text NOT NULL,
  points_delta int NOT NULL DEFAULT 0,
  quarter int,
  set_number int,
  ts timestamptz NOT NULL DEFAULT now(),
  meta jsonb
);
CREATE INDEX IF NOT EXISTS idx_event_actions_event ON public.event_actions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_actions_stat ON public.event_actions(stat_id);
CREATE INDEX IF NOT EXISTS idx_event_actions_event_ts ON public.event_actions(event_id, ts);

ALTER TABLE public.event_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_actions_select" ON public.event_actions;
CREATE POLICY "event_actions_select" ON public.event_actions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "event_actions_modify" ON public.event_actions;
CREATE POLICY "event_actions_modify" ON public.event_actions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_actions.event_id
        AND (e.organizer_id = auth.uid() OR e.id IN (
          SELECT event_id FROM public.registrations
          WHERE user_id = auth.uid() AND status = 'registered'
        ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_actions.event_id
        AND (e.organizer_id = auth.uid() OR e.id IN (
          SELECT event_id FROM public.registrations
          WHERE user_id = auth.uid() AND status = 'registered'
        ))
    )
  );

ALTER TABLE public.basketball_stats
  ADD COLUMN IF NOT EXISTS is_starter boolean NOT NULL DEFAULT false;
ALTER TABLE public.volleyball_stats
  ADD COLUMN IF NOT EXISTS is_starter boolean NOT NULL DEFAULT false;
ALTER TABLE public.badminton_stats
  ADD COLUMN IF NOT EXISTS is_starter boolean NOT NULL DEFAULT false;

-- ============================================================
-- 3. 羽球進階擊球類型
-- (原 sql/stats_phase4_badminton_strokes.sql)
-- ============================================================

ALTER TABLE public.badminton_stats
  ADD COLUMN IF NOT EXISTS clears INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clear_errors INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS drives INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS drive_errors INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lift_errors INT NOT NULL DEFAULT 0;

-- ============================================================
-- 4. Reload PostgREST schema cache
-- (沒有這行，前端會繼續看到 'column not found in schema cache' 錯誤)
-- ============================================================
NOTIFY pgrst, 'reload schema';

DO $$ BEGIN
  RAISE NOTICE '=== 全部 migration 完成 ===';
END $$;
