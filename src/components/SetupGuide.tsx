import { useState } from 'react';
import { Copy, Check, ExternalLink, Shield, ArrowRight, Code, Globe, Zap, Terminal } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';

function CopyBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
        <span className="text-[10px] font-mono text-muted-foreground uppercase">{label}</span>
        <button onClick={copy} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="px-3 py-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-all">{code}</pre>
    </div>
  );
}

function StepCard({ step, title, description, children }: { step: number; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-start gap-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-primary">{step}</span>
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function SetupGuide() {
  const { user } = useAuth();
  const [sites, setSites] = useState<{ id: string; name: string; url: string }[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('');

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'your-project-id';
  const proxyBase = `https://${projectId}.supabase.co/functions/v1/waf-proxy`;

  useEffect(() => {
    if (!user) return;
    supabase.from('protected_sites').select('id, name, url').then(({ data }) => {
      if (data) {
        setSites(data);
        if (data.length > 0) setSelectedSite(data[0].id);
      }
    });
  }, [user]);

  const selectedSiteData = sites.find(s => s.id === selectedSite);

  const testCurl = `curl -X GET "${proxyBase}?site_id=${selectedSite || '<YOUR_SITE_ID>'}&path=/" \\
  -H "Content-Type: application/json"`;

  const testSqli = `curl -X POST "${proxyBase}?site_id=${selectedSite || '<YOUR_SITE_ID>'}&path=/login" \\
  -H "Content-Type: application/json" \\
  -d '{"username": "admin\\' OR 1=1 --", "password": "test"}'`;

  const testXss = `curl -X POST "${proxyBase}?site_id=${selectedSite || '<YOUR_SITE_ID>'}&path=/search" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "<script>alert(document.cookie)</script>"}'`;

  const jsSnippet = `// Replace your API base URL with the Deflectra proxy
const DEFLECTRA_PROXY = "${proxyBase}";
const SITE_ID = "${selectedSite || '<YOUR_SITE_ID>'}";

// Original: fetch("https://yoursite.com/api/data")
// Protected:
const response = await fetch(
  \`\${DEFLECTRA_PROXY}?site_id=\${SITE_ID}&path=/api/data\`,
  {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  }
);`;

  const nginxSnippet = `# nginx.conf — reverse proxy through Deflectra
location /api/ {
    proxy_pass ${proxyBase}?site_id=${selectedSite || '<YOUR_SITE_ID>'}&path=$request_uri;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Host $host;
}`;

  const handleTestRequest = async () => {
    if (!selectedSite) {
      toast.error('Select a protected site first');
      return;
    }
    try {
      const res = await fetch(`${proxyBase}?site_id=${selectedSite}&path=/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        toast.success('WAF proxy responded successfully — traffic is flowing');
      } else if (res.status === 403) {
        toast.success('WAF correctly blocked the request!');
      } else {
        toast.error(`Proxy returned ${res.status}: ${data?.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reach proxy');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Setup Guide</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Route your traffic through Deflectra's WAF proxy to detect real threats like SQLi, XSS, RCE, and brute force attacks.
        </p>
      </div>

      {/* Architecture diagram */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          How It Works
        </h3>
        <div className="flex items-center gap-3 text-xs font-mono justify-center py-4 flex-wrap">
          <div className="px-3 py-2 rounded-lg bg-muted border border-border text-center">
            <Globe className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <span className="text-foreground">Client</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-center">
            <Shield className="w-4 h-4 mx-auto mb-1 text-primary" />
            <span className="text-primary font-semibold">Deflectra WAF</span>
            <p className="text-[9px] text-muted-foreground mt-0.5">Regex + AI analysis</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="px-3 py-2 rounded-lg bg-muted border border-border text-center">
            <Zap className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <span className="text-foreground">Your Server</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Traffic flows through the WAF proxy. Malicious requests are blocked; clean requests are forwarded to your origin server.
        </p>
      </div>

      {/* Select site */}
      {sites.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <label className="text-xs font-semibold text-foreground block mb-2">Select Protected Site</label>
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name} — {s.url}</option>
            ))}
          </select>
          {selectedSiteData && (
            <p className="text-[10px] font-mono text-muted-foreground mt-2">
              SITE ID: <span className="text-foreground">{selectedSite}</span>
            </p>
          )}
        </div>
      )}

      {sites.length === 0 && (
        <div className="glass-card rounded-xl p-5 border-destructive/30 border">
          <p className="text-sm text-foreground font-medium">No protected sites found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Go to <a href="/sites" className="text-primary hover:underline">Protected Sites</a> first and add your website URL.
          </p>
        </div>
      )}

      {/* Step 1 */}
      <StepCard
        step={1}
        title="Your WAF Proxy Endpoint"
        description="This is the URL that all traffic should flow through. It inspects every request against your WAF rules and AI engine."
      >
        <CopyBlock label="Proxy URL" code={proxyBase} />

        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">How to use this endpoint</h4>
          <p className="text-xs text-muted-foreground">
            This proxy URL acts as a <span className="text-foreground font-medium">middleman</span> between your users and your server. Instead of your app calling your backend directly, it calls this proxy URL — Deflectra inspects the request, and if it's clean, forwards it to your origin server.
          </p>

          <div className="space-y-3">
            <div className="rounded-lg bg-muted/30 border border-border p-3">
              <p className="text-xs font-semibold text-primary mb-1">Option A — Replace fetch() calls in your frontend</p>
              <p className="text-[11px] text-muted-foreground">
                In your frontend code, replace your API base URL with the proxy URL above. Append <code className="text-foreground bg-muted px-1 rounded text-[10px]">?site_id=YOUR_SITE_ID&path=/your-endpoint</code> as query parameters.
              </p>
              <CopyBlock 
                label="Before (direct)" 
                code={`fetch("https://yourserver.com/api/contact", { method: "POST", body: JSON.stringify(data) })`} 
              />
              <div className="my-2" />
              <CopyBlock 
                label="After (through Deflectra)" 
                code={`fetch("${proxyBase}?site_id=${selectedSite || '<YOUR_SITE_ID>'}&path=/api/contact", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify(data)\n})`} 
              />
            </div>

            <div className="rounded-lg bg-muted/30 border border-border p-3">
              <p className="text-xs font-semibold text-primary mb-1">Option B — Deploy a Cloudflare Worker (full traffic interception)</p>
              <p className="text-[11px] text-muted-foreground">
                For complete protection, deploy a Cloudflare Worker that sits in front of your entire domain. Every request to your site first goes through the Worker, which forwards it to Deflectra's proxy. This means <span className="text-foreground font-medium">zero frontend code changes</span> — all traffic is automatically inspected.
              </p>
              <CopyBlock
                label="Cloudflare Worker (deploy to workers.dev)"
                code={`export default {\n  async fetch(request, env) {\n    const url = new URL(request.url);\n    const path = url.pathname + url.search;\n\n    const wafUrl = "${proxyBase}?site_id=${selectedSite || '<YOUR_SITE_ID>'}&path=" + encodeURIComponent(path);\n\n    const body = ["GET","HEAD"].includes(request.method) ? undefined : await request.text();\n\n    const res = await fetch(wafUrl, {\n      method: request.method,\n      headers: {\n        "Content-Type": request.headers.get("Content-Type") || "application/json",\n        "User-Agent": request.headers.get("User-Agent") || "unknown",\n        "X-Forwarded-For": request.headers.get("CF-Connecting-IP") || "unknown",\n        "Authorization": "Bearer <YOUR_SUPABASE_ANON_KEY>",\n        "apikey": "<YOUR_SUPABASE_ANON_KEY>",\n      },\n      body,\n    });\n\n    return new Response(await res.arrayBuffer(), {\n      status: res.status,\n      headers: {\n        "Content-Type": res.headers.get("Content-Type") || "text/html",\n        "Access-Control-Allow-Origin": "*",\n      },\n    });\n  },\n};`}
              />
              <div className="mt-3 rounded-lg bg-primary/5 border border-primary/20 p-3">
                <p className="text-xs font-semibold text-foreground mb-1">🛡️ Test the Block Page</p>
                <p className="text-[11px] text-muted-foreground">
                  After deploying your Cloudflare Worker, try a malicious request to verify the WAF is working:
                </p>
                <CopyBlock
                  label="SQL Injection Test URL"
                  code={`https://your-worker.workers.dev/api/users?id=1%20OR%201=1--`}
                />
                <p className="text-[11px] text-muted-foreground mt-2">
                  If the WAF detects the SQL injection, you should see the <span className="text-foreground font-medium">branded Deflectra block page</span> instead of your site content.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-muted/30 border border-border p-3">
              <p className="text-xs font-semibold text-primary mb-1">Option C — Nginx reverse proxy</p>
              <p className="text-[11px] text-muted-foreground">
                If you control your web server, add a proxy_pass directive that routes API requests through Deflectra before they reach your backend.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <p className="text-xs font-semibold text-foreground mb-1">⚡ What happens when traffic flows through:</p>
            <ol className="list-decimal list-inside text-[11px] text-muted-foreground space-y-1">
              <li>Request hits the proxy with your <code className="text-foreground bg-muted px-1 rounded text-[10px]">site_id</code> and target <code className="text-foreground bg-muted px-1 rounded text-[10px]">path</code></li>
              <li>Deflectra looks up your site's origin URL from Protected Sites</li>
              <li>Runs the request through <span className="text-foreground font-medium">JWT check → Schema validation → Rate limiting → Regex rules → AI analysis</span></li>
              <li>If clean → forwards to your origin server and returns the response</li>
              <li>If malicious → blocks with a branded 403 page and logs the threat to your dashboard</li>
            </ol>
          </div>
        </div>
      </StepCard>

      {/* Step 2 */}
      <StepCard
        step={2}
        title="Test with cURL"
        description="Send a test request through the proxy to verify it's working. Run these commands in your terminal."
      >
        <div className="space-y-3">
          <CopyBlock label="Normal request (should pass)" code={testCurl} />
          <CopyBlock label="SQLi attack (should be blocked)" code={testSqli} />
          <CopyBlock label="XSS attack (should be blocked)" code={testXss} />
        </div>
        <button
          onClick={handleTestRequest}
          className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Terminal className="w-3.5 h-3.5" />
          Send Test Request from Browser
        </button>
      </StepCard>

      {/* Step 3 */}
      <StepCard
        step={3}
        title="Route Frontend Traffic (JavaScript)"
        description="Replace your API calls to go through the Deflectra proxy instead of directly to your server."
      >
        <CopyBlock label="JavaScript / fetch()" code={jsSnippet} />
      </StepCard>

      {/* Step 4 */}
      <StepCard
        step={4}
        title="Route All Traffic (Nginx Reverse Proxy)"
        description="For full protection, configure your web server to route all traffic through Deflectra."
      >
        <CopyBlock label="nginx.conf" code={nginxSnippet} />
      </StepCard>

      {/* Step 5 */}
      <StepCard
        step={5}
        title="Monitor Your Dashboard"
        description="Once traffic flows through the proxy, real threats will appear on your dashboard, globe, and threat intel pages automatically."
      >
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-muted/50 border border-border p-3">
            <Code className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-[10px] font-mono text-muted-foreground">REGEX RULES</p>
            <p className="text-xs text-foreground mt-0.5">SQLi, XSS, RCE, LFI</p>
          </div>
          <div className="rounded-lg bg-muted/50 border border-border p-3">
            <Shield className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-[10px] font-mono text-muted-foreground">AI ENGINE</p>
            <p className="text-xs text-foreground mt-0.5">Gemini 3.1 Pro</p>
          </div>
          <div className="rounded-lg bg-muted/50 border border-border p-3">
            <Globe className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-[10px] font-mono text-muted-foreground">GEO TRACKING</p>
            <p className="text-xs text-foreground mt-0.5">IP → Globe</p>
          </div>
        </div>
      </StepCard>

      {/* What gets detected */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">What Deflectra Detects</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'SQL Injection', desc: "' OR 1=1 --, UNION SELECT" },
            { label: 'XSS', desc: '<script>, onerror=, javascript:' },
            { label: 'Remote Code Execution', desc: 'eval(), exec(), system()' },
            { label: 'Path Traversal / LFI', desc: '../etc/passwd, ..\\windows' },
            { label: 'Bot / Scraper', desc: 'Suspicious user agents, headless browsers' },
            { label: 'Brute Force', desc: 'Rate limiting on login paths' },
          ].map(item => (
            <div key={item.label} className="rounded-lg bg-muted/30 border border-border p-3">
              <p className="text-xs font-semibold text-foreground">{item.label}</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
