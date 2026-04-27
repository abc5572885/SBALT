-- 2026-04-27: Stats Phase 1 — 單局比分 + 比賽計時
--
-- 為了對齊國際標準（FIVB 排球分局、BWF 羽球分局、含比賽起訖時間），
-- 新增兩張比分表 + events 兩個時間欄位。
--
-- 改動：
--   + volleyball_sets：每局比分（25/15 分制）
--   + badminton_games：每局比分（21 分制，best-of-3）
--   + events.match_started_at / match_ended_at：實際比賽起訖時間（不同於 scheduled_at）

-- ── 1. volleyball_sets ──
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

-- ── 2. badminton_games ──
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

-- ── 3. events 加比賽起訖時間 ──
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS match_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS match_ended_at timestamptz;

DO $$ BEGIN
  RAISE NOTICE 'volleyball_sets / badminton_games tables created';
  RAISE NOTICE 'events.match_started_at / match_ended_at columns added';
END $$;
