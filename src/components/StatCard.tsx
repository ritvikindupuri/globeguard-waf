import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'accent' | 'destructive' | 'warning';
}

const gradientStyles = {
  default: 'glass-card',
  primary: 'stat-gradient-primary',
  accent: 'stat-gradient-accent',
  destructive: 'stat-gradient-destructive',
  warning: 'stat-gradient-warning',
};

const iconVariantStyles = {
  default: 'bg-secondary text-foreground',
  primary: 'bg-primary/15 text-primary',
  accent: 'bg-accent/15 text-accent',
  destructive: 'bg-destructive/15 text-destructive',
  warning: 'bg-warning/15 text-warning',
};

export default function StatCard({ title, value, change, changeType = 'neutral', icon: Icon, variant = 'default' }: StatCardProps) {
  return (
    <div className={cn(
      "rounded-xl p-4 transition-all duration-300 hover:scale-[1.02]",
      gradientStyles[variant]
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {change && (
            <p className={cn(
              "text-xs font-mono",
              changeType === 'positive' && 'text-accent',
              changeType === 'negative' && 'text-destructive',
              changeType === 'neutral' && 'text-muted-foreground'
            )}>
              {change}
            </p>
          )}
        </div>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconVariantStyles[variant])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
