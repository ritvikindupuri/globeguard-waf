import { useState, useEffect } from 'react';
import { Brain, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';

type ThreatLog = Tables<'threat_logs'>;

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
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [body, setBody] = useState('');
  const [userAgent, setUserAgent] = useState('');
  const [ip, setIp] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);
  const [recentThreats, setRecentThreats] = useState<ThreatLog[]>([]);

  useEffect(() => {
    if (!user) return;
    loadRecentThreats();
  }, [user]);

  const loadRecentThreats = async () => {
    const { data } = await supabase
      .from('threat_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setRecentThreats(data);
  };

  const analyzeRequest = async () => {
    if (!url) {
      toast.error('Enter a URL or path to analyze');
      return;
    }

    setAnalyzing(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-threat', {
        body: {
          request_data: {
            url,
            path: url,
            method,
            body: body || undefined,
            user_agent: userAgent || 'Mozilla/5.0',
            ip: ip || `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
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
        toast.warning(`Threat detected: ${data.analysis.threat_type} (${data.analysis.severity})`);
      } else {
        toast.success('Request appears clean');
      }

      // Reload threats to show new entry
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
          POWERED BY GOOGLE GEMINI (gemini-3-flash-preview) • REAL-TIME ANALYSIS
        </p>
      </div>

      {/* Analysis Input */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          Analyze HTTP Request
        </h3>
        <p className="text-xs text-muted-foreground">
          Enter request details to have the AI engine analyze for threats. Results are logged to the database.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-mono text-muted-foreground block mb-1">URL / PATH</label>
            <Input
              placeholder="/api/users?id=1 OR 1=1"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-secondary border-border font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-muted-foreground block mb-1">METHOD</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground font-mono"
            >
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
              <option>PATCH</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-mono text-muted-foreground block mb-1">SOURCE IP (optional)</label>
            <Input
              placeholder="185.220.101.42"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              className="bg-secondary border-border font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-muted-foreground block mb-1">USER AGENT (optional)</label>
            <Input
              placeholder="Mozilla/5.0..."
              value={userAgent}
              onChange={(e) => setUserAgent(e.target.value)}
              className="bg-secondary border-border font-mono text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-mono text-muted-foreground block mb-1">REQUEST BODY (optional)</label>
          <textarea
            placeholder='{"username": "admin", "password": "OR 1=1--"}'
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground font-mono min-h-[80px] resize-y"
          />
        </div>

        <Button
          onClick={analyzeRequest}
          disabled={analyzing}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              AI Analyzing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Analyze with AI
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
              AI Analysis Result
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
              <p className="text-[10px] font-mono text-muted-foreground">ACTION</p>
              <p className="text-sm font-mono text-foreground uppercase">{lastResult.action}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono text-muted-foreground">THREAT</p>
              <p className={cn("text-sm font-mono font-bold", lastResult.is_threat ? 'text-destructive' : 'text-accent')}>
                {lastResult.is_threat ? 'YES' : 'NO'}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-mono text-muted-foreground mb-1">EXPLANATION</p>
            <p className="text-xs text-foreground">{lastResult.explanation}</p>
          </div>

          {lastResult.indicators.length > 0 && (
            <div>
              <p className="text-[10px] font-mono text-muted-foreground mb-1">INDICATORS</p>
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

      {/* Recent AI-Detected Threats */}
      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Recent AI Detections</h3>
        </div>
        {recentThreats.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs font-mono text-muted-foreground">No threats analyzed yet. Submit a request above to begin.</p>
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
