-- 2026-04-27: Stats Phase 2 — 動作 log + 替補 + 先發標記
--
-- 為了支援 MIN（在場時間）和 +/-（在場分差），需要：
--   1. event_actions：動作 log，含 timestamp 和 quarter / set 上下文
--   2. is_starter：每張 stats 表加先發標記，配合 sub events 推導 on-court 狀態
--
-- 設計原則：
--   - event_actions 只記「事件」，counter 表保留作為快取（讀寫平衡）
--   - 替補僅由 event_actions 記錄（無另一張 substitutions 表）
--   - sport 欄位用 string 而非 FK，避免 polymorphic 困擾

-- ── 1. event_actions：統一動作 log ──
CREATE TABLE IF NOT EXISTS public.event_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sport text NOT NULL,                 -- 'basketball' / 'volleyball' / 'badminton'
  stat_id uuid,                         -- 對應運動 stats 表的 row id
  user_id uuid,                         -- 球員 user_id（如有 profile）
  team_label text NOT NULL,
  action_type text NOT NULL,            -- 'sub_in' / 'sub_out' / 'point_2' / 'spike' / 'quarter_end' / ...
  points_delta int NOT NULL DEFAULT 0,
  quarter int,                           -- basketball
  set_number int,                        -- volleyball / badminton
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

-- ── 2. 先發標記 ──
ALTER TABLE public.basketball_stats
  ADD COLUMN IF NOT EXISTS is_starter boolean NOT NULL DEFAULT false;

ALTER TABLE public.volleyball_stats
  ADD COLUMN IF NOT EXISTS is_starter boolean NOT NULL DEFAULT false;

ALTER TABLE public.badminton_stats
  ADD COLUMN IF NOT EXISTS is_starter boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  RAISE NOTICE 'event_actions table created';
  RAISE NOTICE 'is_starter columns added to all 3 stats tables';
END $$;
