CREATE TABLE public.rate_limit_hits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_ip text NOT NULL,
  path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.rate_limit_hits FOR ALL USING (false);

CREATE INDEX idx_rate_limit_hits_lookup ON public.rate_limit_hits (user_id, client_ip, path, created_at DESC);