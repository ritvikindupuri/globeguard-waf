import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TrafficDataPoint {
  time: string;
  threats: number;
}

export default function TrafficChart() {
  const { user } = useAuth();
  const [data, setData] = useState<TrafficDataPoint[]>([]);

  useEffect(() => {
    if (!user) return;
    loadTrafficData();
  }, [user]);

  const loadTrafficData = async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: threats } = await supabase
      .from('threat_logs')
      .select('created_at, action_taken')
      .gte('created_at', since)
      .order('created_at', { ascending: true });

    const buckets: Record<string, number> = {};
    for (let h = 0; h < 24; h += 2) {
      buckets[`${h.toString().padStart(2, '0')}:00`] = 0;
    }

    (threats || []).forEach(t => {
      const hour = new Date(t.created_at).getHours();
      const bucket = Math.floor(hour / 2) * 2;
      const key = `${bucket.toString().padStart(2, '0')}:00`;
      buckets[key] = (buckets[key] || 0) + 1;
    });

    setData(Object.entries(buckets).map(([time, threats]) => ({ time, threats })));
  };

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Threat Activity (24h)</h3>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-destructive" />
          <span className="text-[10px] font-mono text-muted-foreground">THREATS</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 18%, 16%)" />
          <XAxis dataKey="time" tick={{ fill: 'hsl(240, 10%, 50%)', fontSize: 10 }} stroke="hsl(240, 18%, 16%)" />
          <YAxis tick={{ fill: 'hsl(240, 10%, 50%)', fontSize: 10 }} stroke="hsl(240, 18%, 16%)" allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(240, 22%, 10%)',
              border: '1px solid hsl(240, 18%, 16%)',
              borderRadius: '12px',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono',
            }}
            labelStyle={{ color: 'hsl(240, 10%, 95%)' }}
          />
          <Area type="monotone" dataKey="threats" stroke="hsl(262, 83%, 58%)" fill="url(#colorThreats)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
      {data.every(d => d.threats === 0) && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          No threat data yet — use AI Detection to analyze traffic
        </p>
      )}
    </div>
  );
}
