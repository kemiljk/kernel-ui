import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = "kemiljk/kernel-ui";
const outPath = join(dirname(fileURLToPath(import.meta.url)), "../src/data/github-stars.json");

let stars = null;

try {
  const response = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "kernelui-docs-build",
    },
  });

  if (response.ok) {
    const data = await response.json();
    if (typeof data.stargazers_count === "number") {
      stars = data.stargazers_count;
    }
  } else {
    console.warn(`fetch-github-stars: GitHub API returned ${response.status}`);
  }
} catch (error) {
  console.warn("fetch-github-stars: request failed", error);
}

writeFileSync(outPath, `${JSON.stringify({ stars }, null, 2)}\n`);
console.log(`fetch-github-stars: wrote ${stars ?? "null"} to src/data/github-stars.json`);
