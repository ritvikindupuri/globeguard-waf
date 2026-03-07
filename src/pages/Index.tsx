import { Shield, AlertTriangle, Globe, Zap, Server, Brain } from 'lucide-react';
import StatCard from '@/components/StatCard';
import TrafficChart from '@/components/TrafficChart';
import ThreatTable from '@/components/ThreatTable';
import ThreatGlobe from '@/components/ThreatGlobe';

const Index = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-xs font-mono text-muted-foreground mt-1">AEGIS WAF • REAL-TIME THREAT MONITORING</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <StatCard icon={Shield} title="Threats Blocked" value="24,847" change="+12% today" changeType="positive" variant="primary" />
        <StatCard icon={AlertTriangle} title="Active Threats" value="7" change="3 critical" changeType="negative" variant="destructive" />
        <StatCard icon={Globe} title="Countries" value="142" change="Sources detected" changeType="neutral" variant="default" />
        <StatCard icon={Zap} title="Avg Response" value="8ms" change="-3ms vs avg" changeType="positive" variant="accent" />
        <StatCard icon={Server} title="Protected Sites" value="3" change="All healthy" changeType="positive" variant="primary" />
        <StatCard icon={Brain} title="AI Accuracy" value="99.2%" change="+0.3% weekly" changeType="positive" variant="accent" />
      </div>

      {/* Globe + Chart row */}
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

      {/* Threat Table */}
      <ThreatTable />
    </div>
  );
};

export default Index;
