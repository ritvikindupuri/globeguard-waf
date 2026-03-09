import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { site_url, context, field } = await req.json();

    if (!site_url) {
      return new Response(JSON.stringify({ error: "site_url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the system prompt based on context and field
    const systemPrompt = buildSystemPrompt(context, field);
    const userPrompt = buildUserPrompt(site_url, context, field);

    // Define the tool based on context and field
    const tool = buildTool(context, field);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: tool.function.name } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No response from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildSystemPrompt(context: string, field?: string): string {
  const base = `You are a security expert that deeply analyzes web applications to generate accurate WAF configurations.

CRITICAL INSTRUCTIONS:
1. You MUST actually analyze the provided URL - imagine crawling the site, discovering its tech stack, endpoints, and architecture
2. Base ALL suggestions on realistic patterns for that specific type of application
3. Detect: frontend framework, backend language, API style (REST/GraphQL), database type, auth mechanism
4. Generate configurations that would actually protect THIS specific application
5. Do NOT use generic placeholder values - everything must be specific to what you discover about the app

When analyzing, consider:
- Common endpoints for the detected framework (e.g., /api/auth/* for Next.js, /functions/v1/* for Supabase)
- Technology-specific vulnerabilities (e.g., NoSQL injection for MongoDB apps, template injection for Django)
- The app's purpose (portfolio, e-commerce, SaaS, etc.) to tailor protection levels
`;

  if (field) {
    return base + `\n\nYou are generating ONLY the "${field}" field value. Focus on accuracy for this specific field.`;
  }

  return base;
}

function buildUserPrompt(site_url: string, context: string, field?: string): string {
  const fieldNote = field ? ` Generate ONLY the "${field}" field value.` : "";
  
  switch (context) {
    case "ai_detection":
      return `Deeply analyze this web application: ${site_url}

Discover its endpoints, API routes, authentication flows, and typical request patterns.
Generate realistic attack simulation scenarios that would actually test THIS specific app's defenses.${fieldNote}

For each scenario:
- path: Use real endpoint patterns you discover (e.g., /api/users, /functions/v1/chatbot)
- method: Match the likely HTTP method for that endpoint
- body: Craft attack payloads that target the expected body schema
- user_agent: Use realistic attacker user agents`;

    case "rate_limiting":
      return `Deeply analyze this web application: ${site_url}

Discover its API endpoints, authentication routes, resource-intensive operations, and public vs protected paths.
Generate rate limiting rules that protect THIS specific app's sensitive endpoints.${fieldNote}

For each rule:
- name: Descriptive name for the rule
- path: Actual endpoint paths from the app (use wildcards for patterns)
- max_requests: Appropriate limit based on the endpoint's purpose
- window_seconds: Time window (be stricter for auth endpoints)
- action: block/challenge/throttle based on severity`;

    case "api_shield":
      return `Deeply analyze this web application: ${site_url}

Discover its REST/GraphQL endpoints, which ones accept JSON bodies, which require authentication, and which are rate-sensitive.
Generate API Shield configurations for the endpoints you discover.${fieldNote}

For each endpoint:
- method: The HTTP method used (detect from endpoint purpose)
- path: The actual endpoint path
- jwt_inspection: Enable for authenticated routes
- schema_validation: Enable for endpoints accepting JSON bodies
- rate_limited: Enable for expensive operations`;

    case "rule_engine":
      return `Deeply analyze this web application: ${site_url}

Detect the technology stack (frontend, backend, database, hosting) and generate WAF rules targeting vulnerabilities specific to that stack.${fieldNote}

For each rule:
- name: Descriptive attack name
- pattern: Regex pattern that catches attacks against the detected stack
- category: sqli/xss/rce/lfi/custom
- severity: Based on potential impact
- description: Why this rule matters for this specific app`;

    default:
      return `Analyze ${site_url} and generate appropriate security configurations.${fieldNote}`;
  }
}

function buildTool(context: string, field?: string): any {
  // If generating a single field, return a simpler tool
  if (field) {
    return buildFieldTool(context, field);
  }

  // Full form generation tools
  switch (context) {
    case "ai_detection":
      return {
        type: "function",
        function: {
          name: "generate_attack_scenarios",
          description: "Generate attack simulation scenarios based on deep analysis of the target application",
          parameters: {
            type: "object",
            properties: {
              scenarios: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    path: { type: "string", description: "Request path with attack payload" },
                    method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE"] },
                    body: { type: "string", description: "Request body with attack payload" },
                    user_agent: { type: "string", description: "Attacker user agent" },
                  },
                  required: ["path", "method"],
                },
              },
              detected_stack: {
                type: "object",
                properties: {
                  frontend: { type: "string" },
                  backend: { type: "string" },
                  hosting: { type: "string" },
                },
              },
            },
            required: ["scenarios", "detected_stack"],
          },
        },
      };

    case "rate_limiting":
      return {
        type: "function",
        function: {
          name: "generate_rate_limit_rules",
          description: "Generate rate limiting rules based on deep analysis of the target application",
          parameters: {
            type: "object",
            properties: {
              rules: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    path: { type: "string" },
                    max_requests: { type: "number" },
                    window_seconds: { type: "number" },
                    action: { type: "string", enum: ["block", "challenge", "throttle"] },
                  },
                  required: ["name", "path", "max_requests", "window_seconds", "action"],
                },
              },
              detected_endpoints: {
                type: "array",
                items: { type: "string" },
                description: "List of discovered endpoints",
              },
            },
            required: ["rules", "detected_endpoints"],
          },
        },
      };

    case "api_shield":
      return {
        type: "function",
        function: {
          name: "generate_api_endpoints",
          description: "Generate API Shield endpoint configurations based on deep analysis",
          parameters: {
            type: "object",
            properties: {
              endpoints: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH"] },
                    path: { type: "string" },
                    schema_validation: { type: "boolean" },
                    jwt_inspection: { type: "boolean" },
                    rate_limited: { type: "boolean" },
                  },
                  required: ["method", "path", "schema_validation", "jwt_inspection", "rate_limited"],
                },
              },
              api_type: {
                type: "string",
                enum: ["REST", "GraphQL", "Mixed"],
              },
            },
            required: ["endpoints", "api_type"],
          },
        },
      };

    case "rule_engine":
      return {
        type: "function",
        function: {
          name: "generate_waf_rules",
          description: "Generate WAF rules tailored to the detected technology stack",
          parameters: {
            type: "object",
            properties: {
              rules: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    pattern: { type: "string" },
                    category: { type: "string", enum: ["sqli", "xss", "rce", "lfi", "custom"] },
                    severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                    rule_type: { type: "string", enum: ["block", "challenge", "log"] },
                    description: { type: "string" },
                  },
                  required: ["name", "pattern", "category", "severity", "rule_type", "description"],
                },
              },
              detected_vulnerabilities: {
                type: "array",
                items: { type: "string" },
                description: "Potential vulnerabilities detected in the stack",
              },
            },
            required: ["rules", "detected_vulnerabilities"],
          },
        },
      };

    default:
      throw new Error(`Unknown context: ${context}`);
  }
}

function buildFieldTool(context: string, field: string): any {
  // Build a single-field generation tool
  const fieldName = `generate_${field.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  
  switch (context) {
    case "ai_detection":
      if (field === "path") {
        return {
          type: "function",
          function: {
            name: fieldName,
            description: "Generate a realistic attack path based on discovered endpoints",
            parameters: {
              type: "object",
              properties: {
                value: { type: "string", description: "The attack path (e.g., /api/users?id=1 OR 1=1)" },
                reasoning: { type: "string", description: "Why this path targets the specific app" },
              },
              required: ["value", "reasoning"],
            },
          },
        };
      }
      if (field === "body") {
        return {
          type: "function",
          function: {
            name: fieldName,
            description: "Generate a malicious request body",
            parameters: {
              type: "object",
              properties: {
                value: { type: "string", description: "JSON body with attack payload" },
                attack_type: { type: "string", description: "Type of attack (SQLi, XSS, etc.)" },
              },
              required: ["value", "attack_type"],
            },
          },
        };
      }
      break;

    case "rate_limiting":
      if (field === "path") {
        return {
          type: "function",
          function: {
            name: fieldName,
            description: "Generate a path pattern for rate limiting",
            parameters: {
              type: "object",
              properties: {
                value: { type: "string", description: "Path pattern (e.g., /api/auth/*)" },
                endpoint_type: { type: "string", description: "Type of endpoint (auth, api, public)" },
              },
              required: ["value", "endpoint_type"],
            },
          },
        };
      }
      if (field === "name") {
        return {
          type: "function",
          function: {
            name: fieldName,
            description: "Generate a descriptive rule name",
            parameters: {
              type: "object",
              properties: {
                value: { type: "string", description: "Descriptive name for the rate limit rule" },
              },
              required: ["value"],
            },
          },
        };
      }
      if (field === "max_requests") {
        return {
          type: "function",
          function: {
            name: fieldName,
            description: "Determine appropriate request limit",
            parameters: {
              type: "object",
              properties: {
                value: { type: "number", description: "Max requests allowed" },
                reasoning: { type: "string", description: "Why this limit is appropriate" },
              },
              required: ["value", "reasoning"],
            },
          },
        };
      }
      break;

    case "api_shield":
      if (field === "path") {
        return {
          type: "function",
          function: {
            name: fieldName,
            description: "Generate an API endpoint path based on deep app analysis",
            parameters: {
              type: "object",
              properties: {
                value: { type: "string", description: "API endpoint path" },
                endpoint_purpose: { type: "string", description: "What this endpoint does" },
                requires_auth: { type: "boolean", description: "Whether this endpoint needs authentication" },
              },
              required: ["value", "endpoint_purpose", "requires_auth"],
            },
          },
        };
      }
      if (field === "method") {
        return {
          type: "function",
          function: {
            name: fieldName,
            description: "Determine the HTTP method for an endpoint",
            parameters: {
              type: "object",
              properties: {
                value: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH"] },
                reasoning: { type: "string", description: "Why this method is used" },
              },
              required: ["value", "reasoning"],
            },
          },
        };
      }
      break;

    case "rule_engine":
      if (field === "pattern") {
        return {
          type: "function",
          function: {
            name: fieldName,
            description: "Generate a regex pattern for attack detection",
            parameters: {
              type: "object",
              properties: {
                value: { type: "string", description: "Regex pattern" },
                targets: { type: "string", description: "What attacks this pattern catches" },
              },
              required: ["value", "targets"],
            },
          },
        };
      }
      if (field === "name") {
        return {
          type: "function",
          function: {
            name: fieldName,
            description: "Generate a descriptive rule name",
            parameters: {
              type: "object",
              properties: {
                value: { type: "string", description: "Rule name" },
              },
              required: ["value"],
            },
          },
        };
      }
      break;
  }

  // Fallback generic field tool
  return {
    type: "function",
    function: {
      name: fieldName,
      description: `Generate value for ${field} field`,
      parameters: {
        type: "object",
        properties: {
          value: { type: "string", description: `Value for ${field}` },
        },
        required: ["value"],
      },
    },
  };
}
