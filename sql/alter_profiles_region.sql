-- 2026-04-18: 新增活動區域欄位到 profiles
-- 使用者在 onboarding 或個人運動資料頁選擇常駐活動區域
-- 用於：活動推薦、同區域用戶媒合

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS region TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_region ON public.profiles(region);
