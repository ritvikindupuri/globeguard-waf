import ThreatGlobe from '@/components/ThreatGlobe';
import ThreatTable from '@/components/ThreatTable';

export default function GlobePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Threat Map</h1>
        <p className="text-xs font-mono text-muted-foreground mt-1">GLOBAL ATTACK VISUALIZATION • REAL-TIME</p>
      </div>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">3D Threat Globe</h3>
          <span className="text-[10px] font-mono text-accent animate-pulse-glow">● LIVE FEED</span>
        </div>
        <ThreatGlobe className="h-[500px]" />
      </div>
      <ThreatTable />
    </div>
  );
}
