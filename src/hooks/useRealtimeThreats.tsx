import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ShieldAlert } from 'lucide-react';

export function useRealtimeThreats() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('threat-blocks')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'threat_logs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const threat = payload.new as any;
          if (threat.action_taken === 'blocked') {
            toast.error(
              `🛡️ Attack blocked from ${threat.source_ip}`,
              {
                description: `${threat.threat_type} — ${threat.request_method} ${threat.request_path}`,
                duration: 8000,
              }
            );
          } else {
            toast.warning(
              `⚠️ Threat detected from ${threat.source_ip}`,
              {
                description: `${threat.threat_type} (${threat.severity}) — logged`,
                duration: 6000,
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
}
