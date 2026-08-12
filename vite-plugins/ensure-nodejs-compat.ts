import type { Plugin } from "vite";

/**
 * The deployed worker runs without the `nodejs_compat` flag, so any static
 * `node:*` import in the server bundle fails at module init with
 * `No such module "node:module"` — which made every server-rendered route
 * return 500.
 *
 * The only such import is Rolldown's generated `dist/server/_runtime.mjs`,
 * which imports `createRequire` from `node:module` to build a `__require`
 * helper. No chunk in the bundle imports that helper, so we replace it with a
 * throwing stub and drop the `node:module` import. We also re-add
 * `nodejs_compat` to the generated wrangler config for local/preview parity.
 */
export function ensureNodejsCompat(): Plugin {
  let root = process.cwd();

  const patchRuntime = async () => {
    const { readFile, writeFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const runtimePath = join(root, "dist/server/_runtime.mjs");

    let source: string;
    try {
      source = await readFile(runtimePath, "utf8");
    } catch {
      return;
    }
    if (!source.includes('from "node:module"')) return;

    const patched = source
      .replace(/import\s*\{[^}]*\}\s*from\s*"node:module";?\n?/, "")
      .replace(
        /var __require = [^\n]*\n/,
        'var __require = (id) => { throw new Error(`Dynamic require of "${id}" is not supported`); };\n',
      );
    await writeFile(runtimePath, patched);
  };

  const patchWrangler = async () => {
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

  const patch = async () => {
    await patchRuntime();
    await patchWrangler();
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
