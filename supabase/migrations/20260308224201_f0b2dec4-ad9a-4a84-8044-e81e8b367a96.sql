UPDATE public.waf_rules 
SET pattern = '(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b.*\b(FROM|INTO|TABLE|WHERE|SET)\b|''\s*(OR|AND)\s*''|''\s*(OR|AND)\s*\d|;\s*(DROP|DELETE|UPDATE|INSERT)\b)'
WHERE name = 'SQL Injection - Basic';

UPDATE public.waf_rules 
SET pattern = '(\b(CONCAT|CHAR|CONVERT|CAST)\b\s*\(.*\b(SELECT|FROM|WHERE)\b|\b(BENCHMARK|SLEEP|WAITFOR)\b\s*\(|\b(UNION)\b\s+(ALL\s+)?\bSELECT\b)'
WHERE name = 'SQL Injection - Advanced';