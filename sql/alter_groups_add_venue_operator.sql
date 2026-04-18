-- 2026-04-19: 加入 venue_operator 群組類型（場地方）
-- 民間場地租借業者 / 國民運動中心 / 公部門場地 都屬於此類
-- 與 competition_org 一樣限 official 帳號才能建立

-- 1) 更新 type 檢查約束（加入 venue_operator）
ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_type_check;
ALTER TABLE public.groups ADD CONSTRAINT groups_type_check
  CHECK (type IN ('casual', 'competition_org', 'team', 'venue_operator'));

-- 2) 更新 trigger：把 venue_operator 一併納入 official-only 限制
CREATE OR REPLACE FUNCTION public.enforce_competition_org_official()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type IN ('competition_org', 'venue_operator') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = NEW.creator_id
        AND account_type = 'official'
    ) THEN
      RAISE EXCEPTION 'Only official accounts can create % groups', NEW.type;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
