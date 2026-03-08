import { NavLink, useLocation } from 'react-router-dom';
import { 
  Globe, FileCode, AlertTriangle, Activity, 
  Server, Settings, Zap, Brain, Lock, LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import deflectraLogo from '@/assets/deflectra-logo.png';

const navItems = [
  { to: '/', icon: Activity, label: 'Dashboard' },
  { to: '/globe', icon: Globe, label: 'Threat Map' },
  { to: '/sites', icon: Server, label: 'Protected Sites' },
  { to: '/rules', icon: FileCode, label: 'Rule Engine' },
  { to: '/threats', icon: AlertTriangle, label: 'Threat Intel' },
  { to: '/api-protection', icon: Lock, label: 'API Shield' },
  { to: '/ai-detection', icon: Brain, label: 'AI Detection' },
  { to: '/rate-limiting', icon: Zap, label: 'Rate Limiting' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function WAFSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <aside className="w-64 h-screen bg-card border-r border-border flex flex-col fixed left-0 top-0 z-40">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <img src={deflectraLogo} alt="Deflectra" className="w-9 h-9 rounded-lg" />
          <div>
            <h1 className="text-sm font-bold text-foreground tracking-wide">DEFLECTRA</h1>
            <p className="text-[10px] font-mono text-muted-foreground tracking-widest">WEB APP FIREWALL</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
          <span className="text-xs font-mono text-accent">SYSTEM ACTIVE</span>
        </div>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-5 py-2.5 text-sm transition-all duration-200 group",
                isActive
                  ? "text-primary bg-primary/5 border-r-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <item.icon className={cn(
                "w-4 h-4 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <div className="text-[10px] font-mono text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>OPERATOR</span>
            <span className="text-foreground truncate ml-2 max-w-[120px]">{user?.email?.split('@')[0]}</span>
          </div>
          <div className="flex justify-between">
            <span>ENGINE</span>
            <span className="text-accent">ACTIVE</span>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-destructive transition-colors w-full"
        >
          <LogOut className="w-3.5 h-3.5" />
          SIGN OUT
        </button>
      </div>
    </aside>
  );
}
