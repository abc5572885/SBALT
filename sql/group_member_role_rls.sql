-- 2026-04-27: group_members RLS — 支援隊長/副隊長管理
--
-- 需求：
--   1. INSERT 自己（join group via invite_code）— 既有 policy 應該已支援
--   2. UPDATE role：只有 group creator (隊長) 可改任何成員的 role
--   3. DELETE 成員：
--      - creator 可刪任何人（除自己）
--      - admin (副隊長) 可刪 role='member' 但不能刪別的 admin / creator
--      - 用戶可刪自己（leave group）
--
-- 執行：清掉舊的 UPDATE / DELETE policy，重建乾淨版本。INSERT / SELECT 不動。

-- ── 1. 印出 BEFORE 狀態 ──
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== group_members policies BEFORE ===';
  FOR r IN
    SELECT polname, polcmd
    FROM pg_policy
    WHERE polrelid = 'public.group_members'::regclass
    ORDER BY polcmd, polname
  LOOP
    RAISE NOTICE '  %  cmd=%', r.polname, r.polcmd;
  END LOOP;
END $$;

-- ── 2. 清掉所有 UPDATE / DELETE policy ──
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.group_members'::regclass
      AND polcmd IN ('w', 'd') -- UPDATE / DELETE
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.group_members', r.polname);
    RAISE NOTICE 'Dropped: %', r.polname;
  END LOOP;
END $$;

-- ── 3. UPDATE：只有隊長（group creator）能改 role ──
CREATE POLICY "group_members_update_role_by_captain"
ON public.group_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id AND g.creator_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id AND g.creator_id = auth.uid()
  )
);

-- ── 4. DELETE：creator 可刪任何成員；admin 可刪 member；自己可刪自己 ──
CREATE POLICY "group_members_delete_by_captain_or_self"
ON public.group_members
FOR DELETE
TO authenticated
USING (
  -- 自己離開
  user_id = auth.uid()
  OR
  -- 隊長踢人（不能踢自己 — 隊長要先轉讓才能離開，由前端阻擋）
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id AND g.creator_id = auth.uid()
  )
  OR
  -- 副隊長踢一般成員（不能踢別的副隊長 / 隊長 / 自己）
  (
    group_members.role = 'member'
    AND group_members.user_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_members me
      WHERE me.group_id = group_members.group_id
        AND me.user_id = auth.uid()
        AND me.role = 'admin'
    )
    AND group_members.user_id <> (
      SELECT creator_id FROM public.groups WHERE id = group_members.group_id
    )
  )
);

-- ── 5. AFTER 狀態 ──
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== group_members policies AFTER ===';
  FOR r IN
    SELECT polname, polcmd
    FROM pg_policy
    WHERE polrelid = 'public.group_members'::regclass
    ORDER BY polcmd, polname
  LOOP
    RAISE NOTICE '  %  cmd=%', r.polname, r.polcmd;
  END LOOP;
END $$;
