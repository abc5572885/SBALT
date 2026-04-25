-- 2026-04-25: 補 RLS 讓被標記者可更新自己在 check-in 的 partner 狀態
-- 不然被標記者無法接受/拒絕標記

DROP POLICY IF EXISTS "checkins_update_partner" ON public.check_ins;
CREATE POLICY "checkins_update_partner" ON public.check_ins
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(partners, '[]'::jsonb)) AS p
      WHERE p->>'user_id' = auth.uid()::text
    )
  );
