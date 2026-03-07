import { useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Code, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WAFRule {
  id: string;
  name: string;
  description: string;
  type: 'regex' | 'rate_limit' | 'geo_block' | 'ip_reputation' | 'custom';
  enabled: boolean;
  action: 'block' | 'challenge' | 'log' | 'allow';
  pattern?: string;
  priority: number;
  hits: number;
}

const TYPE_LABELS: Record<string, string> = {
  regex: 'REGEX',
  rate_limit: 'RATE LIMIT',
  geo_block: 'GEO BLOCK',
  ip_reputation: 'IP REPUTATION',
  custom: 'CUSTOM',
};

const ACTION_LABELS: Record<string, string> = {
  block: 'BLOCK',
  challenge: 'CHALLENGE',
  log: 'LOG',
  allow: 'ALLOW',
};

const typeStyles: Record<string, string> = {
  regex: 'bg-primary/10 text-primary border-primary/30',
  rate_limit: 'bg-warning/10 text-warning border-warning/30',
  geo_block: 'bg-destructive/10 text-destructive border-destructive/30',
  ip_reputation: 'bg-threat-high/10 text-threat-high border-threat-high/30',
  custom: 'bg-accent/10 text-accent border-accent/30',
};

const INITIAL_RULES: WAFRule[] = [
  { id: '1', name: 'SQL Injection Prevention', description: 'Blocks common SQL injection patterns including UNION, OR 1=1, etc.', type: 'regex', enabled: true, action: 'block', pattern: '(\\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\\b|--|;|\\bOR\\b\\s+\\d+=\\d+)', priority: 1, hits: 4521 },
  { id: '2', name: 'XSS Filter', description: 'Detects and blocks cross-site scripting attempts', type: 'regex', enabled: true, action: 'block', pattern: '(<script[^>]*>|javascript:|on\\w+\\s*=|<iframe)', priority: 2, hits: 2847 },
  { id: '3', name: 'API Rate Limiter', description: '100 requests per minute per IP for API endpoints', type: 'rate_limit', enabled: true, action: 'challenge', priority: 3, hits: 8924 },
  { id: '4', name: 'Block Sanctioned Countries', description: 'Block traffic from sanctioned regions', type: 'geo_block', enabled: true, action: 'block', priority: 4, hits: 1204 },
  { id: '5', name: 'Tor Exit Node Blocking', description: 'Block known Tor exit nodes and anonymous proxies', type: 'ip_reputation', enabled: true, action: 'block', priority: 5, hits: 672 },
  { id: '6', name: 'Path Traversal Prevention', description: 'Blocks directory traversal attempts', type: 'regex', enabled: true, action: 'block', pattern: '(\\.\\./|\\.\\\\|%2e%2e)', priority: 6, hits: 1893 },
  { id: '7', name: 'Bot Fingerprinting', description: 'AI-powered bot detection using behavioral analysis', type: 'custom', enabled: true, action: 'challenge', priority: 7, hits: 5410 },
  { id: '8', name: 'Command Injection Shield', description: 'Prevents OS command injection via user inputs', type: 'regex', enabled: true, action: 'block', pattern: '(;|\\||`|\\$\\(|&&|\\bexec\\b|\\bsystem\\b)', priority: 8, hits: 345 },
];

export default function RuleEngine() {
  const [rules, setRules] = useState<WAFRule[]>(INITIAL_RULES);
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    const rule = rules.find(r => r.id === id);
    toast.success(`${rule?.name} ${rule?.enabled ? 'disabled' : 'enabled'}`);
  };

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success('Rule deleted');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Rule Engine</h2>
          <p className="text-xs text-muted-foreground font-mono">{rules.filter(r => r.enabled).length} of {rules.length} rules active</p>
        </div>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1" /> New Rule
        </Button>
      </div>

      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className={cn(
            "bg-card border rounded-lg transition-all",
            rule.enabled ? 'border-border' : 'border-border/50 opacity-60'
          )}>
            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(expanded === rule.id ? null : rule.id)}>
              <div className="flex items-center gap-3">
                <button onClick={(e) => { e.stopPropagation(); toggleRule(rule.id); }}>
                  {rule.enabled ? (
                    <ToggleRight className="w-6 h-6 text-accent" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                  )}
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{rule.name}</p>
                    <span className={cn("px-2 py-0.5 rounded text-[9px] font-mono uppercase border", typeStyles[rule.type])}>
                      {TYPE_LABELS[rule.type]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-mono text-muted-foreground">HITS</p>
                  <p className="text-sm font-bold font-mono text-foreground">{rule.hits.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono text-muted-foreground">ACTION</p>
                  <p className="text-xs font-mono text-foreground">{ACTION_LABELS[rule.action]}</p>
                </div>
                {expanded === rule.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            {expanded === rule.id && (
              <div className="px-4 pb-4 border-t border-border/50 pt-3">
                {rule.pattern && (
                  <div className="mb-3">
                    <p className="text-[10px] font-mono text-muted-foreground mb-1">PATTERN</p>
                    <code className="block bg-secondary/50 rounded px-3 py-2 text-xs font-mono text-primary break-all">
                      {rule.pattern}
                    </code>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground">
                    <Code className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => deleteRule(rule.id)}>
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
