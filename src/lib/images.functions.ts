import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "post-images";

export type LibraryImage = {
  path: string;
  name: string;
  createdAt: string | null;
  size: number | null;
  url: string;
};

/** List the signed-in user's uploaded post images, newest first. */
export const listMyImages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LibraryImage[]> => {
    const { data, error } = await context.supabase.storage
      .from(BUCKET)
      .list(context.userId, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw new Error(error.message);
    const files = (data ?? []).filter((f) => f.id !== null);
    if (files.length === 0) return [];
    const paths = files.map((f) => `${context.userId}/${f.name}`);
    const { data: signed, error: signErr } = await context.supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, 3600);
    if (signErr) throw new Error(signErr.message);
    const urlByPath = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]));
    return files.map((f) => ({
      path: `${context.userId}/${f.name}`,
      name: f.name,
      createdAt: (f as { created_at?: string | null }).created_at ?? null,
      size: (f.metadata as { size?: number } | null)?.size ?? null,
      url: urlByPath.get(`${context.userId}/${f.name}`) ?? "",
    }));
  });

const PathInput = z.object({ path: z.string().min(1) });

function assertOwned(path: string, userId: string) {
  if (!path.startsWith(`${userId}/`) || path.includes("..")) {
    throw new Error("Not allowed");
  }
}

/** Delete one of the user's uploaded images. */
export const deleteMyImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PathInput.parse(input))
  .handler(async ({ context, data }) => {
    assertOwned(data.path, context.userId);
    const { error } = await context.supabase.storage.from(BUCKET).remove([data.path]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Fresh signed URL for a stored image (used when re-opening a draft). */
export const signMyImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PathInput.parse(input))
  .handler(async ({ context, data }) => {
    assertOwned(data.path, context.userId);
    const { data: signed, error } = await context.supabase.storage
      .from(BUCKET)
      .createSignedUrl(data.path, 3600);
    if (error || !signed) throw new Error(error?.message ?? "Could not sign image");
    return { url: signed.signedUrl };
  });
