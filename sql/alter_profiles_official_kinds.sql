-- 2026-04-19: official 帳號細分角色（可多選）
-- 一個官方可同時是品牌 + 比賽方 + 場地方（例如 Nike 辦自己的籃球賽）
-- Fan 手動在此設定誰是什麼角色

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS official_kinds TEXT[] NOT NULL DEFAULT '{}'
    CHECK (
      official_kinds <@ ARRAY['competition','venue','brand']::TEXT[]
    );

CREATE INDEX IF NOT EXISTS idx_profiles_official_kinds ON public.profiles USING GIN(official_kinds);

-- Fan 自己（SBALT 創辦人）全部角色都開
-- 請替換成你自己的 auth.users.id
-- UPDATE public.profiles
-- SET official_kinds = ARRAY['competition','venue','brand']
-- WHERE account_type = 'official';

-- 更新 trigger：不只檢查 official，還要檢查具體 kind
CREATE OR REPLACE FUNCTION public.enforce_competition_org_official()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  kinds TEXT[];
  acct_type TEXT;
BEGIN
  IF NEW.type IN ('competition_org', 'venue_operator') THEN
    SELECT account_type, official_kinds INTO acct_type, kinds
    FROM public.profiles WHERE id = NEW.creator_id;

    IF acct_type IS DISTINCT FROM 'official' THEN
      RAISE EXCEPTION 'Only official accounts can create % groups', NEW.type;
    END IF;

    IF NEW.type = 'competition_org' AND NOT ('competition' = ANY(COALESCE(kinds, '{}'))) THEN
      RAISE EXCEPTION 'Official account lacks competition kind';
    END IF;
    IF NEW.type = 'venue_operator' AND NOT ('venue' = ANY(COALESCE(kinds, '{}'))) THEN
      RAISE EXCEPTION 'Official account lacks venue kind';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
