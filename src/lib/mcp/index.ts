import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPostsTool from "./tools/list-posts";
import createDraftTool from "./tools/create-draft";
import schedulePostTool from "./tools/schedule-post";
import deletePostTool from "./tools/delete-post";
import listInspirationTool from "./tools/list-inspiration";

// The OAuth issuer MUST be the direct Supabase host (not the .lovable.cloud proxy).
// Vite inlines VITE_SUPABASE_PROJECT_ID at build time; the fallback keeps the
// issuer well-formed during the throwaway manifest-extract eval.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "postpilot-mcp",
  title: "Postpilot",
  version: "0.1.0",
  instructions:
    "Postpilot tools for the signed-in user's LinkedIn content workspace. Use `list_posts` to review drafts/scheduled/posted content, `create_draft` to add a new post, `schedule_post` to auto-publish an existing draft at a given time, `delete_post` to remove one, and `list_inspiration_templates` to browse viral hook templates.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listPostsTool, createDraftTool, schedulePostTool, deletePostTool, listInspirationTool],
});