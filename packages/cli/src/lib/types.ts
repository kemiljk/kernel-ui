export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

export type Framework = "vite" | "next" | "unknown";

export interface GlobalOptions {
  cwd: string;
  dryRun: boolean;
  yes: boolean;
}

export interface InitOptions extends GlobalOptions {
  packageManager?: PackageManager;
  framework?: Framework;
  accent?: string;
  tailwind?: boolean;
  tokensOnly?: boolean;
}

export interface DoctorIssue {
  level: "error" | "warn" | "info";
  message: string;
  hint?: string;
}
