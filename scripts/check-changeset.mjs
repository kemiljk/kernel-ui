import { execFileSync } from "node:child_process";

const baseSha = process.env.GITHUB_BASE_SHA ?? process.argv[2];
const headSha = process.env.GITHUB_SHA ?? process.argv[3] ?? "HEAD";
const pullRequestTitle = process.env.GITHUB_PR_TITLE ?? "";

if (!baseSha) {
  console.error("[check-changeset] provide a base SHA or set GITHUB_BASE_SHA");
  process.exit(1);
}

if (/^Version Packages(?:$|\s)/.test(pullRequestTitle)) {
  console.log("[check-changeset] release PR exempt: Version Packages");
  process.exit(0);
}

const changedFiles = execFileSync("git", ["diff", "--name-only", `${baseSha}...${headSha}`], { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

const publishableRoot = /^packages\/(react|elements|styles|cli|agent)\//;
const packageManifest = /^packages\/(react|elements|styles|cli|agent)\/package\.json$/;

function showJson(rev, file) {
  try {
    return JSON.parse(execFileSync("git", ["show", `${rev}:${file}`], { encoding: "utf8" }));
  } catch {
    return null;
  }
}

// devDependencies are not published. A Dependabot bump of vite, @types/node,
// or a test helper edits the manifest without changing the package consumers
// install, so it must not demand a release changeset. Any other manifest
// field (dependencies, exports, version, files, …) still does.
function devDependenciesOnly(file) {
  const before = showJson(baseSha, file);
  const after = showJson(headSha, file);
  if (!before || !after) return false;
  const rest = (pkg) => {
    const { devDependencies: _devDependencies, ...manifest } = pkg;
    return manifest;
  };
  return JSON.stringify(rest(before)) === JSON.stringify(rest(after));
}

const publishableChange = changedFiles.some((file) => {
  if (!publishableRoot.test(file)) return false;
  if (packageManifest.test(file) && devDependenciesOnly(file)) return false;
  return true;
});
const changeset = changedFiles.some((file) => /^\.changeset\/[^/]+\.md$/.test(file));

if (publishableChange && !changeset) {
  console.error("[check-changeset] publishable package changes require a .changeset/*.md file");
  console.error("[check-changeset] add one with `bunx changeset` and choose the affected package release type");
  process.exit(1);
}

console.log(publishableChange ? "[check-changeset] ok: Changeset present" : "[check-changeset] ok: no publishable package changes");
