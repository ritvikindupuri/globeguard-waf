INSERT INTO public.waf_rules (user_id, name, description, pattern, category, rule_type, severity, priority, enabled)
SELECT ps.user_id, r.name, r.description, r.pattern, r.category, r.rule_type, r.severity, r.priority, true
FROM public.protected_sites ps
CROSS JOIN (VALUES
  ('SQL Injection - Basic', 'Blocks common SQL injection patterns', '(''|--|;|\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b)', 'sqli', 'block', 'critical', 1),
  ('SQL Injection - Advanced', 'Blocks advanced SQLi techniques', '(\b(CONCAT|CHAR|CONVERT|CAST|SUBSTRING|ASCII|ORD|HEX|UNHEX|BENCHMARK|SLEEP|WAITFOR)\b\s*\()', 'sqli', 'block', 'high', 2),
  ('XSS - Script Tags', 'Blocks script injection attempts', '(<script[\s>]|javascript:|on(error|load|click|mouseover|focus|blur)\s*=)', 'xss', 'block', 'high', 3),
  ('XSS - Event Handlers', 'Blocks XSS via HTML event handlers', '(<img[^>]+onerror|<svg[^>]+onload|<body[^>]+onload|<iframe|<object|<embed)', 'xss', 'block', 'high', 4),
  ('RCE - Command Injection', 'Blocks OS command injection', '(;\s*(cat|ls|rm|wget|curl|nc|bash|sh|python|perl|ruby)\b|`[^`]+`|\$\(|\|\||\&\&)', 'rce', 'block', 'critical', 5),
  ('LFI - Path Traversal', 'Blocks local file inclusion attempts', '(\.\./|\.\.\\|/etc/(passwd|shadow|hosts)|/proc/self|/var/log)', 'lfi', 'block', 'critical', 6),
  ('SSRF - Internal Access', 'Blocks server-side request forgery', '(169\.254\.169\.254|127\.0\.0\.1|localhost|0\.0\.0\.0|::1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.)', 'custom', 'block', 'critical', 7),
  ('User-Agent Bot Block', 'Blocks known malicious bots', '(sqlmap|nikto|nmap|masscan|dirbuster|gobuster|wfuzz|hydra|metasploit)', 'custom', 'block', 'medium', 8)
) AS r(name, description, pattern, category, rule_type, severity, priority)
WHERE NOT EXISTS (SELECT 1 FROM public.waf_rules WHERE waf_rules.user_id = ps.user_id)
LIMIT 8;