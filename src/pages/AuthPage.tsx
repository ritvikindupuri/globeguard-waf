import { useState } from 'react';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import deflectraLogo from '@/assets/deflectra-logo.png';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Welcome back, operator.');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Account created. Access granted.');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background mesh-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <img src={deflectraLogo} alt="Deflectra" className="w-24 h-24 mx-auto drop-shadow-2xl" />
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
          </div>
          <div>
            <h1 className="text-3xl font-bold gradient-text tracking-wide">DEFLECTRA</h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              Adaptive Web Shield
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="glass-card rounded-2xl p-7 space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isLogin ? 'Access your WAF control panel' : 'Set up your firewall operator account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary/50 border-border pl-10 text-sm h-11 rounded-xl"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary/50 border-border pl-10 text-sm h-11 rounded-xl"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 transition-opacity font-semibold"
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Don't have an account? Register" : 'Already registered? Sign in'}
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] font-mono text-muted-foreground">
          DEFLECTRA v3.0 • AI-Powered • End-to-End Encrypted
        </p>
      </div>
    </div>
  );
}
