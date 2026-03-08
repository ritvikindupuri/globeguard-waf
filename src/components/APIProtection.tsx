import { useState, useEffect } from 'react';
import { Lock, FileJson, Key, Shield, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newMethod, setNewMethod] = useState('GET');
  const [newPath, setNewPath] = useState('');
  const [newSchema, setNewSchema] = useState(true);
  const [newJwt, setNewJwt] = useState(true);
  const [newRate, setNewRate] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadEndpoints();
  }, [user]);

  const loadEndpoints = async () => {
    const { data } = await supabase.from('api_endpoints').select('*').order('created_at', { ascending: false });
    setEndpoints((data as any) || []);
    setLoading(false);
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
    setNewPath(''); setAdding(false);
    toast.success('Endpoint added to API Shield');
  };

  const deleteEndpoint = async (id: string) => {
    await supabase.from('api_endpoints').delete().eq('id', id);
    setEndpoints(prev => prev.filter(e => e.id !== id));
    toast.success('Endpoint removed');
  };

  const totalBlocked = endpoints.reduce((s, e) => s + e.blocked_today, 0);

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
        <div className="glass-card gradient-border rounded-xl p-5 space-y-3">
          <p className="text-xs font-semibold text-primary">Add API Endpoint</p>
          <div className="grid grid-cols-2 gap-3">
            <select value={newMethod} onChange={e => setNewMethod(e.target.value)} className="bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground">
              <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option><option>PATCH</option>
            </select>
            <Input placeholder="/api/endpoint" value={newPath} onChange={e => setNewPath(e.target.value)} className="bg-secondary/50 border-border font-mono text-sm rounded-xl h-10" />
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={newSchema} onChange={e => setNewSchema(e.target.checked)} /> Schema Validation</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={newJwt} onChange={e => setNewJwt(e.target.checked)} /> JWT Inspection</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={newRate} onChange={e => setNewRate(e.target.checked)} /> Rate Limited</label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addEndpoint} className="bg-primary text-primary-foreground rounded-lg">Add Endpoint</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="text-muted-foreground rounded-lg">Cancel</Button>
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
        </div>
      )}
    </div>
  );
}
