import { useState, useEffect } from 'react';
import { Brain, AlertTriangle, Send, Loader2, Globe, Shield, Info, Sparkles, Zap, Copy, ExternalLink, ChevronDown, ChevronUp, Link } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';
import BlockPagePreview from '@/components/BlockPagePreview';

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

interface AIGeneratedFields {
  path?: boolean;
  method?: boolean;
  body?: boolean;
  user_agent?: boolean;
}

export default function AIDetection() {
  const { user } = useAuth();
  const [sites, setSites] = useState<ProtectedSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [incomingPath, setIncomingPath] = useState('');
  const [incomingMethod, setIncomingMethod] = useState('GET');
  const [incomingBody, setIncomingBody] = useState('');
  const [incomingIp, setIncomingIp] = useState('');
  const [incomingUserAgent, setIncomingUserAgent] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);
  const [recentThreats, setRecentThreats] = useState<ThreatLog[]>([]);

  // AI generation state
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [aiGeneratedFields, setAiGeneratedFields] = useState<AIGeneratedFields>({});
  
  // Custom attack simulation
  const [customAttackInput, setCustomAttackInput] = useState('');
  const [runningCustomAttack, setRunningCustomAttack] = useState(false);

  // Worker domain for block page URLs
  const [workerDomain, setWorkerDomain] = useState(() => localStorage.getItem('deflectra_worker_domain') || '');
  
  // Expanded threat details
  const [expandedThreatId, setExpandedThreatId] = useState<string | null>(null);

  const saveWorkerDomain = (val: string) => {
    setWorkerDomain(val);
    localStorage.setItem('deflectra_worker_domain', val);
  };

  useEffect(() => {
    if (!user) return;
    loadSites();
    loadRecentThreats();
  }, [user]);

  const loadSites = async () => {
    const { data } = await supabase.from('protected_sites').select('*').order('created_at', { ascending: false });
    if (data) { setSites(data); if (data.length > 0 && !selectedSiteId) setSelectedSiteId(data[0].id); }
  };

  const loadRecentThreats = async () => {
    const { data } = await supabase.from('threat_logs').select('*').order('created_at', { ascending: false }).limit(10);
    if (data) setRecentThreats(data);
  };

  const selectedSite = sites.find(s => s.id === selectedSiteId);

  const generateField = async (field: string) => {
    if (!selectedSite) {
      toast.error('Select a protected site first');
      return;
    }

    setGeneratingField(field);
    try {
      const { data, error } = await supabase.functions.invoke('auto-generate-fields', {
        body: { site_url: selectedSite.url, context: 'ai_detection', field },
      });

      if (error) throw error;
      if (!data?.success || !data?.data) throw new Error('AI generation failed');

      const result = data.data;
      
      if (field === 'path' && result.value) {
        setIncomingPath(result.value);
        setAiGeneratedFields(prev => ({ ...prev, path: true }));
        toast.success(`Attack path: ${result.reasoning || result.value}`);
      } else if (field === 'body' && result.value) {
        setIncomingBody(result.value);
        setAiGeneratedFields(prev => ({ ...prev, body: true }));
        toast.success(`Payload: ${result.attack_type || 'malicious'}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'AI generation failed');
    } finally {
      setGeneratingField(null);
    }
  };

  const generateAll = async () => {
    if (!selectedSite) {
      toast.error('Select a protected site first');
      return;
    }

    setGeneratingField('all');
    try {
      const { data, error } = await supabase.functions.invoke('auto-generate-fields', {
        body: { site_url: selectedSite.url, context: 'ai_detection' },
      });

      if (error) throw error;
      if (!data?.success || !data?.data?.scenarios?.[0]) throw new Error('AI generation failed');

      const scenario = data.data.scenarios[0];
      setIncomingPath(scenario.path || '');
      setIncomingMethod(scenario.method || 'GET');
      setIncomingBody(scenario.body || '');
      setIncomingUserAgent(scenario.user_agent || '');
      setAiGeneratedFields({ path: true, method: true, body: true, user_agent: true });
      
      const stack = data.data.detected_stack;
      toast.success(`Attack scenario for ${stack?.frontend || 'app'} + ${stack?.backend || 'backend'}`);
    } catch (err: any) {
      toast.error(err.message || 'AI generation failed');
    } finally {
      setGeneratingField(null);
    }
  };

  const runCustomAttack = async () => {
    if (!selectedSite) { toast.error('Select a protected site first'); return; }
    if (!customAttackInput.trim()) { toast.error('Describe the attack you want to simulate'); return; }

    setRunningCustomAttack(true);
    setLastResult(null);

    try {
      // Step 1: Generate attack scenario from user's description
      const { data: genData, error: genError } = await supabase.functions.invoke('auto-generate-fields', {
        body: { site_url: selectedSite.url, context: 'custom_attack', field: customAttackInput.trim() },
      });

      if (genError) throw genError;
      if (!genData?.success || !genData?.data?.scenario) throw new Error('AI failed to generate attack scenario');

      const scenario = genData.data.scenario;
      
      // Auto-fill the form fields
      setIncomingPath(scenario.path || '');
      setIncomingMethod(scenario.method || 'GET');
      setIncomingBody(scenario.body || '');
      setIncomingUserAgent(scenario.user_agent || '');
      setAiGeneratedFields({ path: true, method: true, body: true, user_agent: true });

      toast.info(`Generated: ${scenario.attack_name}`, { description: scenario.explanation });

      // Step 2: Automatically run the analysis
      const fullUrl = `${selectedSite.url}${(scenario.path || '/').startsWith('/') ? '' : '/'}${scenario.path || '/'}`;
      const { data, error } = await supabase.functions.invoke('analyze-threat', {
        body: {
          request_data: {
            url: fullUrl,
            path: scenario.path || '/',
            method: scenario.method || 'GET',
            body: scenario.body || undefined,
            user_agent: scenario.user_agent || 'Mozilla/5.0 (compatible; bot/1.0)',
            ip: incomingIp || `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
            protected_site: selectedSite.url,
            protected_site_name: selectedSite.name,
          },
        },
      });

      if (error) throw error;
      if (data.error) { toast.error(data.error); return; }
      
      setLastResult(data.analysis);
      if (data.analysis.is_threat) toast.warning(`Threat detected: ${data.analysis.threat_type}`);
      else toast.success('Request appears clean — WAF did not flag this');
      loadRecentThreats();
    } catch (error: any) {
      toast.error(error.message || 'Attack simulation failed');
    } finally {
      setRunningCustomAttack(false);
    }
  };

  const analyzeRequest = async () => {
    if (!selectedSite) { toast.error('Add a protected site first'); return; }
    if (!incomingPath) { toast.error('Enter the request path'); return; }
    setAnalyzing(true);
    setLastResult(null);

    try {
      const fullUrl = `${selectedSite.url}${incomingPath.startsWith('/') ? '' : '/'}${incomingPath}`;
      const { data, error } = await supabase.functions.invoke('analyze-threat', {
        body: {
          request_data: {
            url: fullUrl, path: incomingPath, method: incomingMethod,
            body: incomingBody || undefined,
            user_agent: incomingUserAgent || 'Mozilla/5.0 (compatible; bot/1.0)',
            ip: incomingIp || `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
            protected_site: selectedSite.url, protected_site_name: selectedSite.name,
          },
        },
      });
      if (error) throw error;
      if (data.error) { toast.error(data.error); return; }
      setLastResult(data.analysis);
      if (data.analysis.is_threat) toast.warning(`Threat detected: ${data.analysis.threat_type}`);
      else toast.success('Request appears clean');
      loadRecentThreats();
    } catch (error: any) {
      toast.error(error.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const severityColor = (s: string) => {
    return s === 'critical' ? 'text-threat-critical' : s === 'high' ? 'text-threat-high' : s === 'medium' ? 'text-threat-medium' : 'text-threat-low';
  };

  const buildBlockPageUrl = (path: string) => {
    const base = workerDomain.trim().replace(/\/$/, '');
    if (!base) return null;
    const cleanPath = path?.startsWith('/') ? path : `/${path || ''}`;
    return `${base.startsWith('http') ? base : `https://${base}`}${cleanPath}`;
  };

  const AIBadge = () => (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-primary/20 text-primary border border-primary/30">
      <Sparkles className="w-2.5 h-2.5" />
      AI
    </span>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">AI Threat Detection</h2>
        <p className="text-sm text-muted-foreground">
          Simulate incoming traffic to your protected sites and let Deflectra's AI analyze it
        </p>
      </div>

      {/* Worker Domain Config */}
      <div className="glass-card rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Link className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Cloudflare Worker Domain</h3>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Enter your Cloudflare Worker URL so Deflectra can generate direct block page links. This is the <span className="font-mono">*.workers.dev</span> domain (or custom domain) from your Cloudflare dashboard.
        </p>
        <Input
          placeholder="e.g. my-waf.your-subdomain.workers.dev"
          value={workerDomain}
          onChange={(e) => saveWorkerDomain(e.target.value)}
          className="bg-secondary/50 border-border font-mono text-sm rounded-xl h-10"
        />
        {workerDomain && (
          <p className="text-[10px] text-accent font-mono">✓ Block page URLs will use: {workerDomain.startsWith('http') ? workerDomain : `https://${workerDomain}`}</p>
        )}
      </div>

      {/* Custom Attack Simulation */}
      <div className="glass-card rounded-xl p-5 space-y-4 border border-primary/20">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Quick Attack Simulation
        </h3>
        <p className="text-xs text-muted-foreground">
          Describe any attack type and Deflectra's AI will crawl your site, craft a realistic payload, and test your WAF — all in one step.
        </p>

        {sites.length > 0 && !selectedSiteId && (
          <p className="text-xs text-muted-foreground italic">Select a protected site below first.</p>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="e.g. SQL injection on login, XSS via search bar, SSRF attack, directory traversal..."
            value={customAttackInput}
            onChange={(e) => setCustomAttackInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !runningCustomAttack && runCustomAttack()}
            className="bg-secondary/50 border-border text-sm rounded-xl h-10 flex-1"
            disabled={runningCustomAttack}
          />
          <Button
            onClick={runCustomAttack}
            disabled={runningCustomAttack || !selectedSite || !customAttackInput.trim()}
            className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl h-10 px-4"
          >
            {runningCustomAttack ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Simulating...</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" />Simulate</>
            )}
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {['SQL injection on login', 'XSS via search', 'Path traversal attack', 'SSRF to internal services', 'Brute force admin panel', 'API key exfiltration'].map((example) => (
            <button
              key={example}
              onClick={() => setCustomAttackInput(example)}
              className="px-2 py-1 rounded-lg bg-secondary/50 border border-border/50 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Analysis Input */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Simulate Incoming Request
          </h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateAll}
                  disabled={generatingField !== null || !selectedSite}
                  className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                >
                  {generatingField === 'all' ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3 mr-1" />
                  )}
                  Generate Attack Scenario
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Deep-scan your app to generate realistic attack scenarios</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Target Protected Site</label>
          {sites.length === 0 ? (
            <div className="bg-secondary/30 rounded-xl p-4 text-center">
              <Globe className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">No sites yet — add one in Protected Sites first</p>
            </div>
          ) : (
            <select value={selectedSiteId} onChange={(e) => setSelectedSiteId(e.target.value)} className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground">
              {sites.map(s => <option key={s.id} value={s.id}>{s.name} — {s.url}</option>)}
            </select>
          )}
        </div>

        {selectedSite && (
          <div className="stat-gradient-primary rounded-xl p-3 flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs font-semibold text-foreground">{selectedSite.name}</p>
              <p className="text-[10px] font-mono text-muted-foreground">{selectedSite.url}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                Request Path
                {aiGeneratedFields.path && <AIBadge />}
              </label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => generateField('path')}
                disabled={generatingField !== null || !selectedSite}
                className="h-5 px-1.5 text-[10px] text-primary hover:bg-primary/10"
              >
                {generatingField === 'path' ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <Sparkles className="w-2.5 h-2.5" />
                )}
              </Button>
            </div>
            <Input 
              placeholder="/api/users?id=1 OR 1=1" 
              value={incomingPath} 
              onChange={(e) => { setIncomingPath(e.target.value); setAiGeneratedFields(prev => ({ ...prev, path: false })); }} 
              className={cn(
                "bg-secondary/50 font-mono text-sm rounded-xl h-10",
                aiGeneratedFields.path ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
              )}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              Method
              {aiGeneratedFields.method && <AIBadge />}
            </label>
            <select 
              value={incomingMethod} 
              onChange={(e) => { setIncomingMethod(e.target.value); setAiGeneratedFields(prev => ({ ...prev, method: false })); }} 
              className={cn(
                "w-full bg-secondary/50 border rounded-xl px-3 py-2.5 text-sm text-foreground",
                aiGeneratedFields.method ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
              )}
            >
              <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Attacker IP (optional)</label>
            <Input placeholder="Auto-generated" value={incomingIp} onChange={(e) => setIncomingIp(e.target.value)} className="bg-secondary/50 border-border font-mono text-sm rounded-xl h-10" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              User Agent (optional)
              {aiGeneratedFields.user_agent && <AIBadge />}
            </label>
            <Input 
              placeholder="Mozilla/5.0..." 
              value={incomingUserAgent} 
              onChange={(e) => { setIncomingUserAgent(e.target.value); setAiGeneratedFields(prev => ({ ...prev, user_agent: false })); }} 
              className={cn(
                "bg-secondary/50 font-mono text-sm rounded-xl h-10",
                aiGeneratedFields.user_agent ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
              )}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              Request Body (optional)
              {aiGeneratedFields.body && <AIBadge />}
            </label>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => generateField('body')}
              disabled={generatingField !== null || !selectedSite}
              className="h-5 px-1.5 text-[10px] text-primary hover:bg-primary/10"
            >
              {generatingField === 'body' ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              ) : (
                <Sparkles className="w-2.5 h-2.5" />
              )}
            </Button>
          </div>
          <textarea 
            placeholder='{"username":"admin","password":"OR 1=1--"}' 
            value={incomingBody} 
            onChange={(e) => { setIncomingBody(e.target.value); setAiGeneratedFields(prev => ({ ...prev, body: false })); }} 
            className={cn(
              "w-full bg-secondary/50 border rounded-xl px-3 py-2 text-sm text-foreground font-mono min-h-[80px] resize-y",
              aiGeneratedFields.body ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
            )}
          />
        </div>

        <Button onClick={analyzeRequest} disabled={analyzing || !selectedSite} className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl">
          {analyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : <><Send className="w-4 h-4 mr-2" />Analyze with AI</>}
        </Button>
      </div>

      {/* Result */}
      {lastResult && (
        <div className={cn("glass-card rounded-xl p-5 space-y-3", lastResult.is_threat ? 'glow-destructive' : 'glow-accent')}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className={cn("w-4 h-4", lastResult.is_threat ? 'text-destructive' : 'text-accent')} />
              Deflectra AI Verdict
            </h3>
            <span className="text-xs font-mono text-muted-foreground">Confidence: {lastResult.confidence}%</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><p className="text-[10px] font-mono text-muted-foreground">TYPE</p><p className="text-sm text-foreground">{lastResult.threat_type}</p></div>
            <div><p className="text-[10px] font-mono text-muted-foreground">ACTION</p><p className="text-sm text-foreground uppercase">{lastResult.action}</p></div>
            <div><p className="text-[10px] font-mono text-muted-foreground">VERDICT</p><p className={cn("text-sm font-bold", lastResult.is_threat ? 'text-destructive' : 'text-accent')}>{lastResult.is_threat ? 'BLOCKED' : 'ALLOWED'}</p></div>
          </div>
          <div><p className="text-[10px] font-mono text-muted-foreground mb-1">EXPLANATION</p><p className="text-xs text-foreground">{lastResult.explanation}</p></div>
          {lastResult.indicators.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {lastResult.indicators.map((ind, i) => <span key={i} className="px-2 py-0.5 bg-secondary/50 rounded-md text-[10px] font-mono text-foreground border border-border/50">{ind}</span>)}
            </div>
          )}

          {/* Block Page URL */}
          {lastResult.is_threat && (
            <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
              <p className="text-[10px] font-mono text-muted-foreground">SEE THE BLOCK PAGE LIVE</p>
              {(() => {
                const blockPageUrl = buildBlockPageUrl(incomingPath || '/');
                if (!blockPageUrl) {
                  return (
                    <p className="text-[10px] text-muted-foreground italic">
                      Set your Cloudflare Worker domain above to generate a direct block page link.
                    </p>
                  );
                }
                return (
                  <>
                    <p className="text-[10px] text-muted-foreground">
                      Paste this URL in your browser to see Deflectra's block page:
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-secondary/50 border border-border rounded-xl px-3 py-2 font-mono text-xs text-foreground break-all select-all">
                        {blockPageUrl}
                      </div>
                      <Button size="sm" variant="outline" className="h-8 px-2.5 rounded-xl border-border shrink-0"
                        onClick={() => { navigator.clipboard.writeText(blockPageUrl); toast.success('URL copied'); }}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 px-2.5 rounded-xl border-border shrink-0"
                        onClick={() => window.open(blockPageUrl, '_blank')}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Recent */}
      <div className="glass-card rounded-xl">
        <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Recent AI Detections</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs text-xs leading-relaxed">
                <p className="font-semibold mb-1">AI Confidence Score</p>
                <p className="text-muted-foreground">The percentage shown is the AI model's confidence that a request is malicious.</p>
                <p className="mt-1.5">• <span className="text-threat-critical font-medium">90–100%</span> — Almost certainly an attack</p>
                <p>• <span className="text-threat-high font-medium">60–89%</span> — Likely malicious</p>
                <p>• <span className="text-threat-medium font-medium">30–59%</span> — Suspicious</p>
                <p>• <span className="text-threat-low font-medium">0–29%</span> — Probably safe</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {recentThreats.length === 0 ? (
          <div className="p-8 text-center"><p className="text-xs text-muted-foreground">No threats analyzed yet</p></div>
        ) : (
          <div className="divide-y divide-border/30">
            {recentThreats.map((t) => {
              const details = t.details as any;
              const rawConf = details?.ai_analysis?.confidence ?? details?.confidence;
              const confidence = rawConf != null
                ? (rawConf <= 1 ? Math.round(rawConf * 100) : Math.round(rawConf))
                : null;
              const isExpanded = expandedThreatId === t.id;
              const explanation = details?.ai_analysis?.reason || details?.explanation || details?.block_reason || '';
              const indicators = details?.indicators || details?.ai_analysis?.indicators || details?.raw_request ? null : null;
              const rawRequest = details?.raw_request || {};
              const blockUrl = buildBlockPageUrl(t.request_path || '/');

              return (
                <div key={t.id} className="transition-colors">
                  <button
                    onClick={() => setExpandedThreatId(isExpanded ? null : t.id)}
                    className="w-full px-5 py-3 hover:bg-secondary/20 transition-colors text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={cn("w-3.5 h-3.5 shrink-0", severityColor(t.severity))} />
                          <span className="text-sm font-semibold text-foreground">{t.threat_type}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-5 line-clamp-1">{explanation || `${t.request_method} ${t.request_path}`}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        <p className={cn("text-sm font-bold font-mono", severityColor(t.severity))}>
                          {confidence != null ? `${confidence}%` : '—'}
                        </p>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-5 pb-4 space-y-3 bg-secondary/10 border-t border-border/30">
                      {/* AI Analysis */}
                      <div className="pt-3">
                        <p className="text-[10px] font-mono text-muted-foreground mb-1.5">AI ANALYSIS</p>
                        <p className="text-xs text-foreground leading-relaxed">{explanation}</p>
                      </div>

                      {/* Attack Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground">METHOD</p>
                          <p className="text-xs font-mono text-foreground">{t.request_method || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground">PATH</p>
                          <p className="text-xs font-mono text-foreground break-all">{t.request_path || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground">SOURCE IP</p>
                          <p className="text-xs font-mono text-foreground">{t.source_ip}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground">COUNTRY</p>
                          <p className="text-xs font-mono text-foreground">{t.source_country || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground">SEVERITY</p>
                          <p className={cn("text-xs font-mono font-bold uppercase", severityColor(t.severity))}>{t.severity}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground">ACTION</p>
                          <p className="text-xs font-mono text-foreground uppercase">{t.action_taken}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground">CONFIDENCE</p>
                          <p className="text-xs font-mono text-foreground">{confidence != null ? `${confidence}%` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground">THREAT TYPE</p>
                          <p className="text-xs font-mono text-foreground">{details?.ai_analysis?.threat_type || t.threat_type}</p>
                        </div>
                      </div>

                      {/* User Agent */}
                      {t.user_agent && (
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground mb-1">USER AGENT</p>
                          <p className="text-[10px] font-mono text-foreground bg-secondary/50 rounded-lg px-2 py-1.5 break-all">{t.user_agent}</p>
                        </div>
                      )}

                      {/* Indicators */}
                      {(details?.indicators?.length > 0 || rawRequest?.body) && (
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground mb-1">INDICATORS</p>
                          <div className="flex flex-wrap gap-1">
                            {(details?.indicators || []).map((ind: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 bg-secondary/50 rounded-md text-[10px] font-mono text-foreground border border-border/50">{ind}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* How AI Constructed the Attack */}
                      {rawRequest && Object.keys(rawRequest).length > 0 && (
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground mb-1">HOW THE AI EXTRACTED THIS ATTACK</p>
                          <div className="bg-secondary/50 rounded-lg p-3 space-y-1.5 text-[10px] font-mono text-foreground">
                            {rawRequest.url && <p><span className="text-muted-foreground">URL:</span> {rawRequest.url}</p>}
                            {rawRequest.method && <p><span className="text-muted-foreground">Method:</span> {rawRequest.method}</p>}
                            {rawRequest.protected_site && <p><span className="text-muted-foreground">Target Site:</span> {rawRequest.protected_site}</p>}
                            {rawRequest.body && (
                              <div>
                                <span className="text-muted-foreground">Payload:</span>
                                <pre className="mt-1 whitespace-pre-wrap break-all text-foreground bg-background/50 rounded p-2">{typeof rawRequest.body === 'string' ? rawRequest.body : JSON.stringify(rawRequest.body, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Block Page URL */}
                      {blockUrl ? (
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground mb-1">VIEW BLOCK PAGE</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-secondary/50 border border-border rounded-xl px-3 py-2 font-mono text-xs text-foreground break-all select-all">
                              {blockUrl}
                            </div>
                            <Button size="sm" variant="outline" className="h-8 px-2.5 rounded-xl border-border shrink-0"
                              onClick={() => { navigator.clipboard.writeText(blockUrl); toast.success('URL copied'); }}>
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 px-2.5 rounded-xl border-border shrink-0"
                              onClick={() => window.open(blockUrl, '_blank')}>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">Set your Cloudflare Worker domain above to generate block page links.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Block Page Preview */}
      <BlockPagePreview />
    </div>
  );
}
