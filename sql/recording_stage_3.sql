-- 2026-04-25: Recording System Stage 3 — 打卡 check_ins
-- 對應 docs/RECORDING_SYSTEM_PLAN.md Section 3.4 + 5
-- 打卡是個人紀錄，永不進生涯統計（生涯只看 sport_stats）
-- partners JSONB 含 status：public 直接 accepted、approval_required 為 pending

CREATE TABLE IF NOT EXISTS public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sport_type TEXT NOT NULL,
  played_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  stats JSONB,                  -- {points, threes, rebounds, ...}
  partners JSONB,               -- [{user_id, status}]
  notes TEXT,
  photo_url TEXT,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkins_user ON public.check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_played_at ON public.check_ins(played_at DESC);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checkins_select_public" ON public.check_ins;
CREATE POLICY "checkins_select_public" ON public.check_ins
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "checkins_insert_own" ON public.check_ins;
CREATE POLICY "checkins_insert_own" ON public.check_ins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "checkins_update_own" ON public.check_ins;
CREATE POLICY "checkins_update_own" ON public.check_ins
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "checkins_delete_own" ON public.check_ins;
CREATE POLICY "checkins_delete_own" ON public.check_ins
  FOR DELETE USING (auth.uid() = user_id);
