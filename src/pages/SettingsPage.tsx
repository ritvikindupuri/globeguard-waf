import { Settings, Shield, Bell, Database, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SettingsPage() {
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
            <select className="bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground w-full font-mono">
              <option>Level 1 — Low (Fewer false positives)</option>
              <option>Level 2 — Medium (Balanced)</option>
              <option>Level 3 — High (Aggressive)</option>
              <option>Level 4 — Paranoid (Maximum protection)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-mono text-muted-foreground block mb-1">DEFAULT ACTION</label>
            <select className="bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground w-full font-mono">
              <option>Block</option>
              <option>Challenge</option>
              <option>Log Only</option>
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
          <Input placeholder="https://hooks.slack.com/..." className="bg-secondary border-border font-mono text-sm" />
        </div>
        <div>
          <label className="text-xs font-mono text-muted-foreground block mb-1">ALERT EMAIL</label>
          <Input placeholder="security@yourcompany.com" className="bg-secondary border-border text-sm" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" /> API Keys
        </h3>
        <div>
          <label className="text-xs font-mono text-muted-foreground block mb-1">WAF API KEY</label>
          <div className="flex gap-2">
            <Input value="aegis_waf_k3y_••••••••••••••••" readOnly className="bg-secondary border-border font-mono text-sm flex-1" />
            <Button size="sm" variant="outline" className="text-xs">Regenerate</Button>
          </div>
        </div>
      </div>

      <Button className="bg-primary text-primary-foreground">Save Settings</Button>
    </div>
  );
}
