import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Utility to compute timezone via Intl API.
function getTimeZoneForLocation(location: string): string | null {
  // This is a limited approach; for full location-to-timezone mapping, use a full Geo API.
  // For demonstration, let's use USA cities as an example.
  const locationMap: Record<string, string> = {
    "new york": "America/New_York",
    "los angeles": "America/Los_Angeles",
    "chicago": "America/Chicago",
    "denver": "America/Denver",
    "phoenix": "America/Phoenix",
    "london": "Europe/London",
    "paris": "Europe/Paris",
    "berlin": "Europe/Berlin",
    "tokyo": "Asia/Tokyo",
    "sydney": "Australia/Sydney",
    "beijing": "Asia/Shanghai"
  };
  const key = location.trim().toLowerCase();
  return locationMap[key] || null;
}

export class MyMCP extends McpAgent {
  server = new McpServer({
    name: "Authless TimeZone Service",
    version: "1.0.1"
  });

  async init() {
    // Basic addition tool (as reference/example)
    this.server.tool(
      "add",
      "Add two numbers together",
      { a: z.number(), b: z.number() },
      async ({ a, b }) => ({
        content: [{ type: "text", text: String(a + b) }]
      })
    );

    // Get Timezone Tool
    this.server.tool(
      "get_timezone",
      "Get the IANA timezone given a location name (city/country)",
      {
        location: z.string().describe(
          "The city or location to look up the timezone for, such as 'New York', 'London', etc."
        )
      },
      async ({ location }) => {
        // Try to map common locations
        const tz = getTimeZoneForLocation(location);
        if (tz) {
          return {
            content: [
              {
                type: "text",
                text: `The timezone for ${location} is ${tz}.`
              },
              {
                type: "json",
                json: { location, timezone: tz }
              }
            ]
          };
        }
        // If we don't have a direct mapping, default to the user's current time zone
        // NOTE: Since we are running on the server, we don't have access to browsers' Intl API with user context.
        // So as a fallback, we'll return null with a message.
        return {
          content: [
            {
              type: "text",
              text:
                `Sorry, I could not determine the timezone for '${location}'. Please enter a major city (for best results), or rephrase.`
            },
            {
              type: "json",
              json: { location, timezone: null, error: "Location not recognized." }
            }
          ]
        };
      }
    );
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp") {
      return MyMCP.serve("/mcp").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};
