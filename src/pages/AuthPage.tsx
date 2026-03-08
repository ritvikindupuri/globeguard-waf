import { useState } from 'react';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import cerberusLogo from '@/assets/cerberus-logo.png';

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <img src={cerberusLogo} alt="Cerberus WAF" className="w-20 h-20 mx-auto" />
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-wide">CERBERUS</h1>
            <p className="text-xs font-mono text-muted-foreground tracking-widest mt-1">
              WEB APPLICATION FIREWALL
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">
              {isLogin ? 'Authenticate' : 'Register'}
            </h2>
            <p className="text-xs font-mono text-muted-foreground">
              {isLogin ? 'ENTER CREDENTIALS TO ACCESS CONTROL PANEL' : 'CREATE NEW OPERATOR ACCOUNT'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-muted-foreground block mb-1">EMAIL</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="operator@cerberus.security"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary border-border pl-10 font-mono text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground block mb-1">PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary border-border pl-10 font-mono text-sm"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? 'Processing...' : isLogin ? 'Access System' : 'Create Account'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? 'NEED AN ACCOUNT? REGISTER' : 'ALREADY REGISTERED? LOGIN'}
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] font-mono text-muted-foreground">
          CERBERUS WAF v3.0 • ENCRYPTED CONNECTION • AI-POWERED
        </p>
      </div>
    </div>
  );
}
