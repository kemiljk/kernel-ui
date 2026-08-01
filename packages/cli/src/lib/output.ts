export function log(message: string) {
  console.log(message);
}

export function success(message: string) {
  console.log(`✓ ${message}`);
}

export function warn(message: string) {
  console.warn(`! ${message}`);
}

export function info(message: string) {
  console.log(`  ${message}`);
}

export function printHelp() {
  console.log(`kernel — integrate Kernel UI into your project

Usage:
  kernel init [options]     Install packages and wire up styles
  kernel doctor [options]   Check Kernel setup and flag migration hints
  kernel docs [component]   Look up component metadata locally

Global options:
  --path <dir>              Project directory (default: cwd)
  --dry-run                 Preview changes without writing files
  --yes, -y                 Skip prompts and accept defaults
  -h, --help                Show help
  -v, --version             Show version

init options:
  --package-manager <pm>    npm | yarn | pnpm | bun
  --framework <name>        vite | next
  --accent <name>           amber | blue | green | orange | red | teal | violet
  --tailwind                Use the Tailwind v4 bridge instead of plain CSS imports
  --tokens-only             Install only @kernelui-lib/styles

docs options:
  --json                    Output registry entry as JSON
  --markdown                Output a short markdown summary

Examples:
  npx @kernelui-lib/cli init
  kernel doctor --path ./apps/web
  kernel docs text-field --json
`);
}
