import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/diag")({
  server: {
    handlers: {
      GET: async () => {
        const results: Record<string, string> = {};
        for (const name of ["module", "buffer", "crypto", "stream"]) {
          try {
            const spec = "node:" + name;
            await import(/* @vite-ignore */ spec);
            results[spec] = "ok";
          } catch (error) {
            results["node:" + name] = String(error);
          }
        }
        return new Response(JSON.stringify(results), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
