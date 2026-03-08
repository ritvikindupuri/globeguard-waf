import { Shield, AlertTriangle, Globe, Zap, Server, Brain } from 'lucide-react';
import { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import TrafficChart from '@/components/TrafficChart';
import ThreatTable from '@/components/ThreatTable';
import ThreatGlobe from '@/components/ThreatGlobe';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    threatsBlocked: 0,
    activeThreats: 0,
    countries: 0,
    protectedSites: 0,
    criticalThreats: 0,
  });

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user]);

  const loadStats = async () => {
    const [sitesRes, threatsRes] = await Promise.all([
      supabase.from('protected_sites').select('id, threats_blocked'),
      supabase.from('threat_logs').select('id, severity, source_country'),
    ]);

    const sites = sitesRes.data || [];
    const threats = threatsRes.data || [];
    const countries = new Set(threats.map(t => t.source_country).filter(Boolean));

    setStats({
      threatsBlocked: sites.reduce((sum, s) => sum + s.threats_blocked, 0) + threats.length,
      activeThreats: threats.filter(t => t.severity === 'critical' || t.severity === 'high').length,
      countries: countries.size,
      protectedSites: sites.length,
      criticalThreats: threats.filter(t => t.severity === 'critical').length,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-xs font-mono text-muted-foreground mt-1">DEFLECTRA WAF • REAL-TIME THREAT MONITORING</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <StatCard icon={Shield} title="Threats Blocked" value={stats.threatsBlocked.toLocaleString()} change="From database" changeType="neutral" variant="primary" />
        <StatCard icon={AlertTriangle} title="Active Threats" value={stats.activeThreats.toString()} change={`${stats.criticalThreats} critical`} changeType={stats.criticalThreats > 0 ? 'negative' : 'positive'} variant="destructive" />
        <StatCard icon={Globe} title="Countries" value={stats.countries.toString()} change="Attack sources" changeType="neutral" variant="default" />
        <StatCard icon={Zap} title="Avg Response" value="—" change="Proxy required" changeType="neutral" variant="accent" />
        <StatCard icon={Server} title="Protected Sites" value={stats.protectedSites.toString()} change="From database" changeType="neutral" variant="primary" />
        <StatCard icon={Brain} title="AI Engine" value="Gemini" change="gemini-3-flash" changeType="positive" variant="accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Live Threat Map</h3>
            <span className="text-[10px] font-mono text-accent animate-pulse-glow">● LIVE</span>
          </div>
          <ThreatGlobe className="h-[320px]" />
        </div>
        <TrafficChart />
      </div>

      <ThreatTable />
    </div>
  );
};

export default Index;
