// The two Node built-ins src/playwright.ts uses, declared here so the package
// doesn't need @types/node (which would also leak Node globals into the DOM
// checks' types). Not emitted: dist/playwright.d.ts doesn't reference them.
declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
}
declare module "node:url" {
  export function fileURLToPath(url: URL | string): string;
}
