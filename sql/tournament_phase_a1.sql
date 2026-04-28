-- 2026-04-28: Tournament Phase A1 — 賽事結構
--
-- 設計（與 user 確認後）：
--   1. 「隊伍」與「群組」合併 → groups 既是社交群組、也是 team。
--      → 新表 tournament_registrations 引用 group_id (不另開 teams 表)
--   2. tournament_divisions：賽事內的分組（A/B/C 級...），由 organizer 自定
--   3. tournament_matchdays：比賽日（每週日一場）
--   4. event_matches → 改名 matches，加 polymorphic context（'event' | 'tournament'）
--      tournament context 會引用 matchday_id / division_id / home_group_id / away_group_id
--
-- 開發階段，廢棄舊的 tournament_teams / tournament_team_members（資料不保留）。

-- ── 1. 廢棄舊表 ──
-- 舊 tournament_team_members / tournament_teams 是 transient teams（per tournament 臨時組隊）
-- 舊 tournament_registrations 是 per-user 報名
-- 新設計：group 報名 tournament，所以以上全部廢棄重建。
DROP TABLE IF EXISTS public.tournament_team_members CASCADE;
DROP TABLE IF EXISTS public.tournament_teams CASCADE;
DROP TABLE IF EXISTS public.tournament_registrations CASCADE;

-- ── 2. tournament_divisions ──
CREATE TABLE IF NOT EXISTS public.tournament_divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  level_order int NOT NULL DEFAULT 0,  -- 越小越強（A=0, B=1, C=2）
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, name)
);
CREATE INDEX IF NOT EXISTS idx_divisions_tournament ON public.tournament_divisions(tournament_id);

ALTER TABLE public.tournament_divisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "divisions_select" ON public.tournament_divisions;
CREATE POLICY "divisions_select" ON public.tournament_divisions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "divisions_modify_organizer" ON public.tournament_divisions;
CREATE POLICY "divisions_modify_organizer" ON public.tournament_divisions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.groups g ON g.id = t.organizer_group_id
      WHERE t.id = tournament_divisions.tournament_id
        AND g.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.groups g ON g.id = t.organizer_group_id
      WHERE t.id = tournament_divisions.tournament_id
        AND g.creator_id = auth.uid()
    )
  );

-- ── 3. tournament_matchdays ──
CREATE TABLE IF NOT EXISTS public.tournament_matchdays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  matchday_number int NOT NULL,
  scheduled_date date,
  location text,
  notes text,
  status text NOT NULL DEFAULT 'scheduled',  -- 'scheduled' | 'in_progress' | 'finished' | 'cancelled'
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, matchday_number)
);
CREATE INDEX IF NOT EXISTS idx_matchdays_tournament ON public.tournament_matchdays(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matchdays_date ON public.tournament_matchdays(scheduled_date);

ALTER TABLE public.tournament_matchdays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matchdays_select" ON public.tournament_matchdays;
CREATE POLICY "matchdays_select" ON public.tournament_matchdays
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "matchdays_modify_organizer" ON public.tournament_matchdays;
CREATE POLICY "matchdays_modify_organizer" ON public.tournament_matchdays
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.groups g ON g.id = t.organizer_group_id
      WHERE t.id = tournament_matchdays.tournament_id
        AND g.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.groups g ON g.id = t.organizer_group_id
      WHERE t.id = tournament_matchdays.tournament_id
        AND g.creator_id = auth.uid()
    )
  );

-- ── 4. tournament_registrations ──
-- 一個 group 報名一個 tournament，落到某個 division
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  division_id uuid REFERENCES public.tournament_divisions(id) ON DELETE SET NULL,
  team_label text NOT NULL,  -- display name (default = group.name)
  status text NOT NULL DEFAULT 'pending',
    -- 'pending' / 'confirmed' / 'paid' / 'withdrawn'
  paid boolean NOT NULL DEFAULT false,
  notes text,
  registered_by uuid REFERENCES public.profiles(id),
  registered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, group_id)
);
CREATE INDEX IF NOT EXISTS idx_treg_tournament ON public.tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_treg_group ON public.tournament_registrations(group_id);
CREATE INDEX IF NOT EXISTS idx_treg_division ON public.tournament_registrations(division_id);

ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "treg_select" ON public.tournament_registrations;
CREATE POLICY "treg_select" ON public.tournament_registrations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "treg_insert_group_admin" ON public.tournament_registrations;
CREATE POLICY "treg_insert_group_admin" ON public.tournament_registrations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_id AND g.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "treg_modify_organizer_or_team" ON public.tournament_registrations;
CREATE POLICY "treg_modify_organizer_or_team" ON public.tournament_registrations
  FOR UPDATE TO authenticated
  USING (
    -- Tournament organizer can update (for division assignment, payment status)
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.groups g ON g.id = t.organizer_group_id
      WHERE t.id = tournament_registrations.tournament_id
        AND g.creator_id = auth.uid()
    )
    OR
    -- Team owner can update their own registration
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = tournament_registrations.group_id
        AND g.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "treg_delete_organizer_or_team" ON public.tournament_registrations;
CREATE POLICY "treg_delete_organizer_or_team" ON public.tournament_registrations
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.groups g ON g.id = t.organizer_group_id
      WHERE t.id = tournament_registrations.tournament_id
        AND g.creator_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = tournament_registrations.group_id
        AND g.creator_id = auth.uid()
    )
  );

-- ── 5. event_matches → matches (polymorphic) ──
ALTER TABLE public.event_matches RENAME TO matches;

-- event_id 變 nullable（tournament 場次不需要）
ALTER TABLE public.matches ALTER COLUMN event_id DROP NOT NULL;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS context_type text NOT NULL DEFAULT 'event'
    CHECK (context_type IN ('event', 'tournament')),
  ADD COLUMN IF NOT EXISTS matchday_id uuid REFERENCES public.tournament_matchdays(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES public.tournament_divisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS home_group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS away_group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;

-- 確保 context 互斥
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_context_check;
ALTER TABLE public.matches ADD CONSTRAINT matches_context_check CHECK (
  (context_type = 'event' AND event_id IS NOT NULL) OR
  (context_type = 'tournament' AND matchday_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_matches_event ON public.matches(event_id);
CREATE INDEX IF NOT EXISTS idx_matches_matchday ON public.matches(matchday_id);
CREATE INDEX IF NOT EXISTS idx_matches_division ON public.matches(division_id);
CREATE INDEX IF NOT EXISTS idx_matches_home_group ON public.matches(home_group_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_group ON public.matches(away_group_id);

-- 既有 RLS 的 reference name 已自動跟著 rename，無需重建

-- ── 6. Reload PostgREST schema cache ──
NOTIFY pgrst, 'reload schema';

DO $$ BEGIN
  RAISE NOTICE '=== Tournament Phase A1 schema migration done ===';
END $$;
