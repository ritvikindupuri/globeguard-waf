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
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={deflectraLogo} alt="Deflectra" className="w-10 h-10 rounded-xl" />
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">DEFLECTRA</h1>
            <p className="text-[10px] font-mono text-sidebar-primary tracking-widest">Adaptive Web Shield</p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="px-5 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-glow" />
          <span className="text-xs font-mono text-emerald-400">WAF ACTIVE</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-5 py-2.5 text-sm transition-all duration-200 group relative",
                isActive
                  ? "text-white bg-sidebar-primary/15 border-r-2 border-sidebar-primary"
                  : "text-sidebar-foreground hover:text-white hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className={cn(
                "w-4 h-4 transition-colors",
                isActive ? "text-sidebar-primary" : "text-sidebar-foreground group-hover:text-white"
              )} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-3">
        <div className="text-[10px] font-mono space-y-1">
          <div className="flex justify-between">
            <span className="text-sidebar-foreground/60">OPERATOR</span>
            <span className="text-white truncate ml-2 max-w-[120px]">{user?.email?.split('@')[0]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sidebar-foreground/60">AI ENGINE</span>
            <span className="text-sidebar-primary">GEMINI 3</span>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-xs font-mono text-sidebar-foreground/60 hover:text-red-400 transition-colors w-full"
        >
          <LogOut className="w-3.5 h-3.5" />
          SIGN OUT
        </button>
      </div>
    </aside>
  );
}
