-- 2026-04-19: 新增社群連結 + avatar_url 欄位到 profiles
-- avatar_url：目前存 auth.users.user_metadata，其他用戶看不到，需鏡像到 profiles
-- 社群連結：opt-in，預設 NULL，用戶自填才顯示

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS line_id TEXT;
