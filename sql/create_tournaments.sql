-- 2026-04-19: 比賽系統 — 賽事與個人報名
-- 專給 competition_org 類型群組使用
-- MVP v1：個人報名，免費或 placeholder 收費（真金流等公司登記）

-- 賽事表
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sport_type TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'other'
    CHECK (format IN ('single_elim', 'double_elim', 'round_robin', 'league', 'other')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  registration_deadline TIMESTAMPTZ,
  location TEXT NOT NULL,
  venue TEXT,
  rules TEXT,
  entry_fee INTEGER NOT NULL DEFAULT 0,
  prize_pool TEXT,
  max_participants INTEGER,
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('draft', 'open', 'closed', 'ongoing', 'finished', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournaments_group ON public.tournaments(organizer_group_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_start ON public.tournaments(start_date);

-- 報名表
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'waitlisted')),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'waived', 'refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_regs_tournament ON public.tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_regs_user ON public.tournament_registrations(user_id);

-- RLS
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

-- tournaments: 所有人可讀、只有群組建立者可寫
DROP POLICY IF EXISTS "tournaments_select_all" ON public.tournaments;
CREATE POLICY "tournaments_select_all" ON public.tournaments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "tournaments_insert_organizer" ON public.tournaments;
CREATE POLICY "tournaments_insert_organizer" ON public.tournaments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = organizer_group_id
        AND creator_id = auth.uid()
        AND type = 'competition_org'
    )
  );

DROP POLICY IF EXISTS "tournaments_update_organizer" ON public.tournaments;
CREATE POLICY "tournaments_update_organizer" ON public.tournaments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = organizer_group_id
        AND creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tournaments_delete_organizer" ON public.tournaments;
CREATE POLICY "tournaments_delete_organizer" ON public.tournaments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = organizer_group_id
        AND creator_id = auth.uid()
    )
  );

-- tournament_registrations: 公開可讀（demo 用）、自己報名、自己取消、主辦可管
DROP POLICY IF EXISTS "tournament_regs_select_all" ON public.tournament_registrations;
CREATE POLICY "tournament_regs_select_all" ON public.tournament_registrations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "tournament_regs_insert_own" ON public.tournament_registrations;
CREATE POLICY "tournament_regs_insert_own" ON public.tournament_registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tournament_regs_update_own_or_organizer" ON public.tournament_registrations;
CREATE POLICY "tournament_regs_update_own_or_organizer" ON public.tournament_registrations
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.groups g ON g.id = t.organizer_group_id
      WHERE t.id = tournament_id AND g.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tournament_regs_delete_own_or_organizer" ON public.tournament_registrations;
CREATE POLICY "tournament_regs_delete_own_or_organizer" ON public.tournament_registrations
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.groups g ON g.id = t.organizer_group_id
      WHERE t.id = tournament_id AND g.creator_id = auth.uid()
    )
  );
