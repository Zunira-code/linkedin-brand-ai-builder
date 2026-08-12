import type { Plugin } from "vite";

/**
 * Two deploy-config problems make every server-rendered route return 500:
 *
 * 1. The generated dist/server/wrangler.json ships with an empty
 *    compatibility_flags array, so Node built-ins are unavailable and the
 *    server bundle dies at module init with `No such module "node:module"`.
 * 2. compatibility_date defaults to the build date, which opts the worker into
 *    brand-new runtime defaults the bundled server stack has not been tested
 *    against.
 *
 * This plugin re-adds `nodejs_compat` and pins the compatibility date to a
 * known-good value after the build output is written.
 */
const SAFE_COMPATIBILITY_DATE = "2026-08-01";
export function ensureNodejsCompat(): Plugin {
  let root = process.cwd();

  const patch = async () => {
    const { readFile, writeFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const configPath = join(root, "dist/server/wrangler.json");

    let config: Record<string, unknown>;
    try {
      config = JSON.parse(await readFile(configPath, "utf8")) as Record<string, unknown>;
    } catch {
      return;
    }

    const flags = Array.isArray(config.compatibility_flags)
      ? (config.compatibility_flags as string[])
      : [];
    const nextFlags = flags.includes("nodejs_compat") ? flags : [...flags, "nodejs_compat"];
    const dateNeedsPin = config.compatibility_date !== SAFE_COMPATIBILITY_DATE;
    if (nextFlags.length === flags.length && !dateNeedsPin) return;

    await writeFile(
      configPath,
      JSON.stringify(
        {
          ...config,
          compatibility_date: SAFE_COMPATIBILITY_DATE,
          compatibility_flags: nextFlags,
        },
        null,
        2,
      ),
    );
  };

  return {
    name: "lovable-ensure-nodejs-compat",
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    buildApp: { order: "post", handler: patch },
    closeBundle: { order: "post", sequential: true, handler: patch },
  };
}