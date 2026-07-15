import { createFileRoute } from "@tanstack/react-router";
import { requireApiUser } from "@/lib/api-auth.server";

export const Route = createFileRoute("/api/generate-post-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireApiUser(request);
        } catch (r) {
          if (r instanceof Response) return r;
          return new Response("Unauthorized", { status: 401 });
        }
        const { prompt } = (await request.json()) as { prompt?: string };
        if (!prompt || !prompt.trim()) {
          return new Response("prompt required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const styled = `Editorial LinkedIn post visual, 1:1 square, modern SaaS aesthetic, clean bold composition, subtle gradient background, no text or letters in the image, high contrast, magazine quality. Subject: ${prompt}`;

        const upstream = await fetch(
          "https://ai.gateway.lovable.dev/v1/images/generations",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "openai/gpt-image-2",
              prompt: styled,
              size: "1024x1024",
              quality: "low",
              n: 1,
              stream: true,
              partial_images: 2,
            }),
          },
        );
        if (!upstream.ok || !upstream.body) {
          const txt = await upstream.text().catch(() => "");
          return new Response(txt || "Image generation failed", { status: upstream.status });
        }
        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});