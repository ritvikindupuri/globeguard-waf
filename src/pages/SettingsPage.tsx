import { useState, useEffect } from 'react';
import { Settings, Shield, Bell, Key, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [paranoiaLevel, setParanoiaLevel] = useState('1');
  const [defaultAction, setDefaultAction] = useState('block');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [alertEmail, setAlertEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('waf_settings')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (data) {
      setParanoiaLevel(data.paranoia_level.toString());
      setDefaultAction(data.default_action);
      setWebhookUrl(data.webhook_url || '');
      setAlertEmail(data.alert_email || '');
    }
    setLoaded(true);
  };

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);

    const settings = {
      user_id: user.id,
      paranoia_level: parseInt(paranoiaLevel),
      default_action: defaultAction,
      webhook_url: webhookUrl || null,
      alert_email: alertEmail || null,
    };

    const { error } = await supabase
      .from('waf_settings')
      .upsert(settings, { onConflict: 'user_id' });

    if (error) {
      toast.error('Failed to save settings');
    } else {
      toast.success('Settings saved');
    }
    setSaving(false);
  };

  if (!loaded) {
    return <div className="text-xs font-mono text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-xs font-mono text-muted-foreground mt-1">WAF CONFIGURATION • NOTIFICATIONS • SECURITY</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> Security Settings
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-mono text-muted-foreground block mb-1">PARANOIA LEVEL</label>
            <select
              value={paranoiaLevel}
              onChange={(e) => setParanoiaLevel(e.target.value)}
              className="bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground w-full font-mono"
            >
              <option value="1">Level 1 — Low (Fewer false positives)</option>
              <option value="2">Level 2 — Medium (Balanced)</option>
              <option value="3">Level 3 — High (Aggressive)</option>
              <option value="4">Level 4 — Paranoid (Maximum protection)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-mono text-muted-foreground block mb-1">DEFAULT ACTION</label>
            <select
              value={defaultAction}
              onChange={(e) => setDefaultAction(e.target.value)}
              className="bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground w-full font-mono"
            >
              <option value="block">Block</option>
              <option value="challenge">Challenge</option>
              <option value="log">Log Only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> Notifications
        </h3>
        <div>
          <label className="text-xs font-mono text-muted-foreground block mb-1">WEBHOOK URL</label>
          <Input
            placeholder="https://hooks.slack.com/..."
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="bg-secondary border-border font-mono text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-mono text-muted-foreground block mb-1">ALERT EMAIL</label>
          <Input
            placeholder="security@yourcompany.com"
            value={alertEmail}
            onChange={(e) => setAlertEmail(e.target.value)}
            className="bg-secondary border-border text-sm"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" /> Account
        </h3>
        <div>
          <label className="text-xs font-mono text-muted-foreground block mb-1">LOGGED IN AS</label>
          <p className="text-sm font-mono text-foreground">{user?.email}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={signOut}
          className="text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          <LogOut className="w-3.5 h-3.5 mr-1" /> Sign Out
        </Button>
      </div>

      <Button onClick={saveSettings} disabled={saving} className="bg-primary text-primary-foreground">
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
}
