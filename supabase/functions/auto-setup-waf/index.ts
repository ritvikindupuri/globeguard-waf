import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let userId: string | null = null;
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!);
      const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id || null;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { site_url, site_name, site_id } = body;

    if (!site_url || !site_id) {
      return new Response(JSON.stringify({ error: "site_url and site_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ask AI to generate WAF rules, rate limits, and API endpoints for this type of app
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
            content: `You are DEFLECTRA, an AI-powered Web Application Firewall configuration engine.
Given a website URL and name, analyze what type of application it likely is and generate a comprehensive security configuration.

You must generate:
1. WAF rules (regex patterns to detect common attacks for this type of app)
2. Rate limiting rules (appropriate limits for common endpoints)
3. API endpoints to monitor (common paths for this type of app)

Be practical and realistic. Generate rules that would actually protect this type of application.
For example, an e-commerce site needs payment endpoint protection, while a blog needs comment spam protection.`
          },
          {
            role: "user",
            content: `Generate WAF security configuration for this application:
URL: ${site_url}
Name: ${site_name || 'Unknown'}

Analyze the URL to determine the type of application and generate appropriate security rules.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "configure_waf",
              description: "Configure WAF rules, rate limits, and API monitoring for a protected site",
              parameters: {
                type: "object",
                properties: {
                  app_type: { type: "string", description: "Detected application type (e.g., e-commerce, blog, SaaS, API)" },
                  waf_rules: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        pattern: { type: "string", description: "Regex pattern to match" },
                        category: { type: "string", enum: ["sqli", "xss", "rce", "lfi", "bot", "custom"] },
                        severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                        priority: { type: "number" }
                      },
                      required: ["name", "description", "pattern", "category", "severity", "priority"],
                      additionalProperties: false
                    }
                  },
                  rate_limits: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        path: { type: "string" },
                        max_requests: { type: "number" },
                        window_seconds: { type: "number" },
                        action: { type: "string", enum: ["block", "challenge", "throttle"] }
                      },
                      required: ["name", "path", "max_requests", "window_seconds", "action"],
                      additionalProperties: false
                    }
                  },
                  api_endpoints: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH"] },
                        path: { type: "string" },
                        schema_validation: { type: "boolean" },
                        jwt_inspection: { type: "boolean" },
                        rate_limited: { type: "boolean" }
                      },
                      required: ["method", "path", "schema_validation", "jwt_inspection", "rate_limited"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["app_type", "waf_rules", "rate_limits", "api_endpoints"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "configure_waf" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI configuration failed");
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return configuration");

    const config = JSON.parse(toolCall.function.arguments);

    // Insert WAF rules
    if (config.waf_rules?.length > 0) {
      const rules = config.waf_rules.map((r: any) => ({
        user_id: userId,
        name: r.name,
        description: r.description,
        pattern: r.pattern,
        category: r.category,
        severity: r.severity,
        priority: r.priority,
        rule_type: "block",
        enabled: true,
      }));
      await supabase.from("waf_rules").insert(rules);
    }

    // Insert rate limit rules
    if (config.rate_limits?.length > 0) {
      const rateLimits = config.rate_limits.map((r: any) => ({
        user_id: userId,
        name: r.name,
        path: r.path,
        max_requests: r.max_requests,
        window_seconds: r.window_seconds,
        action: r.action,
        enabled: true,
      }));
      await supabase.from("rate_limit_rules").insert(rateLimits);
    }

    // Insert API endpoints
    if (config.api_endpoints?.length > 0) {
      const endpoints = config.api_endpoints.map((e: any) => ({
        user_id: userId,
        method: e.method,
        path: e.path,
        schema_validation: e.schema_validation,
        jwt_inspection: e.jwt_inspection,
        rate_limited: e.rate_limited,
      }));
      await supabase.from("api_endpoints").insert(endpoints);
    }

    // Insert simulated threat logs so the dashboard has data
    if (config.simulated_threats?.length > 0) {
      const threats = config.simulated_threats.map((t: any) => ({
        user_id: userId,
        site_id: site_id,
        source_ip: `${Math.floor(Math.random()*223)+1}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
        source_country: t.source_country,
        source_lat: t.source_lat,
        source_lng: t.source_lng,
        threat_type: t.threat_type,
        severity: t.severity,
        action_taken: "blocked",
        request_path: t.path,
        request_method: t.method || "GET",
        details: {
          explanation: t.description,
          confidence: 85 + Math.floor(Math.random() * 15),
          indicators: [t.threat_type],
          simulated: true,
        },
      }));
      await supabase.from("threat_logs").insert(threats);

      // Update site threats_blocked count
      await supabase.from("protected_sites")
        .update({ threats_blocked: threats.length, status: "active" })
        .eq("id", site_id);
    }

    return new Response(JSON.stringify({
      success: true,
      app_type: config.app_type,
      rules_created: config.waf_rules?.length || 0,
      rate_limits_created: config.rate_limits?.length || 0,
      endpoints_monitored: config.api_endpoints?.length || 0,
      threats_simulated: config.simulated_threats?.length || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("auto-setup error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
