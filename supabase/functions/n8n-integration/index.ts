import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * n8n Integration MCP Server - Supabase Edge Function
 * 
 * MCP Server für n8n Workflow-Integration über HTTP
 * Behebt JSON-Parsing-Fehler durch korrekte Error-Handling
 */

// Environment Variables mit Fallback-Werten
// Werden aus Supabase Secrets oder Request Headers gelesen
const N8N_URL = Deno.env.get("N8N_BASE_URL") || "http://195.201.42.89:5678";
const N8N_API_TOKEN = Deno.env.get("N8N_API_TOKEN") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiZmI2ZTEyNS01YjQyLTQ4MzgtOThlMS0wMGQ2ZDhlOGQ5MTYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY0OTU3NTY1fQ.YFz3QStMabc1HOxJAR5X50M1-bjyW5kJcATZzCgcKFU";

// CORS Headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-N8N-API-KEY",
};

interface MCPRequest {
  jsonrpc: string;
  id?: string | number | null;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id?: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Optional: Prüfe Authorization Header (für JWT-Verifizierung)
  // Für MCP Server ist JWT optional, da die Function über web_fetch aufgerufen wird
  const authHeader = req.headers.get("Authorization");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  
  // Wenn Authorization Header vorhanden, prüfe JWT (optional)
  // Wenn nicht vorhanden, erlaube trotzdem (für MCP web_fetch)
  
  try {
    const url = new URL(req.url);
    
    // MCP Protocol Handler
    let mcpRequest: MCPRequest;
    
    try {
      const body = await req.json();
      mcpRequest = body;
    } catch (e) {
      // Wenn kein JSON Body, behandle als GET Request
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          result: {
            serverInfo: {
              name: "n8n-integration",
              version: "1.0.0",
            },
            capabilities: {
              tools: {},
            },
          },
        } as MCPResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { method, params, id } = mcpRequest;

    // Handle MCP Methods
    switch (method) {
      case "initialize":
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id,
            result: {
              protocolVersion: "2024-11-05",
              capabilities: {
                tools: {},
              },
              serverInfo: {
                name: "n8n-integration",
                version: "1.0.0",
              },
            },
          } as MCPResponse),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );

      case "tools/list":
        const tools = [
          {
            name: "list_workflows",
            description: "Listet alle n8n Workflows auf",
            inputSchema: {
              type: "object",
              properties: {
                active_only: {
                  type: "boolean",
                  description: "Nur aktive Workflows anzeigen",
                  default: false,
                },
              },
            },
          },
          {
            name: "get_workflow",
            description: "Holt einen spezifischen Workflow",
            inputSchema: {
              type: "object",
              properties: {
                workflow_id: {
                  type: "string",
                  description: "ID des Workflows",
                },
              },
              required: ["workflow_id"],
            },
          },
          {
            name: "test_n8n_connection",
            description: "Testet die Verbindung zu n8n",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
        ];

        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id,
            result: {
              tools,
            },
          } as MCPResponse),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );

      case "tools/call":
        const { name, arguments: toolArgs } = params || {};
        
        try {
          let result;
          
          switch (name) {
            case "list_workflows":
              result = await listWorkflows(toolArgs?.active_only || false);
              break;
              
            case "get_workflow":
              if (!toolArgs?.workflow_id) {
                throw new Error("workflow_id ist erforderlich");
              }
              result = await getWorkflow(toolArgs.workflow_id);
              break;
              
            case "test_n8n_connection":
              result = await testConnection();
              break;
              
            default:
              throw new Error(`Unbekanntes Tool: ${name}`);
          }

          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id,
              result: {
                content: [
                  {
                    type: "text",
                    text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
                  },
                ],
              },
            } as MCPResponse),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        } catch (error) {
          // Fehler nach stderr (nicht stdout!) - in Edge Functions: console.error
          console.error(`Tool Error [${name}]:`, error);
          
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id,
              error: {
                code: -32000,
                message: error instanceof Error ? error.message : String(error),
              },
            } as MCPResponse),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

      default:
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`,
            },
          } as MCPResponse),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }
  } catch (error) {
    // Alle Fehler nach stderr (console.error)
    console.error("MCP Server Error:", error);
    
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: error instanceof Error ? error.message : "Parse error",
        },
      } as MCPResponse),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper Functions
async function listWorkflows(activeOnly: boolean = false): Promise<any> {
  const response = await fetch(`${N8N_URL}/api/v1/workflows`, {
    method: "GET",
    headers: {
      "X-N8N-API-KEY": N8N_API_TOKEN,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`n8n API Error: ${response.status} ${response.statusText}`);
  }

  const workflows = await response.json();
  
  if (activeOnly) {
    return workflows.filter((w: any) => w.active);
  }
  
  return workflows;
}

async function getWorkflow(workflowId: string): Promise<any> {
  const response = await fetch(`${N8N_URL}/api/v1/workflows/${workflowId}`, {
    method: "GET",
    headers: {
      "X-N8N-API-KEY": N8N_API_TOKEN,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`n8n API Error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function testConnection(): Promise<any> {
  const response = await fetch(`${N8N_URL}/api/v1/workflows`, {
    method: "GET",
    headers: {
      "X-N8N-API-KEY": N8N_API_TOKEN,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Verbindung fehlgeschlagen: ${response.status} ${response.statusText}`);
  }

  const workflows = await response.json();
  
  return {
    status: "success",
    message: "✅ Verbindung zu n8n erfolgreich!",
    workflows: {
      total: workflows.length,
      active: workflows.filter((w: any) => w.active).length,
    },
    url: N8N_URL,
  };
}

















