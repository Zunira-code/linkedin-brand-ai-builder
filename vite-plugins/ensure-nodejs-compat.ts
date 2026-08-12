import type { Plugin } from "vite";

/**
 * The deploy runtime does NOT enable Node.js built-ins by default, but the
 * generated dist/server/wrangler.json ships with an empty compatibility_flags
 * array. Without `nodejs_compat` the server bundle fails at module init with
 * `No such module "node:module"`, which makes every route return 500.
 * This plugin re-adds the flag after the build output is written.
 */
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
    if (flags.includes("nodejs_compat")) return;

    await writeFile(
      configPath,
      JSON.stringify({ ...config, compatibility_flags: [...flags, "nodejs_compat"] }, null, 2),
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