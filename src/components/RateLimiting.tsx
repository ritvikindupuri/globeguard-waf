import { useState, useEffect } from 'react';
import { Zap, Plus, ToggleLeft, ToggleRight, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import StatCard from './StatCard';

interface RateLimitRule {
  id: string;
  name: string;
  path: string;
  max_requests: number;
  window_seconds: number;
  action: string;
  enabled: boolean;
  triggered_count: number;
}

interface ProtectedSite {
  id: string;
  name: string;
  url: string;
}

interface AIGeneratedFields {
  name?: boolean;
  path?: boolean;
  max_requests?: boolean;
  window_seconds?: boolean;
}

const actionStyles: Record<string, string> = {
  block: 'text-destructive',
  challenge: 'text-warning',
  throttle: 'text-primary',
};

const windowLabel = (s: number) => {
  if (s < 60) return `${s}s`;
  return `${Math.round(s / 60)} min`;
};

export default function RateLimiting() {
  const { user } = useAuth();
  const [rules, setRules] = useState<RateLimitRule[]>([]);
  const [sites, setSites] = useState<ProtectedSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');
  const [newLimit, setNewLimit] = useState('100');
  const [newWindow, setNewWindow] = useState('60');
  const [newAction, setNewAction] = useState('block');

  // AI generation state
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [aiGeneratedFields, setAiGeneratedFields] = useState<AIGeneratedFields>({});

  useEffect(() => {
    if (!user) return;
    loadRules();
    loadSites();
  }, [user]);

  const loadRules = async () => {
    const { data } = await supabase
      .from('rate_limit_rules')
      .select('*')
      .order('created_at', { ascending: false });
    setRules((data as any) || []);
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
        body: { site_url: selectedSite.url, context: 'rate_limiting', field },
      });

      if (error) throw error;
      if (!data?.success || !data?.data) throw new Error('AI generation failed');

      const result = data.data;
      
      if (field === 'path' && result.value) {
        setNewPath(result.value);
        setAiGeneratedFields(prev => ({ ...prev, path: true }));
        toast.success(`Path: ${result.value} (${result.endpoint_type || 'detected'})`);
      } else if (field === 'name' && result.value) {
        setNewName(result.value);
        setAiGeneratedFields(prev => ({ ...prev, name: true }));
        toast.success(`Rule: ${result.value}`);
      } else if (field === 'max_requests' && result.value) {
        setNewLimit(String(result.value));
        setAiGeneratedFields(prev => ({ ...prev, max_requests: true }));
        toast.success(`Limit: ${result.value} - ${result.reasoning || ''}`);
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
        body: { site_url: selectedSite.url, context: 'rate_limiting' },
      });

      if (error) throw error;
      if (!data?.success || !data?.data?.rules?.[0]) throw new Error('AI generation failed');

      const rule = data.data.rules[0];
      setNewName(rule.name);
      setNewPath(rule.path);
      setNewLimit(String(rule.max_requests));
      setNewWindow(String(rule.window_seconds));
      setNewAction(rule.action);
      setAiGeneratedFields({ name: true, path: true, max_requests: true, window_seconds: true });
      
      toast.success(`Discovered ${data.data.detected_endpoints?.length || 0} endpoints from ${selectedSite.name}`);
    } catch (err: any) {
      toast.error(err.message || 'AI generation failed');
    } finally {
      setGeneratingField(null);
    }
  };

  const toggleRule = async (id: string) => {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;
    await supabase.from('rate_limit_rules').update({ enabled: !rule.enabled } as any).eq('id', id);
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    toast.success('Rule updated');
  };

  const deleteRule = async (id: string) => {
    await supabase.from('rate_limit_rules').delete().eq('id', id);
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success('Rule deleted');
  };

  const addRule = async () => {
    if (!user || !newName || !newPath) {
      toast.error('Name and path required');
      return;
    }
    const { data, error } = await supabase.from('rate_limit_rules').insert({
      user_id: user.id,
      name: newName,
      path: newPath,
      max_requests: parseInt(newLimit) || 100,
      window_seconds: parseInt(newWindow) || 60,
      action: newAction,
    } as any).select().single();
    if (error) { toast.error('Failed to add rule'); return; }
    setRules(prev => [(data as any), ...prev]);
    setNewName(''); setNewPath(''); setNewLimit('100'); setNewWindow('60'); setNewAction('block');
    setAdding(false);
    setAiGeneratedFields({});
    toast.success('Rate limit rule added');
  };

  const totalTriggered = rules.reduce((s, r) => s + r.triggered_count, 0);

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
          <h2 className="text-lg font-semibold text-foreground">Rate Limiting</h2>
          <p className="text-xs text-muted-foreground font-mono">DDOS PROTECTION • REQUEST THROTTLING • ABUSE PREVENTION</p>
        </div>
        <Button size="sm" onClick={() => setAdding(!adding)} className="bg-primary text-primary-foreground rounded-xl">
          <Plus className="w-4 h-4 mr-1" /> Add Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard icon={Zap} title="Total Rules" value={rules.length.toString()} change="Active" changeType="neutral" variant="primary" />
        <StatCard icon={Zap} title="Times Triggered" value={totalTriggered.toLocaleString()} change="All time" changeType="neutral" variant="warning" />
        <StatCard icon={Zap} title="Active Rules" value={rules.filter(r => r.enabled).length.toString()} change="Enabled" changeType="positive" variant="accent" />
      </div>

      {adding && (
        <div className="glass-card gradient-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary">New Rate Limit Rule</p>
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
                  <p className="text-xs">Deep-scan your app to auto-discover rate limit targets</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Site Selector */}
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
                  Rule Name
                  {aiGeneratedFields.name && <AIBadge />}
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => generateField('name')}
                  disabled={generatingField !== null || !selectedSite}
                  className="h-5 px-1.5 text-[10px] text-primary hover:bg-primary/10"
                >
                  {generatingField === 'name' ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-2.5 h-2.5" />
                  )}
                </Button>
              </div>
              <Input 
                placeholder="Rule name" 
                value={newName} 
                onChange={e => { setNewName(e.target.value); setAiGeneratedFields(prev => ({ ...prev, name: false })); }} 
                className={cn(
                  "bg-secondary/50 text-sm rounded-xl h-10",
                  aiGeneratedFields.name ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
                )}
              />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  Path Pattern
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
                placeholder="Path pattern (e.g. /api/*)" 
                value={newPath} 
                onChange={e => { setNewPath(e.target.value); setAiGeneratedFields(prev => ({ ...prev, path: false })); }} 
                className={cn(
                  "bg-secondary/50 font-mono text-sm rounded-xl h-10",
                  aiGeneratedFields.path ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
                )}
              />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  Max Requests
                  {aiGeneratedFields.max_requests && <AIBadge />}
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => generateField('max_requests')}
                  disabled={generatingField !== null || !selectedSite}
                  className="h-5 px-1.5 text-[10px] text-primary hover:bg-primary/10"
                >
                  {generatingField === 'max_requests' ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-2.5 h-2.5" />
                  )}
                </Button>
              </div>
              <Input 
                type="number" 
                placeholder="Max requests" 
                value={newLimit} 
                onChange={e => { setNewLimit(e.target.value); setAiGeneratedFields(prev => ({ ...prev, max_requests: false })); }} 
                className={cn(
                  "bg-secondary/50 text-sm rounded-xl h-10",
                  aiGeneratedFields.max_requests ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
                )}
              />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  Window (seconds)
                  {aiGeneratedFields.window_seconds && <AIBadge />}
                </label>
              </div>
              <Input 
                type="number" 
                placeholder="Window (seconds)" 
                value={newWindow} 
                onChange={e => { setNewWindow(e.target.value); setAiGeneratedFields(prev => ({ ...prev, window_seconds: false })); }} 
                className={cn(
                  "bg-secondary/50 text-sm rounded-xl h-10",
                  aiGeneratedFields.window_seconds ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
                )}
              />
            </div>
          </div>

          <select value={newAction} onChange={e => setNewAction(e.target.value)} className="bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground w-full">
            <option value="block">Block</option>
            <option value="challenge">Challenge</option>
            <option value="throttle">Throttle</option>
          </select>

          <div className="flex gap-2">
            <Button size="sm" onClick={addRule} className="bg-primary text-primary-foreground rounded-lg">Add Rule</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setAiGeneratedFields({}); }} className="text-muted-foreground rounded-lg">Cancel</Button>
          </div>
        </div>
      )}

      {rules.length === 0 && !adding && (
        <div className="glass-card rounded-xl p-12 text-center">
          <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground font-medium">No rate limit rules yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add rules to protect your endpoints from abuse</p>
        </div>
      )}

      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className={cn(
            "glass-card rounded-lg p-4 flex items-center justify-between transition-all",
            !rule.enabled && 'opacity-50'
          )}>
            <div className="flex items-center gap-3">
              <button onClick={() => toggleRule(rule.id)}>
                {rule.enabled ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
              </button>
              <div>
                <p className="text-sm font-semibold text-foreground">{rule.name}</p>
                <p className="text-xs font-mono text-muted-foreground">{rule.path}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-mono text-muted-foreground">LIMIT</p>
                <p className="text-sm font-mono text-foreground">{rule.max_requests} / {windowLabel(rule.window_seconds)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-mono text-muted-foreground">ACTION</p>
                <p className={cn("text-xs font-mono uppercase", actionStyles[rule.action] || 'text-foreground')}>{rule.action}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-mono text-muted-foreground">TRIGGERED</p>
                <p className="text-sm font-bold font-mono text-foreground">{rule.triggered_count.toLocaleString()}</p>
              </div>
              <Button size="icon" variant="ghost" className="w-8 h-8 text-muted-foreground hover:text-destructive" onClick={() => deleteRule(rule.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
