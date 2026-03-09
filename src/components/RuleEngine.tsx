import { useState, useEffect } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Code, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Tables } from '@/integrations/supabase/types';

type WAFRule = Tables<'waf_rules'>;

interface ProtectedSite {
  id: string;
  name: string;
  url: string;
}

interface AIGeneratedFields {
  name?: boolean;
  pattern?: boolean;
  description?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  sqli: 'SQL INJECTION',
  xss: 'XSS',
  rce: 'RCE',
  lfi: 'LFI',
  custom: 'CUSTOM',
  rate_limit: 'RATE LIMIT',
  geo_block: 'GEO BLOCK',
};

const ACTION_LABELS: Record<string, string> = {
  block: 'BLOCK',
  challenge: 'CHALLENGE',
  log: 'LOG',
  allow: 'ALLOW',
};

const categoryStyles: Record<string, string> = {
  sqli: 'bg-destructive/10 text-destructive border-destructive/30',
  xss: 'bg-warning/10 text-warning border-warning/30',
  rce: 'bg-threat-critical/10 text-threat-critical border-threat-critical/30',
  lfi: 'bg-threat-high/10 text-threat-high border-threat-high/30',
  custom: 'bg-accent/10 text-accent border-accent/30',
  rate_limit: 'bg-primary/10 text-primary border-primary/30',
  geo_block: 'bg-threat-medium/10 text-threat-medium border-threat-medium/30',
};

export default function RuleEngine() {
  const { user } = useAuth();
  const [rules, setRules] = useState<WAFRule[]>([]);
  const [sites, setSites] = useState<ProtectedSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    pattern: '',
    category: 'custom',
    rule_type: 'block',
    severity: 'medium',
  });

  // AI generation state
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [aiGeneratedFields, setAiGeneratedFields] = useState<AIGeneratedFields>({});

  useEffect(() => {
    if (!user) return;
    loadRules();
    loadSites();
  }, [user]);

  const loadRules = async () => {
    const { data, error } = await supabase
      .from('waf_rules')
      .select('*')
      .order('priority', { ascending: true });

    if (!error) setRules(data || []);
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
        body: { site_url: selectedSite.url, context: 'rule_engine', field },
      });

      if (error) throw error;
      if (!data?.success || !data?.data) throw new Error('AI generation failed');

      const result = data.data;
      
      if (field === 'pattern' && result.value) {
        setNewRule(prev => ({ ...prev, pattern: result.value }));
        setAiGeneratedFields(prev => ({ ...prev, pattern: true }));
        toast.success(`Pattern targets: ${result.targets || 'detected vulnerabilities'}`);
      } else if (field === 'name' && result.value) {
        setNewRule(prev => ({ ...prev, name: result.value }));
        setAiGeneratedFields(prev => ({ ...prev, name: true }));
        toast.success(`Rule: ${result.value}`);
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
        body: { site_url: selectedSite.url, context: 'rule_engine' },
      });

      if (error) throw error;
      if (!data?.success || !data?.data?.rules?.[0]) throw new Error('AI generation failed');

      const rule = data.data.rules[0];
      setNewRule({
        name: rule.name,
        description: rule.description,
        pattern: rule.pattern,
        category: rule.category,
        rule_type: rule.rule_type,
        severity: rule.severity,
      });
      setAiGeneratedFields({ name: true, pattern: true, description: true });
      
      const vulns = data.data.detected_vulnerabilities || [];
      toast.success(`Detected ${vulns.length} potential vulnerabilities in ${selectedSite.name}`);
    } catch (err: any) {
      toast.error(err.message || 'AI generation failed');
    } finally {
      setGeneratingField(null);
    }
  };

  const toggleRule = async (id: string) => {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;

    const { error } = await supabase
      .from('waf_rules')
      .update({ enabled: !rule.enabled })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update rule');
      return;
    }

    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    toast.success(`${rule.name} ${rule.enabled ? 'disabled' : 'enabled'}`);
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase.from('waf_rules').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete rule');
      return;
    }
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success('Rule deleted');
  };

  const addRule = async () => {
    if (!user || !newRule.name || !newRule.pattern) {
      toast.error('Name and pattern are required');
      return;
    }

    const { data, error } = await supabase
      .from('waf_rules')
      .insert({
        user_id: user.id,
        name: newRule.name,
        description: newRule.description || null,
        pattern: newRule.pattern,
        category: newRule.category,
        rule_type: newRule.rule_type,
        severity: newRule.severity,
        priority: rules.length + 1,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create rule');
      return;
    }

    setRules(prev => [...prev, data]);
    setNewRule({ name: '', description: '', pattern: '', category: 'custom', rule_type: 'block', severity: 'medium' });
    setAdding(false);
    setAiGeneratedFields({});
    toast.success(`Rule "${data.name}" created`);
  };

  const AIBadge = () => (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-primary/20 text-primary border border-primary/30">
      <Sparkles className="w-2.5 h-2.5" />
      AI
    </span>
  );

  if (loading) {
    return <div className="text-xs font-mono text-muted-foreground">Loading rules...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Rule Engine</h2>
          <p className="text-xs text-muted-foreground font-mono">{rules.filter(r => r.enabled).length} of {rules.length} rules active</p>
        </div>
        <Button size="sm" onClick={() => setAdding(!adding)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1" /> New Rule
        </Button>
      </div>

      {adding && (
        <div className="bg-card border border-primary/20 rounded-lg p-4 space-y-4 glow-primary">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-primary uppercase tracking-wider">Create New WAF Rule</p>
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
                  <p className="text-xs">Deep-scan your app's tech stack for tailored WAF rules</p>
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
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground"
              >
                {sites.map(s => <option key={s.id} value={s.id}>{s.name} — {s.url}</option>)}
              </select>
            )}
          </div>

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
              value={newRule.name} 
              onChange={(e) => { setNewRule(p => ({ ...p, name: e.target.value })); setAiGeneratedFields(prev => ({ ...prev, name: false })); }} 
              className={cn(
                "bg-secondary text-sm",
                aiGeneratedFields.name ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
              )}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                Description
                {aiGeneratedFields.description && <AIBadge />}
              </label>
            </div>
            <Input 
              placeholder="Description" 
              value={newRule.description} 
              onChange={(e) => { setNewRule(p => ({ ...p, description: e.target.value })); setAiGeneratedFields(prev => ({ ...prev, description: false })); }} 
              className={cn(
                "bg-secondary text-sm",
                aiGeneratedFields.description ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
              )}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                Regex Pattern
                {aiGeneratedFields.pattern && <AIBadge />}
              </label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => generateField('pattern')}
                disabled={generatingField !== null || !selectedSite}
                className="h-5 px-1.5 text-[10px] text-primary hover:bg-primary/10"
              >
                {generatingField === 'pattern' ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <Sparkles className="w-2.5 h-2.5" />
                )}
              </Button>
            </div>
            <Input 
              placeholder="Regex pattern e.g. (SELECT|INSERT|DROP)" 
              value={newRule.pattern} 
              onChange={(e) => { setNewRule(p => ({ ...p, pattern: e.target.value })); setAiGeneratedFields(prev => ({ ...prev, pattern: false })); }} 
              className={cn(
                "bg-secondary font-mono text-sm",
                aiGeneratedFields.pattern ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <select value={newRule.category} onChange={(e) => setNewRule(p => ({ ...p, category: e.target.value }))} className="bg-secondary border border-border rounded px-2 py-1.5 text-xs text-foreground font-mono">
              <option value="sqli">SQL Injection</option>
              <option value="xss">XSS</option>
              <option value="rce">RCE</option>
              <option value="lfi">LFI</option>
              <option value="custom">Custom</option>
              <option value="rate_limit">Rate Limit</option>
              <option value="geo_block">Geo Block</option>
            </select>
            <select value={newRule.rule_type} onChange={(e) => setNewRule(p => ({ ...p, rule_type: e.target.value }))} className="bg-secondary border border-border rounded px-2 py-1.5 text-xs text-foreground font-mono">
              <option value="block">Block</option>
              <option value="challenge">Challenge</option>
              <option value="log">Log</option>
              <option value="allow">Allow</option>
            </select>
            <select value={newRule.severity} onChange={(e) => setNewRule(p => ({ ...p, severity: e.target.value }))} className="bg-secondary border border-border rounded px-2 py-1.5 text-xs text-foreground font-mono">
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={addRule} className="bg-primary text-primary-foreground">Create Rule</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setAiGeneratedFields({}); }} className="text-muted-foreground">Cancel</Button>
          </div>
        </div>
      )}

      {rules.length === 0 && !adding && (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <Code className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No WAF rules configured</p>
          <p className="text-xs font-mono text-muted-foreground mt-1">Add your first rule to start protecting your sites</p>
        </div>
      )}

      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className={cn(
            "bg-card border rounded-lg transition-all",
            rule.enabled ? 'border-border' : 'border-border/50 opacity-60'
          )}>
            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(expanded === rule.id ? null : rule.id)}>
              <div className="flex items-center gap-3">
                <button onClick={(e) => { e.stopPropagation(); toggleRule(rule.id); }}>
                  {rule.enabled ? (
                    <ToggleRight className="w-6 h-6 text-accent" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                  )}
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{rule.name}</p>
                    <span className={cn("px-2 py-0.5 rounded text-[9px] font-mono uppercase border", categoryStyles[rule.category] || categoryStyles.custom)}>
                      {CATEGORY_LABELS[rule.category] || rule.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{rule.description || 'No description'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-mono text-muted-foreground">SEVERITY</p>
                  <p className="text-xs font-mono text-foreground uppercase">{rule.severity}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono text-muted-foreground">ACTION</p>
                  <p className="text-xs font-mono text-foreground">{ACTION_LABELS[rule.rule_type] || rule.rule_type}</p>
                </div>
                {expanded === rule.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            {expanded === rule.id && (
              <div className="px-4 pb-4 border-t border-border/50 pt-3">
                <div className="mb-3">
                  <p className="text-[10px] font-mono text-muted-foreground mb-1">PATTERN</p>
                  <code className="block bg-secondary/50 rounded px-3 py-2 text-xs font-mono text-primary break-all">
                    {rule.pattern}
                  </code>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => deleteRule(rule.id)}>
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
