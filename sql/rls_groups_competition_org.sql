-- 2026-04-19: RLS 限制 competition_org 群組只能由 official 帳號建立
-- 防止 client-side 繞過；用 trigger 檢查 profiles.account_type

CREATE OR REPLACE FUNCTION public.enforce_competition_org_official()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'competition_org' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = NEW.creator_id
        AND account_type = 'official'
    ) THEN
      RAISE EXCEPTION 'Only official accounts can create competition_org groups';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_competition_org_official_insert ON public.groups;
CREATE TRIGGER enforce_competition_org_official_insert
  BEFORE INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.enforce_competition_org_official();

DROP TRIGGER IF EXISTS enforce_competition_org_official_update ON public.groups;
CREATE TRIGGER enforce_competition_org_official_update
  BEFORE UPDATE OF type ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.enforce_competition_org_official();
