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
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
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
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
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
