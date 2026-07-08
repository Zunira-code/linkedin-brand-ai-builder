import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function userClient(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_inspiration_templates",
  title: "Browse Postpilot inspiration templates",
  description:
    "List viral LinkedIn hook and post templates from Postpilot's inspiration library. Optional filters for category and hook type.",
  inputSchema: {
    category: z.string().optional().describe("Filter by category (case-sensitive)."),
    hook_type: z.string().optional().describe("Filter by hook type."),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, hook_type, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = userClient(ctx);
    let q = supabase
      .from("inspiration_templates")
      .select("id, title, category, hook_type, template_text")
      .limit(limit ?? 20);
    if (category) q = q.eq("category", category);
    if (hook_type) q = q.eq("hook_type", hook_type);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { templates: data ?? [] },
    };
  },
});