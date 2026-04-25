-- 2026-04-25: Recording System Stage 1 — 三張 sport_stats 表 + RLS
-- 對應 docs/RECORDING_SYSTEM_PLAN.md Section 3.4
-- 一場一個球員一筆，每個統計類型獨立欄位

-- ============================================================
-- 籃球統計
-- ============================================================
CREATE TABLE IF NOT EXISTS public.basketball_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_label TEXT NOT NULL,
  display_name TEXT,
  jersey_number TEXT,

  points_1pt INT NOT NULL DEFAULT 0,
  points_2pt INT NOT NULL DEFAULT 0,
  points_3pt INT NOT NULL DEFAULT 0,
  rebounds INT NOT NULL DEFAULT 0,
  assists INT NOT NULL DEFAULT 0,
  steals INT NOT NULL DEFAULT 0,
  blocks INT NOT NULL DEFAULT 0,
  turnovers INT NOT NULL DEFAULT 0,
  fouls INT NOT NULL DEFAULT 0,

  recorded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT bball_user_or_display CHECK (user_id IS NOT NULL OR display_name IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_bballstats_event ON public.basketball_stats(event_id);
CREATE INDEX IF NOT EXISTS idx_bballstats_user ON public.basketball_stats(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.basketball_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bball_select_all" ON public.basketball_stats;
CREATE POLICY "bball_select_all" ON public.basketball_stats
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "bball_insert_organizer" ON public.basketball_stats;
CREATE POLICY "bball_insert_organizer" ON public.basketball_stats
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND organizer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bball_update_organizer" ON public.basketball_stats;
CREATE POLICY "bball_update_organizer" ON public.basketball_stats
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND organizer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bball_delete_organizer" ON public.basketball_stats;
CREATE POLICY "bball_delete_organizer" ON public.basketball_stats
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND organizer_id = auth.uid()
    )
  );

-- ============================================================
-- 排球統計
-- ============================================================
CREATE TABLE IF NOT EXISTS public.volleyball_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_label TEXT NOT NULL,
  display_name TEXT,
  jersey_number TEXT,
  position TEXT,

  spikes INT NOT NULL DEFAULT 0,
  blocks INT NOT NULL DEFAULT 0,
  serve_aces INT NOT NULL DEFAULT 0,
  set_assists INT NOT NULL DEFAULT 0,
  digs INT NOT NULL DEFAULT 0,
  errors INT NOT NULL DEFAULT 0,
  points_total INT NOT NULL DEFAULT 0,

  recorded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT vball_user_or_display CHECK (user_id IS NOT NULL OR display_name IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_vballstats_event ON public.volleyball_stats(event_id);
CREATE INDEX IF NOT EXISTS idx_vballstats_user ON public.volleyball_stats(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.volleyball_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vball_select_all" ON public.volleyball_stats;
CREATE POLICY "vball_select_all" ON public.volleyball_stats
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "vball_insert_organizer" ON public.volleyball_stats;
CREATE POLICY "vball_insert_organizer" ON public.volleyball_stats
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "vball_update_organizer" ON public.volleyball_stats;
CREATE POLICY "vball_update_organizer" ON public.volleyball_stats
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "vball_delete_organizer" ON public.volleyball_stats;
CREATE POLICY "vball_delete_organizer" ON public.volleyball_stats
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND organizer_id = auth.uid())
  );

-- ============================================================
-- 羽球統計
-- ============================================================
CREATE TABLE IF NOT EXISTS public.badminton_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_label TEXT NOT NULL,
  display_name TEXT,
  jersey_number TEXT,
  match_format TEXT NOT NULL CHECK (match_format IN ('singles', 'doubles')),
  partner_id UUID REFERENCES public.profiles(id),

  sets_won INT NOT NULL DEFAULT 0,
  sets_lost INT NOT NULL DEFAULT 0,
  smashes INT NOT NULL DEFAULT 0,
  drops INT NOT NULL DEFAULT 0,
  net_kills INT NOT NULL DEFAULT 0,
  errors INT NOT NULL DEFAULT 0,
  points_won INT NOT NULL DEFAULT 0,
  points_lost INT NOT NULL DEFAULT 0,

  recorded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT bmin_user_or_display CHECK (user_id IS NOT NULL OR display_name IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_bminstats_event ON public.badminton_stats(event_id);
CREATE INDEX IF NOT EXISTS idx_bminstats_user ON public.badminton_stats(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.badminton_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bmin_select_all" ON public.badminton_stats;
CREATE POLICY "bmin_select_all" ON public.badminton_stats
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "bmin_insert_organizer" ON public.badminton_stats;
CREATE POLICY "bmin_insert_organizer" ON public.badminton_stats
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "bmin_update_organizer" ON public.badminton_stats;
CREATE POLICY "bmin_update_organizer" ON public.badminton_stats
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "bmin_delete_organizer" ON public.badminton_stats;
CREATE POLICY "bmin_delete_organizer" ON public.badminton_stats
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND organizer_id = auth.uid())
  );
