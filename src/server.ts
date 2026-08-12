import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      async (m) => {
        const entry = (m.default ?? m) as ServerEntry;
        // Warm up so the nitro app instance exists, then hook its error handler
        // so the original throw is logged instead of h3's generic 500 body.
        try {
          await entry.fetch(new Request("http://localhost/__ssr_warmup"), undefined, undefined);
        } catch {
          // ignore warmup failures
        }
        hookNitroErrorHandler();
        return entry;
      },
    );
  }
  return serverEntryPromise;
}

function hookNitroErrorHandler(): void {
  try {
    const registry = (globalThis as Record<string, any>).__nitro__;
    for (const app of Object.values(registry ?? {})) {
      const h3 = (app as any)?.h3;
      const config = h3?.config ?? h3?._config;
      if (!config || typeof config.onError !== "function" || config.__lovableHooked) continue;
      const original = config.onError.bind(config);
      config.onError = (error: unknown, event: unknown) => {
        console.error("[ssr-original-error]", error);
        return original(error, event);
      };
      config.__lovableHooked = true;
    }
  } catch (error) {
    console.error("[ssr-hook-failed]", error);
  }
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  const captured = consumeLastCapturedError();
  if (captured) {
    console.error(captured);
  } else {
    console.error(new Error(`h3 swallowed SSR error: ${body}`));
    await logRuntimeProbes();
  }
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// Diagnostic: when h3 hides the original throw, probe the runtime features the
// server bundle depends on so the failure shows up in server logs.
async function logRuntimeProbes(): Promise<void> {
  const probes: Array<[string, () => Promise<unknown>]> = [
    ["node:module", () => import("node:module")],
    ["node:crypto", () => import("node:crypto")],
    ["node:stream", () => import("node:stream")],
    ["node:buffer", () => import("node:buffer")],
    ["react-dom/server", () => import("react-dom/server")],
  ];
  for (const [name, load] of probes) {
    try {
      await load();
    } catch (error) {
      console.error(`[ssr-probe] ${name} failed:`, error);
    }
  }
  console.error(
    `[ssr-probe] env present: ${["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"]
      .map((k) => `${k}=${process.env[k] ? "yes" : "no"}`)
      .join(" ")}`,
  );
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // Nitro pushes swallowed handler errors onto req.context.nitro.errors.
      // Seeding the array lets us recover the original stack for logging.
      const captureBucket: Array<{ error: unknown }> = [];
      try {
        (request as unknown as { context?: Record<string, unknown> }).context = {
          nitro: { errors: captureBucket },
        };
      } catch {
        // request may be frozen in some runtimes; diagnostics are best-effort
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      if (response.status >= 500) {
        for (const entry of captureBucket) console.error("[ssr-nitro-error]", entry?.error);
      }
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
