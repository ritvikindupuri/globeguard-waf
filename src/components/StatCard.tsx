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

const variantStyles = {
  default: 'border-border',
  primary: 'border-primary/20 glow-primary',
  accent: 'border-accent/20 glow-accent',
  destructive: 'border-destructive/20 glow-destructive',
  warning: 'border-warning/20',
};

const iconVariantStyles = {
  default: 'bg-secondary text-foreground',
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/10 text-accent',
  destructive: 'bg-destructive/10 text-destructive',
  warning: 'bg-warning/10 text-warning',
};

export default function StatCard({ title, value, change, changeType = 'neutral', icon: Icon, variant = 'default' }: StatCardProps) {
  return (
    <div className={cn(
      "bg-card border rounded-lg p-4 transition-all duration-300 hover:bg-secondary/30",
      variantStyles[variant]
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold font-mono text-foreground">{value}</p>
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
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconVariantStyles[variant])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
