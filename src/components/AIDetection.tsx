import { Brain, TrendingUp, AlertTriangle, Bot, Fingerprint, Activity } from 'lucide-react';
import StatCard from './StatCard';

const anomalies = [
  { id: 1, type: 'Behavioral Anomaly', description: 'Unusual request pattern from 185.220.x.x — 3x normal frequency with rotating user agents', confidence: 94, time: '2 min ago' },
  { id: 2, type: 'Bot Fingerprint', description: 'Headless browser detected (CDP protocol leak) attempting credential stuffing', confidence: 98, time: '5 min ago' },
  { id: 3, type: 'API Abuse Pattern', description: 'Systematic enumeration of /api/users/{id} endpoint from distributed IPs', confidence: 87, time: '8 min ago' },
  { id: 4, type: 'Zero-Day Signature', description: 'Novel payload structure matching no known signatures — ML flagged as suspicious', confidence: 72, time: '12 min ago' },
  { id: 5, type: 'Session Anomaly', description: 'Token reuse detected across geographically distant locations within 30s window', confidence: 91, time: '15 min ago' },
];

export default function AIDetection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">AI Threat Detection</h2>
        <p className="text-xs text-muted-foreground font-mono">ML-POWERED ANOMALY DETECTION • BEHAVIORAL ANALYSIS • BOT FINGERPRINTING</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard icon={Brain} title="ML Model Accuracy" value="99.2%" change="+0.3% this week" changeType="positive" variant="primary" />
        <StatCard icon={Bot} title="Bots Detected" value="2,847" change="+12% vs yesterday" changeType="negative" variant="destructive" />
        <StatCard icon={Fingerprint} title="Fingerprints" value="18.4K" change="Unique signatures" changeType="neutral" variant="accent" />
        <StatCard icon={Activity} title="Anomalies/hr" value="34" change="-8% from avg" changeType="positive" variant="warning" />
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">AI-Detected Anomalies</h3>
        </div>
        <div className="divide-y divide-border/50">
          {anomalies.map((a) => (
            <div key={a.id} className="px-4 py-3 hover:bg-secondary/20 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-3.5 h-3.5 ${a.confidence > 90 ? 'text-destructive' : a.confidence > 80 ? 'text-warning' : 'text-primary'}`} />
                    <span className="text-sm font-semibold text-foreground">{a.type}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{a.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-5">{a.description}</p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-[10px] font-mono text-muted-foreground">CONFIDENCE</p>
                  <p className={`text-sm font-bold font-mono ${a.confidence > 90 ? 'text-destructive' : a.confidence > 80 ? 'text-warning' : 'text-primary'}`}>
                    {a.confidence}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
