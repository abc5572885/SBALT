-- 2026-04-19: 場地系統
-- venues: 場地方刊登的場地資訊
-- venue_bookings: 用戶預約時段
-- MVP v1：簡易預約，收費僅記錄（金流等公司登記）

-- 場地表
CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  region TEXT,  -- 縣市區域，用於搜尋（例：新竹縣 竹北）
  sport_types TEXT[] NOT NULL DEFAULT '{}',
  cover_image_url TEXT,
  hourly_rate INTEGER,  -- NT$/小時，null 表不公開
  capacity INTEGER,     -- 可容納人數
  amenities TEXT[] NOT NULL DEFAULT '{}',  -- 停車場/淋浴間/飲水機/置物櫃
  open_hours TEXT,      -- 營業時間說明（free text）
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venues_operator ON public.venues(operator_group_id);
CREATE INDEX IF NOT EXISTS idx_venues_region ON public.venues(region);
CREATE INDEX IF NOT EXISTS idx_venues_status ON public.venues(status);

-- 預約表
CREATE TABLE IF NOT EXISTS public.venue_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_venue_bookings_venue ON public.venue_bookings(venue_id, start_time);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_user ON public.venue_bookings(user_id);

-- RLS
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_bookings ENABLE ROW LEVEL SECURITY;

-- venues: 公開可讀、只有場地方建立者可寫
DROP POLICY IF EXISTS "venues_select_all" ON public.venues;
CREATE POLICY "venues_select_all" ON public.venues
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "venues_insert_operator" ON public.venues;
CREATE POLICY "venues_insert_operator" ON public.venues
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = operator_group_id
        AND creator_id = auth.uid()
        AND type = 'venue_operator'
    )
  );

DROP POLICY IF EXISTS "venues_update_operator" ON public.venues;
CREATE POLICY "venues_update_operator" ON public.venues
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = operator_group_id AND creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "venues_delete_operator" ON public.venues;
CREATE POLICY "venues_delete_operator" ON public.venues
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = operator_group_id AND creator_id = auth.uid()
    )
  );

-- bookings: 公開可讀（看時段）、自己預約、自己取消、場地方可管理
DROP POLICY IF EXISTS "venue_bookings_select_all" ON public.venue_bookings;
CREATE POLICY "venue_bookings_select_all" ON public.venue_bookings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "venue_bookings_insert_own" ON public.venue_bookings;
CREATE POLICY "venue_bookings_insert_own" ON public.venue_bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "venue_bookings_update_own_or_operator" ON public.venue_bookings;
CREATE POLICY "venue_bookings_update_own_or_operator" ON public.venue_bookings
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.venues v
      JOIN public.groups g ON g.id = v.operator_group_id
      WHERE v.id = venue_id AND g.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "venue_bookings_delete_own_or_operator" ON public.venue_bookings;
CREATE POLICY "venue_bookings_delete_own_or_operator" ON public.venue_bookings
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.venues v
      JOIN public.groups g ON g.id = v.operator_group_id
      WHERE v.id = venue_id AND g.creator_id = auth.uid()
    )
  );
