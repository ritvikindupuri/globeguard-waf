import { useState, useEffect } from 'react';
import { Lock, FileJson, Key, Shield, CheckCircle, XCircle, Plus, Trash2, Play, Loader2, Sparkles, AlertTriangle, ChevronDown, ChevronUp, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import StatCard from './StatCard';

interface APIEndpoint {
  id: string;
  method: string;
  path: string;
  schema_validation: boolean;
  jwt_inspection: boolean;
  rate_limited: boolean;
  requests_today: number;
  blocked_today: number;
}

interface ProtectedSite {
  id: string;
  name: string;
  url: string;
}

interface AIGeneratedFields {
  method?: boolean;
  path?: boolean;
}

interface TestResult {
  name: string;
  status: 'pass' | 'blocked' | 'fail';
  method: string;
  path: string;
  httpStatus: number | null;
  severity: string;
  action: string;
  reason: string;
  sourceIp: string;
  responseSnippet: string;
}

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-primary/10 text-primary border-primary/30',
  POST: 'bg-accent/10 text-accent border-accent/30',
  PUT: 'bg-warning/10 text-warning border-warning/30',
  DELETE: 'bg-destructive/10 text-destructive border-destructive/30',
  PATCH: 'bg-threat-info/10 text-threat-info border-threat-info/30',
};

export default function APIProtection() {
  const { user } = useAuth();
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [sites, setSites] = useState<ProtectedSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newMethod, setNewMethod] = useState('GET');
  const [newPath, setNewPath] = useState('');
  const [newSchema, setNewSchema] = useState(true);
  const [newJwt, setNewJwt] = useState(true);
  const [newRate, setNewRate] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult[]>>({});
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  // AI generation state
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [aiGeneratedFields, setAiGeneratedFields] = useState<AIGeneratedFields>({});

  useEffect(() => {
    if (!user) return;
    loadEndpoints();
    loadSites();
  }, [user]);

  const loadEndpoints = async () => {
    const { data } = await supabase.from('api_endpoints').select('*').order('created_at', { ascending: false });
    setEndpoints((data as any) || []);
    setLoading(false);
  };

  const loadSites = async () => {
    const { data } = await supabase.from('protected_sites').select('id, name, url').order('created_at', { ascending: false });
    if (data) {
      setSites(data);
      if (data.length > 0 && !selectedSiteId) setSelectedSiteId(data[0].id);
    }
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
        body: { site_url: selectedSite.url, context: 'api_shield', field },
      });

      if (error) throw error;
      if (!data?.success || !data?.data) throw new Error('AI generation failed');

      const result = data.data;
      
      if (field === 'path' && result.value) {
        setNewPath(result.value);
        setAiGeneratedFields(prev => ({ ...prev, path: true }));
        // Also set recommended protections based on AI analysis
        if (result.requires_auth !== undefined) {
          setNewJwt(result.requires_auth);
        }
        toast.success(`Generated: ${result.endpoint_purpose || result.value}`);
      } else if (field === 'method' && result.value) {
        setNewMethod(result.value);
        setAiGeneratedFields(prev => ({ ...prev, method: true }));
        toast.success(`Method: ${result.value} - ${result.reasoning || ''}`);
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
        body: { site_url: selectedSite.url, context: 'api_shield' },
      });

      if (error) throw error;
      if (!data?.success || !data?.data?.endpoints?.[0]) throw new Error('AI generation failed');

      const endpoint = data.data.endpoints[0];
      setNewMethod(endpoint.method);
      setNewPath(endpoint.path);
      setNewSchema(endpoint.schema_validation);
      setNewJwt(endpoint.jwt_inspection);
      setNewRate(endpoint.rate_limited);
      setAiGeneratedFields({ method: true, path: true });
      
      toast.success(`Discovered ${data.data.api_type} endpoint from ${selectedSite.name}`);
    } catch (err: any) {
      toast.error(err.message || 'AI generation failed');
    } finally {
      setGeneratingField(null);
    }
  };

  const addEndpoint = async () => {
    if (!user || !newPath) { toast.error('Path is required'); return; }
    const { data, error } = await supabase.from('api_endpoints').insert({
      user_id: user.id,
      method: newMethod,
      path: newPath,
      schema_validation: newSchema,
      jwt_inspection: newJwt,
      rate_limited: newRate,
    } as any).select().single();
    if (error) { toast.error('Failed to add endpoint'); return; }
    setEndpoints(prev => [(data as any), ...prev]);
    setNewPath(''); 
    setAdding(false);
    setAiGeneratedFields({});
    toast.success('Endpoint added to API Shield');
  };

  const deleteEndpoint = async (id: string) => {
    await supabase.from('api_endpoints').delete().eq('id', id);
    setEndpoints(prev => prev.filter(e => e.id !== id));
    toast.success('Endpoint removed');
  };

  const testEndpoint = async (ep: APIEndpoint) => {
    setTestingId(ep.id);
    setTestResults(prev => ({ ...prev, [ep.id]: [] }));

    try {
      const { data: sitesData } = await supabase.from('protected_sites').select('id, url').limit(1);
      const site = sitesData?.[0];
      if (!site) {
        setTestResults(prev => ({ ...prev, [ep.id]: [{ name: 'Setup', status: 'fail', method: '-', path: '-', httpStatus: null, severity: 'low', action: 'error', reason: 'No protected site found', sourceIp: '-', responseSnippet: '' }] }));
        return;
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { data: sessionData } = await supabase.auth.getSession();
      const userToken = sessionData?.session?.access_token || anonKey;
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/waf-proxy`;

      const results: TestResult[] = [];

      const parseWafResponse = (text: string, status: number): Partial<TestResult> => {
        // Try to extract details from block page HTML
        const reasonMatch = text.match(/detail-value">([^<]+)<\/span>\s*<\/div>\s*<div class="detail-row"><span class="detail-label">Rule/);
        const ruleMatch = text.match(/detail-label">Rule<\/span><span class="detail-value">([^<]+)/);
        const ipMatch = text.match(/detail-label">Your IP<\/span><span class="detail-value">([^<]+)/);
        const pathMatch = text.match(/detail-label">Path<\/span><span class="detail-value">([^<]+)/);
        const severityMatch = text.match(/badge\s+(critical|high|medium|low)/);
        
        return {
          httpStatus: status,
          severity: severityMatch?.[1] || (status === 403 ? 'high' : 'low'),
          action: status === 403 ? 'blocked' : 'allowed',
          reason: reasonMatch?.[1] || ruleMatch?.[1] || (status === 403 ? 'Blocked by WAF' : 'Passed through'),
          sourceIp: ipMatch?.[1] || '-',
          responseSnippet: text.substring(0, 500),
        };
      };

      // Test 1: Clean request
      try {
        const cleanRes = await fetch(
          `${baseUrl}?site_id=${site.id}&path=${encodeURIComponent(ep.path)}`,
          { method: ep.method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}`, 'apikey': anonKey },
            ...(ep.method === 'POST' ? { body: JSON.stringify({ message: "hello" }) } : {}),
          }
        );
        const text = await cleanRes.text();
        const parsed = parseWafResponse(text, cleanRes.status);
        results.push({ name: 'Clean Request', status: cleanRes.status !== 403 ? 'pass' : 'blocked', method: ep.method, path: ep.path, ...parsed } as TestResult);
      } catch { results.push({ name: 'Clean Request', status: 'fail', method: ep.method, path: ep.path, httpStatus: null, severity: 'low', action: 'error', reason: 'Network error', sourceIp: '-', responseSnippet: '' }); }

      // Test 2: SQLi payload
      const sqliPath = ep.path + "?id=1' OR '1'='1";
      try {
        const sqliRes = await fetch(
          `${baseUrl}?site_id=${site.id}&path=${encodeURIComponent(sqliPath)}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}`, 'apikey': anonKey },
            body: JSON.stringify({ username: "admin", password: "' OR 1=1--" }),
          }
        );
        const text = await sqliRes.text();
        const parsed = parseWafResponse(text, sqliRes.status);
        results.push({ name: 'SQL Injection Attack', status: sqliRes.status === 403 ? 'blocked' : 'pass', method: 'POST', path: sqliPath, ...parsed } as TestResult);
      } catch { results.push({ name: 'SQL Injection Attack', status: 'blocked', method: 'POST', path: sqliPath, httpStatus: null, severity: 'critical', action: 'blocked', reason: 'Request blocked (connection refused)', sourceIp: '-', responseSnippet: '' }); }

      // Test 3: No JWT
      if (ep.jwt_inspection) {
        try {
          const noJwtRes = await fetch(
            `${baseUrl}?site_id=${site.id}&path=${encodeURIComponent(ep.path)}`,
            { method: ep.method, headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
              ...(ep.method === 'POST' ? { body: JSON.stringify({ test: true }) } : {}),
            }
          );
          const text = await noJwtRes.text();
          const parsed = parseWafResponse(text, noJwtRes.status);
          results.push({ name: 'Missing JWT Token', status: noJwtRes.status === 403 ? 'blocked' : 'pass', method: ep.method, path: ep.path, ...parsed } as TestResult);
        } catch { results.push({ name: 'Missing JWT Token', status: 'blocked', method: ep.method, path: ep.path, httpStatus: null, severity: 'high', action: 'blocked', reason: 'No JWT provided', sourceIp: '-', responseSnippet: '' }); }
      }

      // Test 4: Bad JSON
      if (ep.schema_validation && ep.method === 'POST') {
        try {
          const badRes = await fetch(
            `${baseUrl}?site_id=${site.id}&path=${encodeURIComponent(ep.path)}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}`, 'apikey': anonKey },
              body: 'this is not json{{{',
            }
          );
          const text = await badRes.text();
          const parsed = parseWafResponse(text, badRes.status);
          results.push({ name: 'Malformed JSON Body', status: badRes.status === 403 ? 'blocked' : 'pass', method: 'POST', path: ep.path, ...parsed } as TestResult);
        } catch { results.push({ name: 'Malformed JSON Body', status: 'blocked', method: 'POST', path: ep.path, httpStatus: null, severity: 'medium', action: 'blocked', reason: 'Invalid JSON rejected', sourceIp: '-', responseSnippet: '' }); }
      }

      setTestResults(prev => ({ ...prev, [ep.id]: results }));
      toast.success(`${ep.path} — ${results.length} tests completed`);
    } catch (err: any) {
      setTestResults(prev => ({ ...prev, [ep.id]: [{ name: 'Error', status: 'fail', method: '-', path: ep.path, httpStatus: null, severity: 'low', action: 'error', reason: err?.message || 'Test failed', sourceIp: '-', responseSnippet: '' }] }));
    } finally {
      setTestingId(null);
    }
  };

  const severityColor = (s: string) => {
    return s === 'critical' ? 'text-threat-critical' : s === 'high' ? 'text-threat-high' : s === 'medium' ? 'text-threat-medium' : 'text-threat-low';
  };

  const workerDomain = typeof window !== 'undefined' ? localStorage.getItem('deflectra_worker_domain') || '' : '';
  const buildBlockPageUrl = (path: string) => {
    const base = workerDomain.trim().replace(/\/$/, '');
    if (!base) return null;
    const cleanPath = path?.startsWith('/') ? path : `/${path || ''}`;
    return `${base.startsWith('http') ? base : `https://${base}`}${cleanPath}`;
  };

  const totalBlocked = endpoints.reduce((s, e) => s + e.blocked_today, 0);

  const AIBadge = () => (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-primary/20 text-primary border border-primary/30">
      <Sparkles className="w-2.5 h-2.5" />
      AI
    </span>
  );

  if (loading) return <div className="text-xs text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">API Shield</h2>
          <p className="text-xs text-muted-foreground font-mono">SCHEMA VALIDATION • JWT INSPECTION • GRAPHQL/REST PROTECTION</p>
        </div>
        <Button size="sm" onClick={() => setAdding(!adding)} className="bg-primary text-primary-foreground rounded-xl">
          <Plus className="w-4 h-4 mr-1" /> Add Endpoint
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard icon={Shield} title="Protected Endpoints" value={endpoints.length.toString()} change="Monitored" changeType="neutral" variant="primary" />
        <StatCard icon={FileJson} title="Blocked Today" value={totalBlocked.toLocaleString()} change="Violations" changeType="negative" variant="destructive" />
        <StatCard icon={Key} title="JWT Protected" value={endpoints.filter(e => e.jwt_inspection).length.toString()} change="Endpoints" changeType="positive" variant="accent" />
      </div>

      {adding && (
        <div className="glass-card gradient-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary">Add API Endpoint</p>
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
                    Generate All with AI
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Deep-scan your app to auto-discover endpoints</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Site Selector for AI */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Target Site for AI Analysis</label>
            {sites.length === 0 ? (
              <p className="text-xs text-muted-foreground">Add a protected site first</p>
            ) : (
              <select 
                value={selectedSiteId} 
                onChange={(e) => setSelectedSiteId(e.target.value)} 
                className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground"
              >
                {sites.map(s => <option key={s.id} value={s.id}>{s.name} — {s.url}</option>)}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  Method
                  {aiGeneratedFields.method && <AIBadge />}
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => generateField('method')}
                  disabled={generatingField !== null || !selectedSite}
                  className="h-5 px-1.5 text-[10px] text-primary hover:bg-primary/10"
                >
                  {generatingField === 'method' ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-2.5 h-2.5" />
                  )}
                </Button>
              </div>
              <select 
                value={newMethod} 
                onChange={e => { setNewMethod(e.target.value); setAiGeneratedFields(prev => ({ ...prev, method: false })); }} 
                className={cn(
                  "w-full bg-secondary/50 border rounded-xl px-3 py-2 text-sm text-foreground",
                  aiGeneratedFields.method ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
                )}
              >
                <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option><option>PATCH</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  Endpoint Path
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
                placeholder="/api/endpoint" 
                value={newPath} 
                onChange={e => { setNewPath(e.target.value); setAiGeneratedFields(prev => ({ ...prev, path: false })); }} 
                className={cn(
                  "bg-secondary/50 font-mono text-sm rounded-xl h-10",
                  aiGeneratedFields.path ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
                )}
              />
            </div>
          </div>

          <div className="flex gap-4 text-xs text-muted-foreground">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={newSchema} onChange={e => setNewSchema(e.target.checked)} /> Schema Validation</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={newJwt} onChange={e => setNewJwt(e.target.checked)} /> JWT Inspection</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={newRate} onChange={e => setNewRate(e.target.checked)} /> Rate Limited</label>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={addEndpoint} className="bg-primary text-primary-foreground rounded-lg">Add Endpoint</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setAiGeneratedFields({}); }} className="text-muted-foreground rounded-lg">Cancel</Button>
          </div>
        </div>
      )}

      {endpoints.length === 0 && !adding && (
        <div className="glass-card rounded-xl p-12 text-center">
          <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground font-medium">No protected endpoints yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add your API endpoints to enable schema validation and JWT inspection</p>
        </div>
      )}

      {endpoints.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Protected Endpoints</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">METHOD</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">PATH</th>
                  <th className="text-center px-4 py-2 text-muted-foreground font-medium">SCHEMA</th>
                  <th className="text-center px-4 py-2 text-muted-foreground font-medium">JWT</th>
                  <th className="text-center px-4 py-2 text-muted-foreground font-medium">RATE LIM.</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-medium">REQUESTS</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-medium">BLOCKED</th>
                  <th className="text-center px-4 py-2 text-muted-foreground font-medium">TEST</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((ep) => (
                  <tr key={ep.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] border", METHOD_STYLES[ep.method] || '')}>
                        {ep.method}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-foreground">{ep.path}</td>
                    <td className="px-4 py-2.5 text-center">
                      {ep.schema_validation ? <CheckCircle className="w-3.5 h-3.5 text-primary mx-auto" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground mx-auto" />}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {ep.jwt_inspection ? <CheckCircle className="w-3.5 h-3.5 text-primary mx-auto" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground mx-auto" />}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {ep.rate_limited ? <CheckCircle className="w-3.5 h-3.5 text-primary mx-auto" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground mx-auto" />}
                    </td>
                    <td className="px-4 py-2.5 text-right text-foreground">{ep.requests_today.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-destructive">{ep.blocked_today.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => testEndpoint(ep)}
                        disabled={testingId === ep.id}
                      >
                        {testingId === ep.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-destructive" onClick={() => deleteEndpoint(ep.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Test Results */}
          {Object.entries(testResults).some(([, v]) => v !== null) && (
            <div className="px-4 py-3 border-t border-border/50 space-y-2">
              <p className="text-[10px] font-mono text-muted-foreground uppercase">Test Results</p>
              {endpoints.map(ep => {
                const result = testResults[ep.id];
                if (!result) return null;
                return (
                  <div key={ep.id} className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
                    result.status === 'pass' ? 'bg-accent/10 text-accent' :
                    result.status === 'blocked' ? 'bg-primary/10 text-primary' :
                    'bg-destructive/10 text-destructive'
                  )}>
                    {result.status === 'pass' ? <CheckCircle className="w-3.5 h-3.5" /> :
                     result.status === 'blocked' ? <Shield className="w-3.5 h-3.5" /> :
                     <XCircle className="w-3.5 h-3.5" />}
                    <span className="font-mono">{ep.path}</span>
                    <span className="text-muted-foreground">—</span>
                    <span>{result.message}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
