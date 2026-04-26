-- 2026-04-26: Venue Phase 1 — RLS policy reset
--
-- 目標：venues table 允許兩種 INSERT：
-- A. 商家／群組創建的場地（operator_group_id 是用戶擁有的群組）
-- B. 公共地標（用戶在 Google POI 建活動時自動 upsert）
--
-- 執行此 SQL 會清除舊的 INSERT policy，重建乾淨版本。
-- 只動 INSERT policy，不動 SELECT / UPDATE / DELETE。

-- ── 1. 印出當前所有政策（執行時 console 會顯示） ──
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== Current policies on venues BEFORE cleanup ===';
  FOR r IN
    SELECT polname, polcmd, polpermissive
    FROM pg_policy
    WHERE polrelid = 'public.venues'::regclass
    ORDER BY polcmd, polname
  LOOP
    RAISE NOTICE '  %  cmd=%  permissive=%', r.polname, r.polcmd, r.polpermissive;
  END LOOP;
END $$;

-- ── 2. Drop 所有 INSERT policy（避免新舊衝突） ──
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.venues'::regclass
      AND polcmd = 'a' -- INSERT
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.venues', r.polname);
    RAISE NOTICE 'Dropped INSERT policy: %', r.polname;
  END LOOP;
END $$;

-- ── 3. 重建乾淨的 INSERT policies ──

-- A. 商家／群組擁有的 venue
CREATE POLICY "venues_insert_by_operator"
ON public.venues
FOR INSERT
TO authenticated
WITH CHECK (
  operator_group_id IS NOT NULL
  AND operator_group_id IN (
    SELECT id FROM public.groups WHERE creator_id = auth.uid()
  )
);

-- B. 公共地標（Google POI 自動 upsert）
CREATE POLICY "venues_insert_public_landmark"
ON public.venues
FOR INSERT
TO authenticated
WITH CHECK (
  is_public_landmark = TRUE
  AND operator_group_id IS NULL
  AND google_place_id IS NOT NULL
);

-- ── 4. 確認新狀態 ──
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== Policies on venues AFTER cleanup ===';
  FOR r IN
    SELECT polname, polcmd, polpermissive
    FROM pg_policy
    WHERE polrelid = 'public.venues'::regclass
    ORDER BY polcmd, polname
  LOOP
    RAISE NOTICE '  %  cmd=%  permissive=%', r.polname, r.polcmd, r.polpermissive;
  END LOOP;
END $$;
