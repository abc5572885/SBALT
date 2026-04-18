-- 2026-04-19: 比賽隊伍報名系統
-- 賽事支援個人或隊伍報名；隊伍有隊長、成員邀請流程
-- tournament_teams: 隊伍資料
-- tournament_team_members: 隊員（含邀請狀態）

-- 擴充 tournaments 表
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS registration_type TEXT NOT NULL DEFAULT 'individual'
    CHECK (registration_type IN ('individual', 'team')),
  ADD COLUMN IF NOT EXISTS team_size INTEGER;  -- 每隊人數（例：3v3 = 3）

-- 隊伍表
CREATE TABLE IF NOT EXISTS public.tournament_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  captain_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'forming'
    CHECK (status IN ('forming', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament ON public.tournament_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_captain ON public.tournament_teams(captain_id);

-- 隊員表
CREATE TABLE IF NOT EXISTS public.tournament_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('captain', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.tournament_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.tournament_team_members(user_id, status);

-- RLS
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_team_members ENABLE ROW LEVEL SECURITY;

-- teams: 公開可讀；隊長可建立/修改/刪除（賽事主辦也可刪）
DROP POLICY IF EXISTS "tournament_teams_select_all" ON public.tournament_teams;
CREATE POLICY "tournament_teams_select_all" ON public.tournament_teams
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "tournament_teams_insert_captain" ON public.tournament_teams;
CREATE POLICY "tournament_teams_insert_captain" ON public.tournament_teams
  FOR INSERT WITH CHECK (auth.uid() = captain_id);

DROP POLICY IF EXISTS "tournament_teams_update_captain" ON public.tournament_teams;
CREATE POLICY "tournament_teams_update_captain" ON public.tournament_teams
  FOR UPDATE USING (auth.uid() = captain_id);

DROP POLICY IF EXISTS "tournament_teams_delete_captain_or_organizer" ON public.tournament_teams;
CREATE POLICY "tournament_teams_delete_captain_or_organizer" ON public.tournament_teams
  FOR DELETE USING (
    auth.uid() = captain_id
    OR EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.groups g ON g.id = t.organizer_group_id
      WHERE t.id = tournament_id AND g.creator_id = auth.uid()
    )
  );

-- team_members: 公開可讀；隊長可加入成員邀請；自己可改自己狀態；自己/隊長可刪除
DROP POLICY IF EXISTS "team_members_select_all" ON public.tournament_team_members;
CREATE POLICY "team_members_select_all" ON public.tournament_team_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "team_members_insert_captain_or_self" ON public.tournament_team_members;
CREATE POLICY "team_members_insert_captain_or_self" ON public.tournament_team_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.tournament_teams
      WHERE id = team_id AND captain_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "team_members_update_self" ON public.tournament_team_members;
CREATE POLICY "team_members_update_self" ON public.tournament_team_members
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.tournament_teams
      WHERE id = team_id AND captain_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "team_members_delete_self_or_captain" ON public.tournament_team_members;
CREATE POLICY "team_members_delete_self_or_captain" ON public.tournament_team_members
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.tournament_teams
      WHERE id = team_id AND captain_id = auth.uid()
    )
  );
