import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-deflectra-site-id, x-forwarded-for, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Get the site ID from header or query param
    const url = new URL(req.url);
    const siteId = req.headers.get("x-deflectra-site-id") || url.searchParams.get("site_id");
    const targetPath = url.searchParams.get("path") || "/";

    if (!siteId) {
      return new Response(JSON.stringify({
        error: "Missing site_id. Set x-deflectra-site-id header or ?site_id= query param.",
        usage: "Point your traffic to this endpoint with your site_id to enable WAF protection."
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the protected site
    const { data: site, error: siteError } = await supabase
      .from("protected_sites")
      .select("*")
      .eq("id", siteId)
      .single();

    if (siteError || !site) {
      return new Response(JSON.stringify({ error: "Site not found or not protected by Deflectra." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || req.headers.get("cf-connecting-ip") 
      || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    let geoData: { lat: number | null; lng: number | null; country: string | null } = {
      lat: null, lng: null, country: null,
    };
    const requestMethod = req.method;
    const requestBody = req.method !== "GET" && req.method !== "HEAD" 
      ? await req.text().catch(() => "") 
      : "";

    // Load WAF rules for this user
    const { data: rules } = await supabase
      .from("waf_rules")
      .select("*")
      .eq("user_id", site.user_id)
      .eq("enabled", true)
      .order("priority", { ascending: true });

    // Check rules against the request (only path + body, NOT user-agent to avoid false positives)
    let blocked = false;
    let matchedRule: any = null;
    const checkString = `${targetPath} ${requestBody}`;

    for (const rule of (rules || [])) {
      try {
        const regex = new RegExp(rule.pattern, "i");
        if (regex.test(checkString)) {
          matchedRule = rule;
          if (rule.rule_type === "block") {
            blocked = true;
          }
          break;
        }
      } catch {
        // Invalid regex, skip
      }
    }

    // If no rule matched, use AI analysis for suspicious patterns
    let aiAnalysis: any = null;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!blocked && !matchedRule && LOVABLE_API_KEY) {
      // Quick AI check for suspicious requests
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are DEFLECTRA WAF. Classify this HTTP request as safe or threat. Also estimate the geographic origin of the IP address (approximate latitude, longitude, and country). Respond with tool call only.`
              },
              {
                role: "user",
                content: `Method: ${requestMethod}\nPath: ${targetPath}\nBody: ${requestBody.slice(0, 500)}\nUser-Agent: ${userAgent}\nIP: ${clientIp}`
              }
            ],
            tools: [{
              type: "function",
              function: {
                name: "classify",
                description: "Classify request and estimate IP geolocation",
                parameters: {
                  type: "object",
                  properties: {
                    is_threat: { type: "boolean" },
                    threat_type: { type: "string" },
                    severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                    action: { type: "string", enum: ["blocked", "challenged", "logged", "allowed"] },
                    confidence: { type: "number" },
                    reason: { type: "string" },
                    source_lat: { type: "number", description: "Estimated latitude of the IP address origin" },
                    source_lng: { type: "number", description: "Estimated longitude of the IP address origin" },
                    source_country: { type: "string", description: "Estimated country name of the IP address origin" }
                  },
                  required: ["is_threat", "threat_type", "severity", "action", "confidence", "reason", "source_lat", "source_lng", "source_country"],
                  additionalProperties: false
                }
              }
            }],
            tool_choice: { type: "function", function: { name: "classify" } },
          }),
        });

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall) {
            aiAnalysis = JSON.parse(toolCall.function.arguments);
            if (aiAnalysis.is_threat && aiAnalysis.action === "blocked") {
              blocked = true;
            }
            // Use AI-estimated geo data
            if (aiAnalysis.source_lat && aiAnalysis.source_lng) {
              geoData = {
                lat: aiAnalysis.source_lat,
                lng: aiAnalysis.source_lng,
                country: aiAnalysis.source_country || null,
              };
            }
          }
        }
      } catch (e) {
        console.error("AI analysis error:", e);
        // Continue without AI - fail open
      }
    }

    // Log to threat_logs if a threat was detected
    const isThreat = blocked || matchedRule || (aiAnalysis?.is_threat);
    if (isThreat) {
      await supabase.from("threat_logs").insert({
        user_id: site.user_id,
        site_id: site.id,
        source_ip: clientIp,
        source_lat: geoData.lat,
        source_lng: geoData.lng,
        source_country: geoData.country,
        threat_type: matchedRule?.category || aiAnalysis?.threat_type || "unknown",
        severity: matchedRule?.severity || aiAnalysis?.severity || "medium",
        action_taken: blocked ? "blocked" : (aiAnalysis?.action || "logged"),
        request_path: targetPath,
        request_method: requestMethod,
        user_agent: userAgent,
        rule_id: matchedRule?.id || null,
        details: {
          matched_rule: matchedRule?.name || null,
          ai_analysis: aiAnalysis || null,
          blocked,
        },
      });

      // Update threats_blocked count
      await supabase
        .from("protected_sites")
        .update({ threats_blocked: site.threats_blocked + 1 })
        .eq("id", site.id);
    }

    // If blocked, return branded block page
    if (blocked) {
      const blockReason = matchedRule?.name || aiAnalysis?.reason || "Threat detected";
      const blockSeverity = matchedRule?.severity || aiAnalysis?.severity || "high";
      const blockRule = matchedRule?.name || "AI Detection";

      const blockPageHtml = `<!DOCTYPE html>
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
    .badge.medium{background:rgba(234,179,8,.15);color:#facc15;border:1px solid rgba(234,179,8,.25)}
    .badge.low{background:rgba(34,197,94,.15);color:#4ade80;border:1px solid rgba(34,197,94,.25)}
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
    <span class="badge ${blockSeverity}">${blockSeverity.toUpperCase()} SEVERITY</span>
    <h1>Request Blocked</h1>
    <p class="subtitle">Deflectra WAF has detected a potential threat and blocked this request to protect the application.</p>
    <div class="details">
      <div class="detail-row"><span class="detail-label">Reason</span><span class="detail-value">${blockReason}</span></div>
      <div class="detail-row"><span class="detail-label">Rule</span><span class="detail-value">${blockRule}</span></div>
      <div class="detail-row"><span class="detail-label">Your IP</span><span class="detail-value">${clientIp}</span></div>
      <div class="detail-row"><span class="detail-label">Path</span><span class="detail-value">${targetPath}</span></div>
      <div class="detail-row"><span class="detail-label">Method</span><span class="detail-value">${requestMethod}</span></div>
    </div>
    <div class="footer">
      <svg viewBox="0 0 100 100" fill="none"><path d="M50 5L10 25V50C10 75 25 90 50 95C75 90 90 75 90 50V25L50 5Z" fill="#06b6d4"/></svg>
      Protected by Deflectra WAF
    </div>
  </div>
</body>
</html>`;

      return new Response(blockPageHtml, {
        status: 403,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "X-Deflectra-Action": "blocked",
          "X-Deflectra-Rule": blockRule,
        },
      });
    }

    // Forward the request to the origin
    const originUrl = `${site.url}${targetPath}`;
    try {
      const originResponse = await fetch(originUrl, {
        method: requestMethod,
        headers: {
          "User-Agent": userAgent,
          "X-Forwarded-For": clientIp,
          "X-Deflectra-Verified": "true",
          ...(requestBody ? { "Content-Type": req.headers.get("content-type") || "application/json" } : {}),
        },
        ...(requestBody ? { body: requestBody } : {}),
      });

      const responseBody = await originResponse.text();

      return new Response(responseBody, {
        status: originResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": originResponse.headers.get("content-type") || "text/plain",
          "X-Deflectra-Action": isThreat ? "logged" : "allowed",
          "X-Deflectra-Protected": "true",
        },
      });
    } catch (fetchError) {
      return new Response(JSON.stringify({
        error: "Failed to reach origin server",
        origin: originUrl,
        message: fetchError instanceof Error ? fetchError.message : "Unknown error",
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (e) {
    console.error("waf-proxy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
