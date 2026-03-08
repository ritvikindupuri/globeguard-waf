import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';

type ThreatLog = Tables<'threat_logs'>;

const severityStyles: Record<string, string> = {
  critical: 'bg-threat-critical/15 text-threat-critical border-threat-critical/30',
  high: 'bg-threat-high/15 text-threat-high border-threat-high/30',
  medium: 'bg-threat-medium/15 text-threat-medium border-threat-medium/30',
  low: 'bg-threat-low/15 text-threat-low border-threat-low/30',
};

const actionStyles: Record<string, string> = {
  blocked: 'bg-destructive/15 text-destructive border-destructive/30',
  challenged: 'bg-warning/15 text-warning border-warning/30',
  logged: 'bg-primary/15 text-primary border-primary/30',
  allowed: 'bg-accent/15 text-accent border-accent/30',
};

export default function ThreatTable() {
  const { user } = useAuth();
  const [threats, setThreats] = useState<ThreatLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadThreats();
  }, [user]);

  const loadThreats = async () => {
    const { data, error } = await supabase
      .from('threat_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error) setThreats(data || []);
    setLoading(false);
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Recent Threats</h3>
        <span className="text-xs font-mono text-muted-foreground">
          {threats.length > 0 ? `${threats.length} logged` : 'No threats yet'}
        </span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-muted-foreground">Loading...</div>
      ) : threats.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-sm text-muted-foreground">No threats logged yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add a protected site, then use AI Detection to analyze incoming traffic
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/20">
                <th className="text-left px-5 py-2.5 text-muted-foreground font-medium font-mono text-[10px] tracking-wider">TIME</th>
                <th className="text-left px-5 py-2.5 text-muted-foreground font-medium font-mono text-[10px] tracking-wider">SOURCE</th>
                <th className="text-left px-5 py-2.5 text-muted-foreground font-medium font-mono text-[10px] tracking-wider">TYPE</th>
                <th className="text-left px-5 py-2.5 text-muted-foreground font-medium font-mono text-[10px] tracking-wider">SEVERITY</th>
                <th className="text-left px-5 py-2.5 text-muted-foreground font-medium font-mono text-[10px] tracking-wider">ACTION</th>
                <th className="text-left px-5 py-2.5 text-muted-foreground font-medium font-mono text-[10px] tracking-wider">TARGET</th>
              </tr>
            </thead>
            <tbody>
              {threats.map((t) => (
                <tr key={t.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                  <td className="px-5 py-3 text-muted-foreground font-mono">
                    {new Date(t.created_at).toLocaleTimeString()}
                  </td>
                  <td className="px-5 py-3 font-mono">
                    <span className="text-foreground">{t.source_ip}</span>
                    {t.source_country && <span className="text-muted-foreground ml-1.5">({t.source_country})</span>}
                  </td>
                  <td className="px-5 py-3 text-foreground">{t.threat_type}</td>
                  <td className="px-5 py-3">
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] uppercase border font-mono font-medium", severityStyles[t.severity] || severityStyles.low)}>
                      {t.severity}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] uppercase border font-mono font-medium", actionStyles[t.action_taken] || actionStyles.logged)}>
                      {t.action_taken}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground max-w-[200px] truncate font-mono">
                    {t.request_path || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
