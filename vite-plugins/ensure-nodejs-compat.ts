import type { Plugin } from "vite";

/**
 * The generated dist/server/wrangler.json ships with an empty
 * compatibility_flags array. Without `nodejs_compat` the deployed worker
 * cannot resolve Node built-ins (`No such module "node:module"`), which makes
 * every server-rendered route return 500. This plugin re-adds the flag after
 * the build output is written, leaving compatibility_date untouched.
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
