import { useEffect, useState } from 'react';
import ThreatTable from '@/components/ThreatTable';
import StatCard from '@/components/StatCard';
import { AlertTriangle, Shield, Globe, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function ThreatsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ active: 0, blocked: 0, sources: 0, critical: 0 });

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user]);

  const loadStats = async () => {
    const { data } = await supabase
      .from('threat_logs')
      .select('severity, action_taken, source_country');

    if (!data) return;

    const countries = new Set(data.map(t => t.source_country).filter(Boolean));
    setStats({
      active: data.filter(t => t.severity === 'critical' || t.severity === 'high').length,
      blocked: data.filter(t => t.action_taken === 'blocked').length,
      sources: countries.size,
      critical: data.filter(t => t.severity === 'critical').length,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Threat Intelligence</h1>
        <p className="text-xs font-mono text-muted-foreground mt-1">REAL-TIME THREAT FEED • AI-ANALYZED • DATABASE-BACKED</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard icon={AlertTriangle} title="Active Threats" value={stats.active.toString()} change={`${stats.critical} critical`} changeType={stats.critical > 0 ? 'negative' : 'positive'} variant="destructive" />
        <StatCard icon={Shield} title="Blocked" value={stats.blocked.toString()} change="Total blocked" changeType="positive" variant="primary" />
        <StatCard icon={Globe} title="Attack Sources" value={stats.sources.toString()} change="Countries" changeType="neutral" variant="default" />
        <StatCard icon={Activity} title="Threat Score" value={stats.critical > 2 ? 'HIGH' : stats.active > 0 ? 'MEDIUM' : 'LOW'} change="Based on data" changeType={stats.critical > 0 ? 'negative' : 'positive'} variant="warning" />
      </div>
      <ThreatTable />
    </div>
  );
}
