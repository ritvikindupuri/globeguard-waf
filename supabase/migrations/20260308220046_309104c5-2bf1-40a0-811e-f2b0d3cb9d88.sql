
-- Rate limit rules table
CREATE TABLE public.rate_limit_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  path text NOT NULL,
  max_requests integer NOT NULL DEFAULT 100,
  window_seconds integer NOT NULL DEFAULT 60,
  action text NOT NULL DEFAULT 'block',
  enabled boolean NOT NULL DEFAULT true,
  triggered_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limit_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limit rules" ON public.rate_limit_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rate limit rules" ON public.rate_limit_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rate limit rules" ON public.rate_limit_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rate limit rules" ON public.rate_limit_rules FOR DELETE USING (auth.uid() = user_id);

-- API endpoints table
CREATE TABLE public.api_endpoints (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  method text NOT NULL DEFAULT 'GET',
  path text NOT NULL,
  schema_validation boolean NOT NULL DEFAULT false,
  jwt_inspection boolean NOT NULL DEFAULT false,
  rate_limited boolean NOT NULL DEFAULT false,
  requests_today integer NOT NULL DEFAULT 0,
  blocked_today integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.api_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api endpoints" ON public.api_endpoints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own api endpoints" ON public.api_endpoints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own api endpoints" ON public.api_endpoints FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own api endpoints" ON public.api_endpoints FOR DELETE USING (auth.uid() = user_id);
