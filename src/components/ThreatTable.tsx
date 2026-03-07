import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface ThreatEntry {
  id: string;
  timestamp: string;
  sourceIp: string;
  country: string;
  attackType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  action: 'blocked' | 'challenged' | 'logged';
  targetUrl: string;
}

const severityStyles = {
  critical: 'bg-threat-critical/10 text-threat-critical border-threat-critical/30',
  high: 'bg-threat-high/10 text-threat-high border-threat-high/30',
  medium: 'bg-threat-medium/10 text-threat-medium border-threat-medium/30',
  low: 'bg-threat-low/10 text-threat-low border-threat-low/30',
};

const actionStyles = {
  blocked: 'bg-destructive/10 text-destructive border-destructive/30',
  challenged: 'bg-warning/10 text-warning border-warning/30',
  logged: 'bg-primary/10 text-primary border-primary/30',
};

const SAMPLE_THREATS: ThreatEntry[] = [
  { id: '1', timestamp: '2026-03-07 14:32:01', sourceIp: '185.220.101.42', country: 'RU', attackType: 'SQL Injection', severity: 'critical', action: 'blocked', targetUrl: '/api/users?id=1 OR 1=1' },
  { id: '2', timestamp: '2026-03-07 14:31:45', sourceIp: '103.152.220.13', country: 'CN', attackType: 'XSS', severity: 'high', action: 'blocked', targetUrl: '/search?q=<script>alert(1)</script>' },
  { id: '3', timestamp: '2026-03-07 14:31:22', sourceIp: '45.155.205.89', country: 'DE', attackType: 'Path Traversal', severity: 'high', action: 'blocked', targetUrl: '/files/../../etc/passwd' },
  { id: '4', timestamp: '2026-03-07 14:30:58', sourceIp: '192.241.213.47', country: 'US', attackType: 'Rate Limit', severity: 'medium', action: 'challenged', targetUrl: '/api/login' },
  { id: '5', timestamp: '2026-03-07 14:30:33', sourceIp: '91.108.4.12', country: 'IR', attackType: 'Bot Detection', severity: 'medium', action: 'challenged', targetUrl: '/api/data' },
  { id: '6', timestamp: '2026-03-07 14:30:10', sourceIp: '203.0.113.42', country: 'AU', attackType: 'CSRF', severity: 'low', action: 'logged', targetUrl: '/api/transfer' },
  { id: '7', timestamp: '2026-03-07 14:29:45', sourceIp: '78.46.89.12', country: 'DE', attackType: 'Command Injection', severity: 'critical', action: 'blocked', targetUrl: '/api/exec?cmd=ls' },
  { id: '8', timestamp: '2026-03-07 14:29:20', sourceIp: '5.188.62.18', country: 'NL', attackType: 'Credential Stuffing', severity: 'high', action: 'blocked', targetUrl: '/api/auth' },
];

export default function ThreatTable() {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Recent Threats</h3>
        <span className="text-xs font-mono text-muted-foreground">LIVE</span>
      </div>
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
            {SAMPLE_THREATS.map((t) => (
              <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                <td className="px-4 py-2.5 text-muted-foreground">{t.timestamp.split(' ')[1]}</td>
                <td className="px-4 py-2.5">
                  <span className="text-foreground">{t.sourceIp}</span>
                  <span className="text-muted-foreground ml-2">({t.country})</span>
                </td>
                <td className="px-4 py-2.5 text-foreground">{t.attackType}</td>
                <td className="px-4 py-2.5">
                  <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase border", severityStyles[t.severity])}>
                    {t.severity}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase border", actionStyles[t.action])}>
                    {t.action}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">{t.targetUrl}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
