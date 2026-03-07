import ThreatTable from '@/components/ThreatTable';
import StatCard from '@/components/StatCard';
import { AlertTriangle, Shield, Globe, Activity } from 'lucide-react';

export default function ThreatsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Threat Intelligence</h1>
        <p className="text-xs font-mono text-muted-foreground mt-1">REAL-TIME THREAT FEED • IP REPUTATION • ATTACK PATTERNS</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard icon={AlertTriangle} title="Active Threats" value="7" change="3 critical" changeType="negative" variant="destructive" />
        <StatCard icon={Shield} title="Blocked Today" value="24,847" change="+12%" changeType="positive" variant="primary" />
        <StatCard icon={Globe} title="Attack Sources" value="142" change="Countries" changeType="neutral" variant="default" />
        <StatCard icon={Activity} title="Threat Score" value="HIGH" change="Elevated activity" changeType="negative" variant="warning" />
      </div>
      <ThreatTable />
    </div>
  );
}
