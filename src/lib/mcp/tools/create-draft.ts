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
  name: "create_draft",
  title: "Create a Postpilot draft",
  description:
    "Create a new LinkedIn post draft in the signed-in user's Postpilot workspace. Content is stored as-is; the post is not published.",
  inputSchema: {
    content: z.string().trim().min(1).describe("Full post body text (LinkedIn markdown / plain text)."),
    format: z
      .enum(["story", "listicle", "hook+insight", "question", "framework"])
      .optional()
      .describe("Format hint. Defaults to 'story'."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ content, format }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = userClient(ctx);
    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: ctx.getUserId(),
        content,
        format: format ?? "story",
        status: "draft",
      })
      .select("id, content, format, status, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Draft created (id: ${data.id}).` }],
      structuredContent: { post: data },
    };
  },
});