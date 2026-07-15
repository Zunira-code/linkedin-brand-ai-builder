import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { requireApiUser } from "@/lib/api-auth.server";

const SYSTEM_PROMPT = `You are Postpilot, an expert LinkedIn ghostwriter for founders, operators and creators.

Rules for every post you draft:
- Open with a 1-line hook that stops the scroll. No greetings, no "In today's world".
- Use short lines and generous whitespace (single-sentence paragraphs).
- Speak like a smart human — no corporate fluff, no hashtags unless asked, no emojis unless asked.
- End with either a question, a takeaway, or a call-to-comment.
- Keep it under ~1300 characters unless the user asks for long-form.

If the user provides brand voice, topic, tone or format constraints, follow them tightly. When asked to remix a template, keep the structure but rewrite the content so it feels original and specific.

Output the post text only — no preface, no "Here is your post:", no explanations.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireApiUser(request);
        } catch (r) {
          if (r instanceof Response) return r;
          return new Response("Unauthorized", { status: 401 });
        }
        const body = (await request.json()) as {
          messages?: UIMessage[];
          brandVoice?: string;
          voiceSamples?: string[];
        };
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        let system = SYSTEM_PROMPT;
        if (body.brandVoice) {
          system += `\n\nBrand voice guidelines from the user:\n${body.brandVoice}`;
        }
        const samples = (body.voiceSamples ?? [])
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 20);
        if (samples.length > 0) {
          const formatted = samples
            .map((s, i) => `--- Sample ${i + 1} ---\n${s}`)
            .join("\n\n");
          system +=
            `\n\nBelow are ${samples.length} real posts the user has actually written on LinkedIn. Study them carefully and mirror the user's vocabulary, sentence length, cadence, punctuation habits, opinions, and recurring themes. Do NOT invent a generic "professional" voice — sound like the same person wrote this new post.\n\n${formatted}`;
        }

        const result = streamText({
          model,
          system,
          messages: await convertToModelMessages(body.messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: body.messages });
      },
    },
  },
});