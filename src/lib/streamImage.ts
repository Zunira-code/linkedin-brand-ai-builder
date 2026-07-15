import { createParser } from "eventsource-parser";
import { flushSync } from "react-dom";
import { supabase } from "@/integrations/supabase/client";

type ImageEventPayload =
  | { type: "image_generation.partial_image"; b64_json: string; partial_image_index: number; created_at: number }
  | { type: "image_generation.completed"; b64_json: string; created_at: number }
  | { type: "error"; error: { message: string; type?: string; code?: string } };

export async function streamImage(
  endpoint: string,
  prompt: string,
  onFrame: (dataUrl: string, isFinal: boolean) => void,
): Promise<void> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Please sign in to generate images.");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Image generation failed: ${res.status}`);
  }

  let sawCompleted = false;
  let streamError: string | undefined;
  const parser = createParser({
    onEvent(event) {
      let payload: ImageEventPayload | undefined;
      try { payload = JSON.parse(event.data) as ImageEventPayload; } catch { /* noop */ }
      if (event.event === "error" || payload?.type === "error") {
        streamError = (payload as { error?: { message?: string } })?.error?.message ?? "Image generation failed";
        return;
      }
      if (
        event.event !== "image_generation.partial_image" &&
        event.event !== "image_generation.completed"
      ) return;
      if (!payload) return;
      const isFinal = event.event === "image_generation.completed";
      flushSync(() => {
        onFrame(`data:image/png;base64,${(payload as { b64_json: string }).b64_json}`, isFinal);
      });
      if (isFinal) sawCompleted = true;
    },
  });

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(value);
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  if (streamError) throw new Error(streamError);
  if (!sawCompleted) throw new Error("Image stream ended without a completed event");
}