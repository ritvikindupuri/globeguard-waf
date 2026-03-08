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

    // Check rules against the request
    let blocked = false;
    let matchedRule: any = null;
    const fullRequestString = `${targetPath} ${requestBody} ${userAgent}`;

    for (const rule of (rules || [])) {
      try {
        const regex = new RegExp(rule.pattern, "i");
        if (regex.test(fullRequestString)) {
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
                content: `You are DEFLECTRA WAF. Quickly classify this HTTP request as safe or threat. Respond with tool call only.`
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
                description: "Classify request",
                parameters: {
                  type: "object",
                  properties: {
                    is_threat: { type: "boolean" },
                    threat_type: { type: "string" },
                    severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                    action: { type: "string", enum: ["blocked", "challenged", "logged", "allowed"] },
                    confidence: { type: "number" },
                    reason: { type: "string" }
                  },
                  required: ["is_threat", "threat_type", "severity", "action", "confidence", "reason"],
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

    // If blocked, return 403
    if (blocked) {
      return new Response(JSON.stringify({
        error: "Request blocked by Deflectra WAF",
        reason: matchedRule?.name || aiAnalysis?.reason || "Threat detected",
        rule: matchedRule?.name || "AI Detection",
        severity: matchedRule?.severity || aiAnalysis?.severity || "high",
      }), {
        status: 403,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-Deflectra-Action": "blocked",
          "X-Deflectra-Rule": matchedRule?.name || "AI",
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
