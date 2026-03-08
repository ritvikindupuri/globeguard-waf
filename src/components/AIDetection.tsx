import { useState, useEffect } from 'react';
import { Brain, AlertTriangle, Send, Loader2, Globe, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';

type ThreatLog = Tables<'threat_logs'>;
type ProtectedSite = Tables<'protected_sites'>;

interface AnalysisResult {
  is_threat: boolean;
  threat_type: string;
  severity: string;
  action: string;
  confidence: number;
  explanation: string;
  indicators: string[];
}

export default function AIDetection() {
  const { user } = useAuth();
  const [sites, setSites] = useState<ProtectedSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');

  // Simulate an incoming request to the protected site
  const [incomingPath, setIncomingPath] = useState('');
  const [incomingMethod, setIncomingMethod] = useState('GET');
  const [incomingBody, setIncomingBody] = useState('');
  const [incomingIp, setIncomingIp] = useState('');
  const [incomingUserAgent, setIncomingUserAgent] = useState('');

  const [analyzing, setAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);
  const [recentThreats, setRecentThreats] = useState<ThreatLog[]>([]);

  useEffect(() => {
    if (!user) return;
    loadSites();
    loadRecentThreats();
  }, [user]);

  const loadSites = async () => {
    const { data } = await supabase
      .from('protected_sites')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) {
      setSites(data);
      if (data.length > 0 && !selectedSiteId) setSelectedSiteId(data[0].id);
    }
  };

  const loadRecentThreats = async () => {
    const { data } = await supabase
      .from('threat_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setRecentThreats(data);
  };

  const selectedSite = sites.find(s => s.id === selectedSiteId);

  const analyzeRequest = async () => {
    if (!selectedSite) {
      toast.error('Add a protected site first (go to Protected Sites)');
      return;
    }
    if (!incomingPath) {
      toast.error('Enter the request path that hit your site');
      return;
    }

    setAnalyzing(true);
    setLastResult(null);

    try {
      const fullUrl = `${selectedSite.url}${incomingPath.startsWith('/') ? '' : '/'}${incomingPath}`;

      const { data, error } = await supabase.functions.invoke('analyze-threat', {
        body: {
          request_data: {
            url: fullUrl,
            path: incomingPath,
            method: incomingMethod,
            body: incomingBody || undefined,
            user_agent: incomingUserAgent || 'Mozilla/5.0 (compatible; bot/1.0)',
            ip: incomingIp || `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            protected_site: selectedSite.url,
            protected_site_name: selectedSite.name,
            country: null,
            lat: null,
            lng: null,
          },
        },
      });

      if (error) throw error;
      if (data.error) {
        toast.error(data.error);
        return;
      }

      setLastResult(data.analysis);

      if (data.analysis.is_threat) {
        toast.warning(`Threat detected on ${selectedSite.name}: ${data.analysis.threat_type} (${data.analysis.severity})`);
      } else {
        toast.success(`Request to ${selectedSite.name} appears clean`);
      }

      loadRecentThreats();
    } catch (error: any) {
      toast.error(error.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-threat-critical';
      case 'high': return 'text-threat-high';
      case 'medium': return 'text-threat-medium';
      case 'low': return 'text-threat-low';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">AI Threat Detection</h2>
        <p className="text-xs text-muted-foreground font-mono">
          POWERED BY GOOGLE GEMINI • ANALYZE INCOMING TRAFFIC TO YOUR PROTECTED SITES
        </p>
      </div>

      {/* Site selector + request simulation */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          Simulate Incoming Request
        </h3>
        <p className="text-xs text-muted-foreground">
          Select one of your protected sites, then enter an incoming request as if someone is hitting your app.
          Deflectra's AI will analyze whether this traffic is malicious.
        </p>

        {/* Protected site picker */}
        <div>
          <label className="text-xs font-mono text-muted-foreground block mb-1">TARGET PROTECTED SITE</label>
          {sites.length === 0 ? (
            <div className="bg-secondary/50 border border-border rounded p-3 text-center">
              <Globe className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">No protected sites yet</p>
              <p className="text-[10px] font-mono text-muted-foreground">Go to Protected Sites → Add your app's URL first</p>
            </div>
          ) : (
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground font-mono"
            >
              {sites.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.url}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedSite && (
          <div className="bg-secondary/30 rounded p-3 flex items-center gap-3 border border-border/50">
            <Shield className="w-5 h-5 text-accent" />
            <div>
              <p className="text-xs font-semibold text-foreground">{selectedSite.name}</p>
              <p className="text-[10px] font-mono text-muted-foreground">{selectedSite.url} • {selectedSite.threats_blocked} threats blocked</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-mono text-muted-foreground block mb-1">INCOMING REQUEST PATH</label>
            <Input
              placeholder="/api/users?id=1 OR 1=1"
              value={incomingPath}
              onChange={(e) => setIncomingPath(e.target.value)}
              className="bg-secondary border-border font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-muted-foreground block mb-1">METHOD</label>
            <select
              value={incomingMethod}
              onChange={(e) => setIncomingMethod(e.target.value)}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground font-mono"
            >
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-mono text-muted-foreground block mb-1">ATTACKER IP (optional)</label>
            <Input
              placeholder="Auto-generated if blank"
              value={incomingIp}
              onChange={(e) => setIncomingIp(e.target.value)}
              className="bg-secondary border-border font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-muted-foreground block mb-1">USER AGENT (optional)</label>
            <Input
              placeholder="Mozilla/5.0..."
              value={incomingUserAgent}
              onChange={(e) => setIncomingUserAgent(e.target.value)}
              className="bg-secondary border-border font-mono text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-mono text-muted-foreground block mb-1">REQUEST BODY (optional, for POST/PUT)</label>
          <textarea
            placeholder='{"username": "admin", "password": "OR 1=1--"}'
            value={incomingBody}
            onChange={(e) => setIncomingBody(e.target.value)}
            className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground font-mono min-h-[80px] resize-y"
          />
        </div>

        <Button
          onClick={analyzeRequest}
          disabled={analyzing || !selectedSite}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              AI Analyzing Traffic...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Analyze Incoming Request
            </>
          )}
        </Button>
      </div>

      {/* Analysis Result */}
      {lastResult && (
        <div className={cn(
          "bg-card border rounded-lg p-5 space-y-3",
          lastResult.is_threat ? 'border-destructive/30 glow-destructive' : 'border-accent/30 glow-accent'
        )}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className={cn("w-4 h-4", lastResult.is_threat ? 'text-destructive' : 'text-accent')} />
              Deflectra AI Verdict
            </h3>
            <div className="flex items-center gap-3">
              <span className={cn("text-xs font-mono uppercase font-bold", severityColor(lastResult.severity))}>
                {lastResult.severity}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                Confidence: {lastResult.confidence}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] font-mono text-muted-foreground">THREAT TYPE</p>
              <p className="text-sm font-mono text-foreground">{lastResult.threat_type}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono text-muted-foreground">WAF ACTION</p>
              <p className="text-sm font-mono text-foreground uppercase">{lastResult.action}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono text-muted-foreground">THREAT DETECTED</p>
              <p className={cn("text-sm font-mono font-bold", lastResult.is_threat ? 'text-destructive' : 'text-accent')}>
                {lastResult.is_threat ? 'BLOCKED' : 'ALLOWED'}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-mono text-muted-foreground mb-1">AI EXPLANATION</p>
            <p className="text-xs text-foreground">{lastResult.explanation}</p>
          </div>

          {lastResult.indicators.length > 0 && (
            <div>
              <p className="text-[10px] font-mono text-muted-foreground mb-1">THREAT INDICATORS</p>
              <div className="flex flex-wrap gap-1">
                {lastResult.indicators.map((ind, i) => (
                  <span key={i} className="px-2 py-0.5 bg-secondary rounded text-[10px] font-mono text-foreground border border-border">
                    {ind}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Detections */}
      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Recent AI Detections</h3>
        </div>
        {recentThreats.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs font-mono text-muted-foreground">
              No threats analyzed yet. Add a protected site, then simulate incoming traffic above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {recentThreats.map((t) => {
              const details = t.details as any;
              return (
                <div key={t.id} className="px-4 py-3 hover:bg-secondary/20 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={cn("w-3.5 h-3.5", severityColor(t.severity))} />
                        <span className="text-sm font-semibold text-foreground">{t.threat_type}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(t.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-5">
                        {details?.explanation || `${t.request_method} ${t.request_path}`}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-[10px] font-mono text-muted-foreground">CONFIDENCE</p>
                      <p className={cn("text-sm font-bold font-mono", severityColor(t.severity))}>
                        {details?.confidence || '—'}%
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
