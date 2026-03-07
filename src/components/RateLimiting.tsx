import { useState } from 'react';
import { Zap, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import StatCard from './StatCard';

interface RateLimitRule {
  id: string;
  name: string;
  path: string;
  limit: number;
  window: string;
  action: 'block' | 'challenge' | 'throttle';
  enabled: boolean;
  triggered: number;
}

const RULES: RateLimitRule[] = [
  { id: '1', name: 'Global API Limit', path: '/api/*', limit: 1000, window: '1 min', action: 'throttle', enabled: true, triggered: 4521 },
  { id: '2', name: 'Auth Endpoint', path: '/api/auth/*', limit: 10, window: '1 min', action: 'block', enabled: true, triggered: 892 },
  { id: '3', name: 'Search Rate Limit', path: '/api/search', limit: 30, window: '1 min', action: 'challenge', enabled: true, triggered: 1204 },
  { id: '4', name: 'File Upload', path: '/api/upload', limit: 5, window: '5 min', action: 'block', enabled: true, triggered: 156 },
  { id: '5', name: 'Payment Endpoints', path: '/api/payments/*', limit: 20, window: '1 min', action: 'block', enabled: true, triggered: 67 },
];

const actionStyles = {
  block: 'text-destructive',
  challenge: 'text-warning',
  throttle: 'text-primary',
};

export default function RateLimiting() {
  const [rules, setRules] = useState(RULES);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    toast.success('Rate limit rule updated');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Rate Limiting</h2>
          <p className="text-xs text-muted-foreground font-mono">DDOS PROTECTION • REQUEST THROTTLING • ABUSE PREVENTION</p>
        </div>
        <Button size="sm" className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-1" /> Add Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard icon={Zap} title="Rate Limited" value="6,840" change="Today" changeType="neutral" variant="warning" />
        <StatCard icon={Zap} title="DDoS Mitigated" value="3" change="Attacks today" changeType="negative" variant="destructive" />
        <StatCard icon={Zap} title="Avg Response" value="12ms" change="-2ms from yesterday" changeType="positive" variant="primary" />
      </div>

      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className={cn(
            "bg-card border border-border rounded-lg p-4 flex items-center justify-between transition-all",
            !rule.enabled && 'opacity-50'
          )}>
            <div className="flex items-center gap-3">
              <button onClick={() => toggleRule(rule.id)}>
                {rule.enabled ? <ToggleRight className="w-6 h-6 text-accent" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
              </button>
              <div>
                <p className="text-sm font-semibold text-foreground">{rule.name}</p>
                <p className="text-xs font-mono text-muted-foreground">{rule.path}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-mono text-muted-foreground">LIMIT</p>
                <p className="text-sm font-mono text-foreground">{rule.limit} / {rule.window}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-mono text-muted-foreground">ACTION</p>
                <p className={cn("text-xs font-mono uppercase", actionStyles[rule.action])}>{rule.action}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-mono text-muted-foreground">TRIGGERED</p>
                <p className="text-sm font-bold font-mono text-foreground">{rule.triggered.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
