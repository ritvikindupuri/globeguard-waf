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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time overview of your web application firewall</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard icon={Shield} title="Threats Blocked" value={stats.threatsBlocked.toLocaleString()} change="All time" changeType="neutral" variant="primary" />
        <StatCard icon={AlertTriangle} title="Active Threats" value={stats.activeThreats.toString()} change={`${stats.criticalThreats} critical`} changeType={stats.criticalThreats > 0 ? 'negative' : 'positive'} variant="destructive" />
        <StatCard icon={Globe} title="Attack Sources" value={stats.countries.toString()} change="Countries" changeType="neutral" variant="default" />
        <StatCard icon={Zap} title="Avg Response" value="—" change="Proxy mode" changeType="neutral" variant="accent" />
        <StatCard icon={Server} title="Protected Sites" value={stats.protectedSites.toString()} change="Active" changeType="neutral" variant="primary" />
        <StatCard icon={Brain} title="AI Engine" value="Gemini" change="3.1 Pro" changeType="positive" variant="accent" />
      </div>

      {/* Globe + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Live Threat Map</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-glow" />
              <span className="text-[10px] font-mono text-accent">LIVE</span>
            </div>
          </div>
          <ThreatGlobe className="h-[320px]" />
        </div>
        <TrafficChart />
      </div>

      {/* Threats */}
      <ThreatTable />
    </div>
  );
};

export default Index;
