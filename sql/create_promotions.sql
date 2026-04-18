-- ============================================================================
-- promotions 表：官方帳號發布的推廣資訊（賽事、場地、品牌合作）
-- 在 Supabase Dashboard > SQL Editor 執行
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('event', 'venue', 'brand')),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT,
  location TEXT,
  sport_type TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'draft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引：常用查詢
CREATE INDEX idx_promotions_status ON public.promotions (status);
CREATE INDEX idx_promotions_type ON public.promotions (type);
CREATE INDEX idx_promotions_user_id ON public.promotions (user_id);

-- RLS 政策
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- 所有人可以讀取 active 的推廣資訊
CREATE POLICY "Anyone can read active promotions"
  ON public.promotions
  FOR SELECT
  USING (status = 'active');

-- 發布者可以讀取自己所有狀態的推廣資訊
CREATE POLICY "Users can read own promotions"
  ON public.promotions
  FOR SELECT
  USING (auth.uid() = user_id);

-- 發布者可以建立推廣資訊（前端會檢查 account_type = 'official'）
CREATE POLICY "Users can create promotions"
  ON public.promotions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 發布者可以更新自己的推廣資訊
CREATE POLICY "Users can update own promotions"
  ON public.promotions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 發布者可以刪除自己的推廣資訊
CREATE POLICY "Users can delete own promotions"
  ON public.promotions
  FOR DELETE
  USING (auth.uid() = user_id);
