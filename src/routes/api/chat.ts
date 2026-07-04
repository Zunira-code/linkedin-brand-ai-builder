import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

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
        const body = (await request.json()) as { messages?: UIMessage[]; brandVoice?: string };
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");
        const system = body.brandVoice
          ? `${SYSTEM_PROMPT}\n\nBrand voice guidelines from the user:\n${body.brandVoice}`
          : SYSTEM_PROMPT;

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