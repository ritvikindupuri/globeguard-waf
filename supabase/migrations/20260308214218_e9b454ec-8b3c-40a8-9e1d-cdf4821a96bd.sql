
-- Create timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Protected sites table
CREATE TABLE public.protected_sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
  threats_blocked INTEGER NOT NULL DEFAULT 0,
  last_check TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ssl_valid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.protected_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sites" ON public.protected_sites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sites" ON public.protected_sites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sites" ON public.protected_sites FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sites" ON public.protected_sites FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_protected_sites_updated_at BEFORE UPDATE ON public.protected_sites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- WAF rules table
CREATE TABLE public.waf_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  pattern TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'block' CHECK (rule_type IN ('block', 'allow', 'challenge', 'log')),
  category TEXT NOT NULL DEFAULT 'custom' CHECK (category IN ('sqli', 'xss', 'rce', 'lfi', 'custom', 'rate_limit', 'geo_block')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.waf_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rules" ON public.waf_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own rules" ON public.waf_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own rules" ON public.waf_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own rules" ON public.waf_rules FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_waf_rules_updated_at BEFORE UPDATE ON public.waf_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Threat logs table
CREATE TABLE public.threat_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  site_id UUID REFERENCES public.protected_sites(id) ON DELETE SET NULL,
  source_ip TEXT NOT NULL,
  source_country TEXT,
  source_lat DOUBLE PRECISION,
  source_lng DOUBLE PRECISION,
  threat_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  action_taken TEXT NOT NULL DEFAULT 'blocked' CHECK (action_taken IN ('blocked', 'challenged', 'logged', 'allowed')),
  request_path TEXT,
  request_method TEXT,
  user_agent TEXT,
  rule_id UUID REFERENCES public.waf_rules(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.threat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own threat logs" ON public.threat_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own threat logs" ON public.threat_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_threat_logs_created_at ON public.threat_logs (created_at DESC);
CREATE INDEX idx_threat_logs_site_id ON public.threat_logs (site_id);
CREATE INDEX idx_threat_logs_severity ON public.threat_logs (severity);

-- WAF settings table
CREATE TABLE public.waf_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  paranoia_level INTEGER NOT NULL DEFAULT 1 CHECK (paranoia_level BETWEEN 1 AND 4),
  default_action TEXT NOT NULL DEFAULT 'block' CHECK (default_action IN ('block', 'challenge', 'log')),
  webhook_url TEXT,
  alert_email TEXT,
  ai_detection_enabled BOOLEAN NOT NULL DEFAULT true,
  rate_limiting_enabled BOOLEAN NOT NULL DEFAULT true,
  api_protection_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.waf_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings" ON public.waf_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own settings" ON public.waf_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON public.waf_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_waf_settings_updated_at BEFORE UPDATE ON public.waf_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
