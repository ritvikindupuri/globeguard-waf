import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, CheckCheck, Trash2, AlertTriangle, Shield, Server, Info, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  read: boolean;
  dismissed: boolean;
  metadata: any;
  created_at: string;
}

const typeConfig: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  threat: { icon: AlertTriangle, color: 'text-destructive', label: 'Threat Alert' },
  system: { icon: Server, color: 'text-primary', label: 'System' },
  info: { icon: Info, color: 'text-muted-foreground', label: 'Info' },
  waf: { icon: Shield, color: 'text-accent', label: 'WAF Event' },
};

const severityStyle: Record<string, string> = {
  critical: 'border-l-destructive bg-destructive/5',
  high: 'border-l-threat-high bg-threat-high/5',
  medium: 'border-l-threat-medium bg-threat-medium/5',
  low: 'border-l-threat-low bg-threat-low/5',
  info: 'border-l-primary bg-primary/5',
};

export default function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'threat' | 'system'>('all');

  useEffect(() => {
    if (user) loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('dismissed', false)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } else {
      setNotifications((data as unknown as Notification[]) || []);
    }
    setLoading(false);
  };

  // Also seed from recent threat_logs that don't have notifications yet
  useEffect(() => {
    if (!user || loading) return;
    seedFromThreats();
  }, [user, loading]);

  const seedFromThreats = async () => {
    // Get recent threats
    const { data: threats } = await supabase
      .from('threat_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!threats || threats.length === 0) return;

    // Get existing notification metadata to avoid duplicates
    const existingIds = new Set(
      notifications
        .filter(n => n.metadata?.threat_log_id)
        .map(n => n.metadata.threat_log_id)
    );

    const newNotifications = threats
      .filter(t => !existingIds.has(t.id))
      .slice(0, 10) // Only seed up to 10
      .map(t => {
        const details = t.details as any;
        const explanation = details?.ai_analysis?.reason || details?.explanation || details?.block_reason || '';
        return {
          user_id: t.user_id,
          type: 'threat' as const,
          title: `${t.severity.toUpperCase()}: ${t.threat_type}`,
          message: explanation || `${t.request_method} ${t.request_path} from ${t.source_ip}`,
          severity: t.severity,
          read: false,
          metadata: { threat_log_id: t.id, source_ip: t.source_ip, path: t.request_path },
        };
      });

    if (newNotifications.length > 0) {
      const { error } = await supabase.from('notifications').insert(newNotifications as any);
      if (!error) loadNotifications();
    }
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true } as any).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read: true } as any).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success(`Marked ${unreadIds.length} notifications as read`);
  };

  const dismiss = async (id: string) => {
    await supabase.from('notifications').update({ dismissed: true } as any).eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const dismissAll = async () => {
    const ids = filteredNotifications.map(n => n.id);
    if (ids.length === 0) return;
    await supabase.from('notifications').update({ dismissed: true } as any).in('id', ids);
    setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
    toast.success('All notifications dismissed');
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'threat') return n.type === 'threat';
    if (filter === 'system') return n.type === 'system' || n.type === 'info' || n.type === 'waf';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notification Center
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            Threat alerts, system events, and WAF notifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs rounded-xl" onClick={loadNotifications}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" className="text-xs rounded-xl" onClick={markAllRead}>
              <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark All Read
            </Button>
          )}
          {filteredNotifications.length > 0 && (
            <Button size="sm" variant="outline" className="text-xs rounded-xl text-destructive hover:text-destructive" onClick={dismissAll}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Dismiss All
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {([
          { key: 'all', label: 'All' },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'threat', label: 'Threats' },
          { key: 'system', label: 'System' },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border',
              filter === f.key
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'bg-secondary/50 text-muted-foreground border-border/50 hover:text-foreground hover:border-border'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Loading notifications...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <BellOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Notifications are generated when threats are detected, sites go down, or WAF events occur.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map(n => {
            const config = typeConfig[n.type] || typeConfig.info;
            const Icon = config.icon;
            return (
              <div
                key={n.id}
                className={cn(
                  'glass-card rounded-xl p-4 border-l-4 transition-all cursor-pointer hover:shadow-md',
                  severityStyle[n.severity] || severityStyle.info,
                  !n.read && 'ring-1 ring-primary/20'
                )}
                onClick={() => !n.read && markAsRead(n.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={cn('mt-0.5 shrink-0', config.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">{n.title}</span>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] font-mono text-muted-foreground">{timeAgo(n.created_at)}</span>
                        <span className={cn(
                          'text-[10px] font-mono px-1.5 py-0.5 rounded',
                          n.severity === 'critical' ? 'bg-destructive/10 text-destructive' :
                          n.severity === 'high' ? 'bg-threat-high/10 text-threat-high' :
                          n.severity === 'medium' ? 'bg-threat-medium/10 text-threat-medium' :
                          'bg-muted text-muted-foreground'
                        )}>
                          {n.severity.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">{config.label}</span>
                        {n.metadata?.source_ip && (
                          <span className="text-[10px] font-mono text-muted-foreground">IP: {n.metadata.source_ip}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
