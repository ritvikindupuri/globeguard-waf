import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { time: '00:00', requests: 2400, blocked: 120, challenged: 45 },
  { time: '02:00', requests: 1800, blocked: 80, challenged: 30 },
  { time: '04:00', requests: 1200, blocked: 60, challenged: 20 },
  { time: '06:00', requests: 2800, blocked: 150, challenged: 55 },
  { time: '08:00', requests: 5600, blocked: 280, challenged: 95 },
  { time: '10:00', requests: 8200, blocked: 410, challenged: 140 },
  { time: '12:00', requests: 9500, blocked: 520, challenged: 180 },
  { time: '14:00', requests: 8800, blocked: 480, challenged: 160 },
  { time: '16:00', requests: 7200, blocked: 350, challenged: 120 },
  { time: '18:00', requests: 6400, blocked: 300, challenged: 100 },
  { time: '20:00', requests: 4800, blocked: 220, challenged: 75 },
  { time: '22:00', requests: 3200, blocked: 160, challenged: 55 },
];

export default function TrafficChart() {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Traffic Overview</h3>
        <div className="flex gap-4 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">REQUESTS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            <span className="text-muted-foreground">BLOCKED</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-muted-foreground">CHALLENGED</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorReqs" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(185, 100%, 50%)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(185, 100%, 50%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(0, 85%, 55%)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(0, 85%, 55%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 12%)" />
          <XAxis dataKey="time" tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 10 }} stroke="hsl(220, 15%, 12%)" />
          <YAxis tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 10 }} stroke="hsl(220, 15%, 12%)" />
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
          <Area type="monotone" dataKey="requests" stroke="hsl(185, 100%, 50%)" fill="url(#colorReqs)" strokeWidth={2} />
          <Area type="monotone" dataKey="blocked" stroke="hsl(0, 85%, 55%)" fill="url(#colorBlocked)" strokeWidth={2} />
          <Area type="monotone" dataKey="challenged" stroke="hsl(38, 100%, 55%)" fill="transparent" strokeWidth={1.5} strokeDasharray="4 2" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
