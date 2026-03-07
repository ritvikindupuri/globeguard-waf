import { useState } from 'react';
import { Lock, FileJson, Key, Shield, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import StatCard from './StatCard';

interface APIEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  schemaValidation: boolean;
  jwtInspection: boolean;
  rateLimited: boolean;
  requestsToday: number;
  blocked: number;
}

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-primary/10 text-primary border-primary/30',
  POST: 'bg-accent/10 text-accent border-accent/30',
  PUT: 'bg-warning/10 text-warning border-warning/30',
  DELETE: 'bg-destructive/10 text-destructive border-destructive/30',
  PATCH: 'bg-threat-info/10 text-threat-info border-threat-info/30',
};

const ENDPOINTS: APIEndpoint[] = [
  { id: '1', method: 'POST', path: '/api/auth/login', schemaValidation: true, jwtInspection: false, rateLimited: true, requestsToday: 14520, blocked: 892 },
  { id: '2', method: 'GET', path: '/api/users/:id', schemaValidation: true, jwtInspection: true, rateLimited: true, requestsToday: 28340, blocked: 234 },
  { id: '3', method: 'POST', path: '/api/payments/charge', schemaValidation: true, jwtInspection: true, rateLimited: true, requestsToday: 5120, blocked: 67 },
  { id: '4', method: 'DELETE', path: '/api/users/:id', schemaValidation: true, jwtInspection: true, rateLimited: true, requestsToday: 340, blocked: 12 },
  { id: '5', method: 'PUT', path: '/api/settings', schemaValidation: true, jwtInspection: true, rateLimited: false, requestsToday: 1280, blocked: 45 },
  { id: '6', method: 'POST', path: '/api/upload', schemaValidation: false, jwtInspection: true, rateLimited: true, requestsToday: 892, blocked: 156 },
  { id: '7', method: 'GET', path: '/api/search', schemaValidation: true, jwtInspection: false, rateLimited: true, requestsToday: 42100, blocked: 1204 },
];

export default function APIProtection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">API Shield</h2>
        <p className="text-xs text-muted-foreground font-mono">SCHEMA VALIDATION • JWT INSPECTION • GRAPHQL/REST PROTECTION</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard icon={FileJson} title="Schema Violations" value="1,247" change="Today" changeType="negative" variant="destructive" />
        <StatCard icon={Key} title="Invalid JWTs" value="89" change="-23% vs yesterday" changeType="positive" variant="warning" />
        <StatCard icon={Shield} title="Protected Endpoints" value={ENDPOINTS.length.toString()} change="All monitored" changeType="neutral" variant="primary" />
        <StatCard icon={Lock} title="API Score" value="94/100" change="+2 this week" changeType="positive" variant="accent" />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Protected Endpoints</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">METHOD</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">PATH</th>
                <th className="text-center px-4 py-2 text-muted-foreground font-medium">SCHEMA</th>
                <th className="text-center px-4 py-2 text-muted-foreground font-medium">JWT</th>
                <th className="text-center px-4 py-2 text-muted-foreground font-medium">RATE LIM.</th>
                <th className="text-right px-4 py-2 text-muted-foreground font-medium">REQUESTS</th>
                <th className="text-right px-4 py-2 text-muted-foreground font-medium">BLOCKED</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((ep) => (
                <tr key={ep.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className={cn("px-2 py-0.5 rounded text-[10px] border", METHOD_STYLES[ep.method])}>
                      {ep.method}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-foreground">{ep.path}</td>
                  <td className="px-4 py-2.5 text-center">
                    {ep.schemaValidation ? <CheckCircle className="w-3.5 h-3.5 text-accent mx-auto" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground mx-auto" />}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {ep.jwtInspection ? <CheckCircle className="w-3.5 h-3.5 text-accent mx-auto" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground mx-auto" />}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {ep.rateLimited ? <CheckCircle className="w-3.5 h-3.5 text-accent mx-auto" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground mx-auto" />}
                  </td>
                  <td className="px-4 py-2.5 text-right text-foreground">{ep.requestsToday.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right text-destructive">{ep.blocked.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
