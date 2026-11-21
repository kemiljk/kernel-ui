/**
 * Approve the Version Packages pull request's CI run.
 *
 * changesets/action pushes `changeset-release/main` with the workflow
 * GITHUB_TOKEN, so the pull_request run is attributed to github-actions[bot].
 * A repository that requires approval for all outside collaborators records
 * that run as `conclusion: action_required` with zero jobs. The release job
 * that pushed the branch is the one place a token with `actions: write` can
 * clear that gate. This script approves only CI runs on that branch's head.
 */
import { execFileSync } from "node:child_process";

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

if (!repo || !token) {
  console.log("[approve-release-pr-ci] not running inside GitHub Actions; nothing to approve");
  process.exit(0);
}

function gh(args, { allowFailure = false } = {}) {
  try {
    return execFileSync("gh", args, {
      encoding: "utf8",
      env: { ...process.env, GH_TOKEN: token },
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const stderr = error.stderr?.toString() ?? error.message;
    if (allowFailure) return { error: stderr };
    const wrapped = new Error(stderr);
    wrapped.cause = error;
    throw wrapped;
  }
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

let headSha;
try {
  git(["fetch", "origin", "changeset-release/main"]);
  headSha = git(["rev-parse", "origin/changeset-release/main"]);
} catch (error) {
  console.log("[approve-release-pr-ci] changeset-release/main is not on origin yet; nothing to approve");
  console.log(error.stderr?.toString() ?? error.message);
  process.exit(0);
}

console.log(`[approve-release-pr-ci] head ${headSha}`);

function listRuns() {
  const raw = gh([
    "api",
    `repos/${repo}/actions/runs?head_sha=${headSha}&event=pull_request&per_page=20`,
  ]);
  const runs = JSON.parse(raw).workflow_runs ?? [];
  return runs.filter((run) => run.name === "CI" && run.path.endsWith("ci.yml"));
}

const deadline = Date.now() + 2 * 60 * 1000;
let runs = [];
while (Date.now() < deadline) {
  runs = listRuns();
  if (runs.length > 0) break;
  console.log("[approve-release-pr-ci] waiting for the pull_request CI run to appear");
  await new Promise((resolve) => setTimeout(resolve, 10_000));
}

if (runs.length === 0) {
  console.log("[approve-release-pr-ci] no CI run appeared within 2 minutes");
  console.log(
    "[approve-release-pr-ci] if the Version Packages PR is waiting, approve it from the Actions tab",
  );
  process.exit(0);
}

const gated = runs.filter((run) => run.conclusion === "action_required");
if (gated.length === 0) {
  const summary = runs.map((run) => `${run.id} ${run.status}/${run.conclusion}`).join(", ");
  console.log(`[approve-release-pr-ci] CI is not waiting for approval (${summary})`);
  process.exit(0);
}

let failed = false;
for (const run of gated) {
  console.log(`[approve-release-pr-ci] approving CI run ${run.id} ${run.html_url}`);
  const result = gh(["api", "-X", "POST", `repos/${repo}/actions/runs/${run.id}/approve`], {
    allowFailure: true,
  });
  if (result && typeof result === "object" && result.error) {
    failed = true;
    console.error(`[approve-release-pr-ci] could not approve run ${run.id}`);
    console.error(result.error);
  }
}

if (failed) {
  console.error(
    "[approve-release-pr-ci] GITHUB_TOKEN could not approve the run. A maintainer needs to open the run and choose Approve and run, or set Settings → Actions → General → Approval for running fork pull request workflows from contributors to first-time contributors.",
  );
  process.exit(1);
}
