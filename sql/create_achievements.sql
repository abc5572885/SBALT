-- 2026-04-19: 成就系統
-- achievements: 所有可解鎖的成就（全系統共用）
-- user_achievements: 每個用戶解鎖的成就 + 時間

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 確保既有表也有 sort_order（如果表已存在於舊 schema）
ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "achievements_select_all" ON public.achievements;
CREATE POLICY "achievements_select_all" ON public.achievements
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_achievements_select_own" ON public.user_achievements;
CREATE POLICY "user_achievements_select_own" ON public.user_achievements
  FOR SELECT USING (true);  -- 公開可讀（他人頁可看別人成就）

DROP POLICY IF EXISTS "user_achievements_insert_own" ON public.user_achievements;
CREATE POLICY "user_achievements_insert_own" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 種子資料
INSERT INTO public.achievements (key, title, description, icon, category, threshold, sort_order) VALUES
  ('organize_1',   '初次揪團',       '舉辦第一場活動',   'bolt.fill',          'organize', 1,   1),
  ('organize_10',  '熱心揪主',       '舉辦 10 場活動',   'bolt.fill',          'organize', 10,  2),
  ('organize_50',  '活動達人',       '舉辦 50 場活動',   'bolt.fill',          'organize', 50,  3),
  ('organize_100', '傳奇組織者',     '舉辦 100 場活動',  'bolt.fill',          'organize', 100, 4),

  ('join_1',       '首次出賽',       '參加第一場活動',   'sportscourt.fill',   'join',     1,   5),
  ('join_10',      '活躍球友',       '參加 10 場活動',   'sportscourt.fill',   'join',     10,  6),
  ('join_50',      '常客',           '參加 50 場活動',   'sportscourt.fill',   'join',     50,  7),
  ('join_100',     '鐵人',           '參加 100 場活動',  'sportscourt.fill',   'join',     100, 8),

  ('score_10',    '得分者',          '累計得分 10 分',   'star.fill',          'score',    10,  9),
  ('score_100',   '百分先生',        '累計得分 100 分',  'star.fill',          'score',    100, 10),
  ('score_500',   '得分機器',        '累計得分 500 分',  'star.fill',          'score',    500, 11),

  ('group_1',     '社群創辦人',      '建立第一個群組',   'person.fill',        'group',    1,   12),
  ('group_5',     '社群經營者',      '建立 5 個群組',    'person.fill',        'group',    5,   13)
ON CONFLICT (key) DO NOTHING;
