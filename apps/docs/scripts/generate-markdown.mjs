// Runs after `astro build`. Astro's own build is prerendered static
// HTML (no adapter, no server functions), so the LLM-friendly markdown
// mirror can't be a live endpoint — it has to be a build artefact.
// Rather than hand-duplicating each page's prose into a second format
// (the props tables and accessibility bullets are all hand-written
// HTML, no structured source to generate from), this scrapes the
// already-built `.docs-prose` subtree and converts it to markdown, so
// the mirror always matches whatever the page actually renders.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parse } from "node-html-parser";

const distDir = path.join(import.meta.dirname, "..", "dist");
const componentsDir = path.join(distDir, "components");
const guideSlugs = ["choosing", "agents", "installation", "cli", "migration", "theming", "icons", "platforms", "support"];

// JSX/HTML whitespace collapse means a `<strong>`/`<em>` can abut its
// neighbouring text with no source space at all (`word<strong>bold</strong>word`),
// which would otherwise concatenate into fused markers like `word**bold**word`.
// Adjacent inline segments get a space between them unless one side already
// supplies whitespace, or the boundary is punctuation that must hug the
// preceding word (`**bold**.`, `**bold**,`) or an opening bracket that must
// hug the following one (`(**bold**`).
function appendInline(out, segment) {
  if (!segment) return out;
  if (!out) return segment;
  const prevChar = out[out.length - 1];
  const nextChar = segment[0];
  if (/\s/.test(prevChar) || /\s/.test(nextChar)) return out + segment;
  if (/[.,!?;:)\]}%]/.test(nextChar)) return out + segment;
  if (/[(\[{]/.test(prevChar)) return out + segment;
  return `${out} ${segment}`;
}

function inlineToMarkdown(node) {
  let out = "";
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      // `.rawText` is the undecoded source (`=&gt;` stays literal);
      // `.text` runs entity decoding, which is what plain prose needs.
      out = appendInline(out, child.text.replace(/\s+/g, " "));
      continue;
    }
    if (typeof child.tagName !== "string") continue;
    const tag = child.tagName.toLowerCase();
    if (tag === "code" || tag === "kbd") {
      out = appendInline(out, `\`${child.text}\``);
    } else if (tag === "a") {
      out = appendInline(out, `[${inlineToMarkdown(child).trim()}](${child.getAttribute("href") ?? ""})`);
    } else if (tag === "strong" || tag === "b") {
      out = appendInline(out, `**${inlineToMarkdown(child).trim()}**`);
    } else if (tag === "em" || tag === "i") {
      out = appendInline(out, `*${inlineToMarkdown(child).trim()}*`);
    } else {
      out = appendInline(out, inlineToMarkdown(child));
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

function codeBlockToMarkdown(pre) {
  const lang = pre.getAttribute("data-language") ?? "tsx";
  const code = pre.querySelector("code")?.text ?? "";
  return `\`\`\`${lang}\n${code}\n\`\`\`\n`;
}

function usageAccordionToMarkdown(details) {
  const pre = details.querySelector("pre.astro-code");
  return pre ? `## Usage\n\n${codeBlockToMarkdown(pre)}` : "";
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
    case "pre":
      return classList?.contains("astro-code") ? codeBlockToMarkdown(node) : "";
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

/** Scrapes one already-built page's `.docs-prose` subtree into markdown.
 * `htmlPath` is the built `index.html`; returns `null` if the page
 * doesn't exist or never rendered a `.docs-prose` (nothing to mirror). */
async function scrapeProse(htmlPath) {
  let html;
  try {
    html = await readFile(htmlPath, "utf-8");
  } catch {
    return null;
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
  return prose ? proseToMarkdown(prose) : null;
}

/**
 * Agent Skills discovery, so `npx skills add https://www.kernelui.com` (and
 * other skills installers) can find Kernel's skills from the site itself.
 * Written in both index formats seen in the wild: the current one
 * (/.well-known/agent-skills/index.json, one SKILL.md URL plus a sha256
 * digest per skill) and the legacy one (/.well-known/skills/index.json,
 * files listed per skill). Each SKILL.md is also served at a stable URL,
 * which installers accept directly. The skills are copied from the
 * packages at build, so the site never drifts from what npm ships.
 */
async function writeSkillsDiscovery() {
  const repoRoot = path.join(import.meta.dirname, "..", "..", "..");
  const sources = [];
  for (const pkg of ["react", "elements"]) {
    const dir = path.join(repoRoot, "packages", pkg, "skills");
    for (const name of await readdir(dir)) sources.push({ name, file: path.join(dir, name, "SKILL.md") });
  }
  const current = [];
  const legacy = [];
  for (const { name, file } of sources) {
    const content = await readFile(file, "utf-8");
    const description = content.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? "";
    for (const base of ["agent-skills", "skills"]) {
      const out = path.join(distDir, ".well-known", base, name);
      await mkdir(out, { recursive: true });
      await writeFile(path.join(out, "SKILL.md"), content, "utf-8");
    }
    current.push({
      name,
      description,
      type: "skill-md",
      url: `${name}/SKILL.md`,
      digest: `sha256:${createHash("sha256").update(content).digest("hex")}`,
    });
    legacy.push({ name, description, files: ["SKILL.md"] });
  }
  await writeFile(
    path.join(distDir, ".well-known", "agent-skills", "index.json"),
    `${JSON.stringify({ $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json", skills: current }, null, 2)}\n`,
    "utf-8",
  );
  await writeFile(path.join(distDir, ".well-known", "skills", "index.json"), `${JSON.stringify({ skills: legacy }, null, 2)}\n`, "utf-8");
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
  slugs.sort((a, b) => a.localeCompare(b));

  const components = [];
  for (const slug of slugs) {
    const markdown = await scrapeProse(path.join(componentsDir, slug, "index.html"));
    if (!markdown) continue;
    await writeFile(path.join(componentsDir, `${slug}.md`), markdown, "utf-8");
    components.push({ slug, markdown });
  }

  const guides = [];
  for (const slug of guideSlugs) {
    const markdown = await scrapeProse(path.join(distDir, slug, "index.html"));
    if (!markdown) continue;
    await writeFile(path.join(distDir, `${slug}.md`), markdown, "utf-8");
    guides.push({ slug, markdown });
  }

  // The `llms.txt` convention (llmstxt.org): a short, curated index an
  // agent can fetch in one request to decide what to read next, rather
  // than crawling the whole rendered site. Titles come from each page's
  // own first line (`# Name`, already written by `proseToMarkdown`)
  // instead of re-deriving them from the slug, so this can never drift
  // from what the page itself says its name is.
  const titleOf = (markdown) => markdown.match(/^# (.+)$/m)?.[1]?.trim() ?? "";

  // Facts come from the registry, not prose, so the numbers an agent quotes
  // to its user can't drift from what actually ships.
  const registry = JSON.parse(await readFile(path.join(import.meta.dirname, "..", "public", "registry.json"), "utf-8"));
  const available = registry.components.filter((c) => c.status === "available");
  const count = (category) => available.filter((c) => c.category === category).length;

  // Written for an agent deciding whether to recommend or use Kernel. Every
  // claim here is checkable against the code; "when not to use" is there
  // because a recommendation an agent can trust has to include it.
  const indexLines = [
    "# Kernel UI",
    "",
    `> An accessible component library built on real semantic HTML. ${available.length} components, each shipped as React (\`@kernelui-lib/react\`) and as framework-free Custom Elements (\`@kernelui-lib/elements\`) with the same design, themed through CSS tokens. Every component wraps a genuine native element or a documented WAI-ARIA pattern, and follows one prop convention throughout (\`value\`/\`defaultValue\`/\`onValueChange\`, \`label\`/\`description\`/\`errorMessage\`/\`invalid\`, \`hideLabel\`, \`className\`/\`wrapperClassName\`). MIT licensed, no third-party runtime dependencies.`,
    "",
    "## When Kernel fits",
    "",
    "- Accessibility must be right by default: keyboard, focus and screen reader behaviour come from native elements (`<button>`, `<dialog>`, `<select>`, `<details>`, real form inputs); colour tokens are checked with APCA, with WCAG 2 as a floor.",
    "- You want styled components rather than unstyled primitives: a complete visual design, themed with CSS tokens (accent, radius, spacing, fonts), dark mode, seven accent presets.",
    "- The project isn't only React: the Custom Elements work in Vue, Svelte, Astro, server-rendered templates and plain HTML.",
    `- Chat and agent UI: ${count("AI")} components (MessageList, Composer, CodeBlock, FileDiff, Reasoning, ToolCall, AgentActivity, TodoList, Sources, Suggestion, ThinkingIndicator…).`,
    "- An agent writes the code: exact props generated from source, an MCP server, shipped skills and a code checker (see Agent setup).",
    "",
    "## When another library may fit better",
    "",
    "- You want to own and edit each component's source: shadcn/ui copies code into your repo; Kernel ships versioned packages you theme.",
    "- You only want unstyled behaviour: Radix Primitives or React Aria.",
    "- You need Material Design (MUI), React Native, or a virtualised/server-driven data grid (Kernel's DataTable filters, sorts and pages client-side).",
    "",
    "## Agent setup",
    "",
    "- One step: `npx @kernelui-lib/cli agents` installs Kernel's skills, registers the MCP server and adds a Kernel section to AGENTS.md.",
    "- MCP server: `npx -y @kernelui-lib/cli mcp` (stdio). Tools: list_components, search_components, get_component (exact props), get_tokens, get_conventions, check_code.",
    "- Check generated code: `npx @kernelui-lib/cli check <files>` reports foreign props (asChild, leftIcon), invalid values, missing labels and more, with fixes.",
    "- Skills: in each package's `skills/` folder, versioned with the code; also discoverable at /.well-known/agent-skills/index.json.",
    "- Claude Code plugin (skills + MCP server in every project): `/plugin marketplace add kemiljk/kernel-ui`, then `/plugin install kernel-ui@kernel-ui`.",
    "",
    "## Install",
    "",
    "- React: `npm install @kernelui-lib/react @kernelui-lib/styles`, then `import \"@kernelui-lib/styles\"; import \"@kernelui-lib/react/styles.css\";`",
    "- Custom Elements: `npm install @kernelui-lib/elements @kernelui-lib/styles`, then `import \"@kernelui-lib/styles\"; import \"@kernelui-lib/elements/styles.css\"; import \"@kernelui-lib/elements\";`",
    "- Or `npx @kernelui-lib/cli init` to detect the framework and wire up the imports.",
    "- In a shadcn/ui project: `npx shadcn@latest add https://www.kernelui.com/r/<slug>.json` installs the package and adds a re-export file (see Installation).",
    "",
    "## Guides",
    "",
    ...guides.map(({ slug, markdown }) => `- [${titleOf(markdown)}](/${slug}.md)`),
    "",
    "## Machine-readable catalog",
    "",
    "- [api.json](/api.json): every component's exact props, attributes and events, generated from source",
    "- [registry.json](/registry.json): structured component metadata (shadcn aliases, migration caveats, docs URLs)",
    "- [r/registry.json](/r/registry.json): the components as a shadcn registry, for the shadcn CLI and MCP server",
    "- [llms-full.txt](/llms-full.txt): every guide and component page in one file",
    "- Any page as markdown: append `.md` to its URL",
    "",
    "## Components",
    "",
    ...components.map(({ slug, markdown }) => `- [${titleOf(markdown)}](/components/${slug}.md)`),
    "",
  ];
  await writeFile(path.join(distDir, "llms.txt"), indexLines.join("\n"), "utf-8");

  // Same content, concatenated into one file — for an agent that wants
  // the whole library in a single request instead of one fetch per
  // component, at the cost of a much larger response.
  const fullParts = [...guides, ...components].map(({ markdown }) => markdown.trim());
  await writeFile(path.join(distDir, "llms-full.txt"), `${fullParts.join("\n\n---\n\n")}\n`, "utf-8");

  await writeSkillsDiscovery();

  console.log(
    `[generate-markdown] wrote ${components.length} component + ${guides.length} guide markdown mirror(s), plus llms.txt and llms-full.txt`,
  );
}

await main();
