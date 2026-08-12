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
const publishableChange = changedFiles.some((file) => /^(packages\/(react|elements|styles|cli)\/)/.test(file));
const changeset = changedFiles.some((file) => /^\.changeset\/[^/]+\.md$/.test(file));

if (publishableChange && !changeset) {
  console.error("[check-changeset] publishable package changes require a .changeset/*.md file");
  console.error("[check-changeset] add one with `bunx changeset` and choose the affected package release type");
  process.exit(1);
}

console.log(publishableChange ? "[check-changeset] ok: Changeset present" : "[check-changeset] ok: no publishable package changes");
