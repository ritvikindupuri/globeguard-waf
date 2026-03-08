import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BLOCK_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blocked by Deflectra WAF</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;overflow:hidden}
    .bg-grid{position:fixed;inset:0;background-image:linear-gradient(rgba(59,130,246,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.04) 1px,transparent 1px);background-size:40px 40px}
    .container{position:relative;z-index:1;text-align:center;max-width:520px;padding:2.5rem}
    .shield{width:80px;height:80px;margin:0 auto 1.5rem;position:relative}
    .shield svg{width:100%;height:100%;filter:drop-shadow(0 0 20px rgba(6,182,212,.4))}
    .badge{display:inline-block;padding:.25rem .75rem;border-radius:999px;font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:1rem}
    .badge.critical{background:rgba(239,68,68,.15);color:#f87171;border:1px solid rgba(239,68,68,.25)}
    .badge.high{background:rgba(249,115,22,.15);color:#fb923c;border:1px solid rgba(249,115,22,.25)}
    h1{font-size:1.5rem;font-weight:700;margin-bottom:.5rem;background:linear-gradient(135deg,#06b6d4,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .subtitle{color:#94a3b8;font-size:.875rem;margin-bottom:2rem;line-height:1.6}
    .details{background:rgba(30,41,59,.6);border:1px solid rgba(51,65,85,.5);border-radius:12px;padding:1.25rem;text-align:left;margin-bottom:2rem;backdrop-filter:blur(8px)}
    .detail-row{display:flex;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid rgba(51,65,85,.3)}
    .detail-row:last-child{border-bottom:none}
    .detail-label{color:#64748b;font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
    .detail-value{color:#e2e8f0;font-size:.8rem;font-family:monospace}
    .footer{color:#475569;font-size:.7rem;display:flex;align-items:center;justify-content:center;gap:.4rem}
    .footer svg{width:14px;height:14px;opacity:.5}
    .pulse{animation:pulse 2s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="container">
    <div class="shield">
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 5L10 25V50C10 75 25 90 50 95C75 90 90 75 90 50V25L50 5Z" fill="url(#shieldGrad)" stroke="url(#strokeGrad)" stroke-width="2"/>
        <path d="M40 50L47 57L62 42" stroke="#0a0e1a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="pulse"/>
        <defs>
          <linearGradient id="shieldGrad" x1="10" y1="5" x2="90" y2="95" gradientUnits="userSpaceOnUse">
            <stop stop-color="#06b6d4"/>
            <stop offset="1" stop-color="#3b82f6"/>
          </linearGradient>
          <linearGradient id="strokeGrad" x1="10" y1="5" x2="90" y2="95" gradientUnits="userSpaceOnUse">
            <stop stop-color="#22d3ee"/>
            <stop offset="1" stop-color="#60a5fa"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
    <span class="badge critical">CRITICAL SEVERITY</span>
    <h1>Request Blocked</h1>
    <p class="subtitle">Deflectra WAF has detected a potential threat and blocked this request to protect the application.</p>
    <div class="details">
      <div class="detail-row"><span class="detail-label">Reason</span><span class="detail-value">SQL Injection - Basic</span></div>
      <div class="detail-row"><span class="detail-label">Rule</span><span class="detail-value">SQL Injection - Basic</span></div>
      <div class="detail-row"><span class="detail-label">Your IP</span><span class="detail-value">192.168.1.100</span></div>
      <div class="detail-row"><span class="detail-label">Path</span><span class="detail-value">/api/users?id=1 OR 1=1</span></div>
      <div class="detail-row"><span class="detail-label">Method</span><span class="detail-value">GET</span></div>
    </div>
    <div class="footer">
      <svg viewBox="0 0 100 100" fill="none"><path d="M50 5L10 25V50C10 75 25 90 50 95C75 90 90 75 90 50V25L50 5Z" fill="#06b6d4"/></svg>
      Protected by Deflectra WAF
    </div>
  </div>
</body>
</html>`;

export default function BlockPagePreview() {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Block Page Preview</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">This is what attackers see when Deflectra blocks their request</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs gap-1.5"
        >
          {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showPreview ? 'Hide' : 'Preview'}
        </Button>
      </div>
      {showPreview && (
        <div className="p-4">
          <div className="rounded-lg overflow-hidden border border-border/50 shadow-lg">
            <iframe
              srcDoc={BLOCK_PAGE_HTML}
              className="w-full h-[520px] border-0"
              title="Deflectra Block Page Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}
