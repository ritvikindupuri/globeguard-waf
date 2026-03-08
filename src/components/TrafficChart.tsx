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
    // Get threats from last 24 hours grouped by hour
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: threats } = await supabase
      .from('threat_logs')
      .select('created_at, action_taken')
      .gte('created_at', since)
      .order('created_at', { ascending: true });

    if (!threats || threats.length === 0) {
      // Show empty 24h timeline
      const emptyData: TrafficDataPoint[] = [];
      for (let h = 0; h < 24; h += 2) {
        emptyData.push({
          time: `${h.toString().padStart(2, '0')}:00`,
          threats: 0,
        });
      }
      setData(emptyData);
      return;
    }

    // Group by 2-hour buckets
    const buckets: Record<string, number> = {};
    for (let h = 0; h < 24; h += 2) {
      buckets[`${h.toString().padStart(2, '0')}:00`] = 0;
    }

    threats.forEach(t => {
      const hour = new Date(t.created_at).getHours();
      const bucket = Math.floor(hour / 2) * 2;
      const key = `${bucket.toString().padStart(2, '0')}:00`;
      buckets[key] = (buckets[key] || 0) + 1;
    });

    setData(Object.entries(buckets).map(([time, threats]) => ({ time, threats })));
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Threat Activity (24h)</h3>
        <div className="flex gap-4 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            <span className="text-muted-foreground">THREATS</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(0, 85%, 55%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(0, 85%, 55%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 12%)" />
          <XAxis dataKey="time" tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 10 }} stroke="hsl(220, 15%, 12%)" />
          <YAxis tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 10 }} stroke="hsl(220, 15%, 12%)" allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(220, 18%, 7%)',
              border: '1px solid hsl(220, 15%, 15%)',
              borderRadius: '8px',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono',
            }}
            labelStyle={{ color: 'hsl(200, 20%, 90%)' }}
          />
          <Area type="monotone" dataKey="threats" stroke="hsl(0, 85%, 55%)" fill="url(#colorThreats)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
      {data.every(d => d.threats === 0) && (
        <p className="text-xs font-mono text-muted-foreground text-center mt-2">
          No threat data yet — use AI Detection to analyze requests
        </p>
      )}
    </div>
  );
}
