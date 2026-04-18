-- 2026-04-19: 球員個人數據
-- 計分板記錄每筆得分到特定球員，供後續 AI 分析、個人戰績、MVP 統計
-- 先支援 point（得分），未來可擴充 rebound/assist/block/steal 等 stat_type

CREATE TABLE IF NOT EXISTS public.player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport_type TEXT NOT NULL,
  team_label TEXT,                          -- 主隊 / 客隊 / freeform
  stat_type TEXT NOT NULL DEFAULT 'point',  -- point / rebound / assist / block / steal
  points INTEGER NOT NULL DEFAULT 1,        -- 得分時為 1/2/3，其他 stat 為 1 count
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_stats_event ON public.player_stats(event_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_user ON public.player_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_sport ON public.player_stats(sport_type);

-- RLS
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_stats_select_all" ON public.player_stats;
CREATE POLICY "player_stats_select_all" ON public.player_stats
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "player_stats_insert_authenticated" ON public.player_stats;
CREATE POLICY "player_stats_insert_authenticated" ON public.player_stats
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 組織者或建立者自己可刪（修正誤記）
DROP POLICY IF EXISTS "player_stats_delete_organizer" ON public.player_stats;
CREATE POLICY "player_stats_delete_organizer" ON public.player_stats
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND organizer_id = auth.uid()
    )
  );
