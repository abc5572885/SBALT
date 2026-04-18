-- 2026-04-19: 群組加上類型分類
-- 區分揪打群 / 比賽方 / 球隊，為未來賽事系統鋪路
-- casual:           揪打群（現有，預設）
-- competition_org:  比賽方（賽事主辦單位，會發布賽事）
-- team:             球隊（固定班底，半競技）

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'casual'
    CHECK (type IN ('casual', 'competition_org', 'team'));

CREATE INDEX IF NOT EXISTS idx_groups_type ON public.groups(type);
