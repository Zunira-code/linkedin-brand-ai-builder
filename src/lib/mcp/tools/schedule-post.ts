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
  name: "schedule_post",
  title: "Schedule a Postpilot post",
  description:
    "Schedule an existing draft to auto-publish to LinkedIn at the given ISO 8601 timestamp. Only the signed-in user's own posts can be scheduled.",
  inputSchema: {
    id: z.string().uuid().describe("Post id (from list_posts or create_draft)."),
    scheduled_at: z
      .string()
      .datetime()
      .describe("Publish time as ISO 8601 UTC timestamp, e.g. 2026-07-10T14:00:00Z."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, scheduled_at }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    if (new Date(scheduled_at).getTime() <= Date.now()) {
      return { content: [{ type: "text", text: "scheduled_at must be in the future" }], isError: true };
    }
    const supabase = userClient(ctx);
    const { data, error } = await supabase
      .from("posts")
      .update({ status: "scheduled", scheduled_at })
      .eq("id", id)
      .select("id, status, scheduled_at, content")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Scheduled for ${data.scheduled_at}.` }],
      structuredContent: { post: data },
    };
  },
});