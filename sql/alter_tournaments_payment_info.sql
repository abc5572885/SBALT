-- 2026-04-19: 賽事加付款方式說明欄
-- 真金流尚未串接前，先讓比賽方填文字說明（例：現場付現 / 匯款 008-1234... / LINE Pay @sbalt）

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS payment_info TEXT;
