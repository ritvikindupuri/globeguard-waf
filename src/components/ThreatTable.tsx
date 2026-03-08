import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';

type ThreatLog = Tables<'threat_logs'>;

const severityStyles: Record<string, string> = {
  critical: 'bg-threat-critical/10 text-threat-critical border-threat-critical/30',
  high: 'bg-threat-high/10 text-threat-high border-threat-high/30',
  medium: 'bg-threat-medium/10 text-threat-medium border-threat-medium/30',
  low: 'bg-threat-low/10 text-threat-low border-threat-low/30',
};

const actionStyles: Record<string, string> = {
  blocked: 'bg-destructive/10 text-destructive border-destructive/30',
  challenged: 'bg-warning/10 text-warning border-warning/30',
  logged: 'bg-primary/10 text-primary border-primary/30',
  allowed: 'bg-accent/10 text-accent border-accent/30',
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
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Recent Threats</h3>
        <span className="text-xs font-mono text-muted-foreground">
          {threats.length > 0 ? `${threats.length} LOGGED` : 'NO THREATS YET'}
        </span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-mono text-muted-foreground">Loading threats...</div>
      ) : threats.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No threats logged yet</p>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Use the AI Detection page to analyze requests and generate threat data
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">TIME</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">SOURCE</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">TYPE</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">SEVERITY</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">ACTION</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">TARGET</th>
              </tr>
            </thead>
            <tbody>
              {threats.map((t) => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {new Date(t.created_at).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-foreground">{t.source_ip}</span>
                    {t.source_country && (
                      <span className="text-muted-foreground ml-2">({t.source_country})</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-foreground">{t.threat_type}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase border", severityStyles[t.severity] || severityStyles.low)}>
                      {t.severity}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase border", actionStyles[t.action_taken] || actionStyles.logged)}>
                      {t.action_taken}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">
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
