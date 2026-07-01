// Runs after `astro build`. Astro's own build is prerendered static
// HTML (no adapter, no server functions), so the LLM-friendly markdown
// mirror can't be a live endpoint — it has to be a build artefact.
// Rather than hand-duplicating each page's prose into a second format
// (the props tables and accessibility bullets are all hand-written
// HTML, no structured source to generate from), this scrapes the
// already-built `.docs-prose` subtree and converts it to markdown, so
// the mirror always matches whatever the page actually renders.
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parse } from "node-html-parser";

const componentsDir = path.join(import.meta.dirname, "..", "dist", "components");

function inlineToMarkdown(node) {
  let out = "";
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      // `.rawText` is the undecoded source (`=&gt;` stays literal);
      // `.text` runs entity decoding, which is what plain prose needs.
      out += child.text.replace(/\s+/g, " ");
      continue;
    }
    if (typeof child.tagName !== "string") continue;
    const tag = child.tagName.toLowerCase();
    if (tag === "code" || tag === "kbd") {
      out += `\`${child.text}\``;
    } else if (tag === "a") {
      out += `[${inlineToMarkdown(child).trim()}](${child.getAttribute("href") ?? ""})`;
    } else if (tag === "strong" || tag === "b") {
      out += `**${inlineToMarkdown(child).trim()}**`;
    } else if (tag === "em" || tag === "i") {
      out += `*${inlineToMarkdown(child).trim()}*`;
    } else {
      out += inlineToMarkdown(child);
    }
  }
  return out;
}

function childElements(node, tagName) {
  return node.childNodes.filter(
    (n) => typeof n.tagName === "string" && (!tagName || n.tagName.toLowerCase() === tagName),
  );
}

function tableToMarkdown(table) {
  const headerCells = childElements(table.querySelector("thead") ?? table, "tr")[0]
    ? childElements(childElements(table.querySelector("thead") ?? table, "tr")[0], "th")
    : [];
  const header = headerCells.map((th) => inlineToMarkdown(th).trim().replace(/\|/g, "\\|"));
  const bodyRows = childElements(table.querySelector("tbody") ?? table, "tr").map((tr) =>
    childElements(tr, "td").map((td) => inlineToMarkdown(td).trim().replace(/\|/g, "\\|")),
  );
  if (header.length === 0) return "";
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...bodyRows.map((cells) => `| ${cells.join(" | ")} |`),
  ];
  return lines.join("\n");
}

function usageAccordionToMarkdown(details) {
  const pre = details.querySelector("pre.astro-code");
  if (!pre) return "";
  const lang = pre.getAttribute("data-language") ?? "tsx";
  const code = pre.querySelector("code")?.text ?? "";
  return `## Usage\n\n\`\`\`${lang}\n${code}\n\`\`\`\n`;
}

function blockToMarkdown(node) {
  if (typeof node.tagName !== "string") return "";
  const tag = node.tagName.toLowerCase();
  const classList = node.classList;

  switch (tag) {
    case "h1":
      return `# ${inlineToMarkdown(node).trim()}\n`;
    case "h2":
      return `## ${inlineToMarkdown(node).trim()}\n`;
    case "h3":
      return `### ${inlineToMarkdown(node).trim()}\n`;
    case "p":
      return `${inlineToMarkdown(node).trim()}\n`;
    case "ul":
      return childElements(node, "li")
        .map((li) => `- ${inlineToMarkdown(li).trim()}`)
        .join("\n");
    case "ol":
      return childElements(node, "li")
        .map((li, index) => `${index + 1}. ${inlineToMarkdown(li).trim()}`)
        .join("\n");
    case "table":
      return tableToMarkdown(node);
    case "details":
      return classList?.contains("usage-accordion") ? usageAccordionToMarkdown(node) : "";
    case "div":
      // `.docs-example` is a live, hydrated demo — meaningless as static
      // markdown. Anything else is an unstyled wrapper worth unwrapping
      // rather than silently dropping.
      if (classList?.contains("docs-example")) return "";
      return node.childNodes.map(blockToMarkdown).filter(Boolean).join("\n\n");
    default:
      return "";
  }
}

function proseToMarkdown(prose) {
  const parts = prose.childNodes.map(blockToMarkdown).filter(Boolean);
  return `${parts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

async function main() {
  let slugs;
  try {
    slugs = (await readdir(componentsDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    console.warn("[generate-markdown] dist/components not found — skipping");
    return;
  }

  let written = 0;
  for (const slug of slugs) {
    const htmlPath = path.join(componentsDir, slug, "index.html");
    let html;
    try {
      html = await readFile(htmlPath, "utf-8");
    } catch {
      continue;
    }
    // `pre` is one of node-html-parser's default "block text" elements
    // (raw, unparsed content, like `script`/`style`) — Shiki's syntax
    // highlighting wraps each token in nested `<span>`s inside `<pre>`,
    // so the default behaviour leaves `<code>` unparsed and the actual
    // source text unreachable. Omitting `pre` from this list (not
    // setting it to `false` — the key's mere presence is what matters,
    // not its value) is what turns normal element parsing back on.
    const root = parse(html, { blockTextElements: { script: true, noscript: true, style: true } });
    const prose = root.querySelector(".docs-prose");
    if (!prose) continue;
    await writeFile(path.join(componentsDir, `${slug}.md`), proseToMarkdown(prose), "utf-8");
    written++;
  }
  console.log(`[generate-markdown] wrote ${written} markdown mirror(s) to dist/components/*.md`);
}

await main();
