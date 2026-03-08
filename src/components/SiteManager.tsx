import { useState, useEffect } from 'react';
import { Plus, Globe, Shield, Trash2, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';

type ProtectedSite = Tables<'protected_sites'>;

export default function SiteManager() {
  const { user } = useAuth();
  const [sites, setSites] = useState<ProtectedSite[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadSites();
  }, [user]);

  const loadSites = async () => {
    const { data, error } = await supabase
      .from('protected_sites')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to load sites');
    } else {
      setSites(data || []);
    }
    setLoading(false);
  };

  const handleAddSite = async () => {
    if (!user || !newUrl) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      new URL(newUrl);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    const { data, error } = await supabase
      .from('protected_sites')
      .insert({
        user_id: user.id,
        url: newUrl,
        name: newName || new URL(newUrl).hostname,
        status: 'pending',
        ssl_valid: newUrl.startsWith('https'),
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add site');
      return;
    }

    setSites(prev => [data, ...prev]);
    setNewUrl('');
    setNewName('');
    setAdding(false);
    toast.success(`${data.name} added to WAF protection`);

    // Simulate activation
    setTimeout(async () => {
      await supabase.from('protected_sites').update({ status: 'active' }).eq('id', data.id);
      setSites(prev => prev.map(s => s.id === data.id ? { ...s, status: 'active' } : s));
    }, 3000);
  };

  const removeSite = async (id: string) => {
    const { error } = await supabase.from('protected_sites').delete().eq('id', id);
    if (error) {
      toast.error('Failed to remove site');
      return;
    }
    setSites(prev => prev.filter(s => s.id !== id));
    toast.success('Site removed from protection');
  };

  const statusStyles: Record<string, string> = {
    active: 'text-accent',
    inactive: 'text-muted-foreground',
    pending: 'text-warning animate-pulse',
  };

  if (loading) {
    return <div className="text-xs font-mono text-muted-foreground">Loading sites...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Protected Sites</h2>
        <Button
          size="sm"
          onClick={() => setAdding(!adding)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Site
        </Button>
      </div>

      {adding && (
        <div className="bg-card border border-primary/20 rounded-lg p-4 space-y-3 glow-primary">
          <p className="text-xs font-mono text-primary uppercase tracking-wider">Add New Protected Site</p>
          <Input
            placeholder="https://your-app.com"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="bg-secondary border-border font-mono text-sm"
          />
          <Input
            placeholder="Site name (optional)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-secondary border-border text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddSite} className="bg-primary text-primary-foreground">
              <Shield className="w-3 h-3 mr-1" /> Protect Site
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="text-muted-foreground">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {sites.length === 0 && !adding && (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No protected sites yet</p>
          <p className="text-xs font-mono text-muted-foreground mt-1">Add your first site to begin WAF protection</p>
        </div>
      )}

      <div className="space-y-2">
        {sites.map((site) => (
          <div key={site.id} className="bg-card border border-border rounded-lg p-4 hover:bg-secondary/20 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center">
                  <Globe className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{site.name}</p>
                    <span className={cn("text-[10px] font-mono uppercase", statusStyles[site.status])}>
                      ● {site.status}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">{site.url}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs font-mono text-muted-foreground">THREATS BLOCKED</p>
                  <p className="text-sm font-bold font-mono text-foreground">{site.threats_blocked.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-muted-foreground">SSL</p>
                  {site.ssl_valid ? (
                    <CheckCircle className="w-4 h-4 text-accent" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="w-8 h-8 text-muted-foreground hover:text-foreground">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="w-8 h-8 text-muted-foreground hover:text-destructive" onClick={() => removeSite(site.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
