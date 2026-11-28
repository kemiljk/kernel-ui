import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { WEIGHTS } from "./score.mjs";
import { escapeHtml as e } from "./util.mjs";

export function summaryTable(results) {
  const rows = results.tasks.map((t) => ({
    task: t.id,
    score: t.error ? "error" : t.score.total,
    tsc: t.error ? "-" : t.typecheck.pass ? "pass" : `${t.typecheck.errors} err`,
    lint: t.error ? "-" : t.lint.ran ? `${t.lint.errors}E ${t.lint.warnings}W` : "n/a",
    build: t.error ? "-" : t.build.pass ? "pass" : "FAIL",
    axe: t.error || !t.inspect.axe ? "-" : `${t.inspect.axe.seriousCritical} rules`,
    asserts: t.error ? "-" : `${t.score.assertionsPassed}/${t.score.assertionsTotal}`,
    agent: t.agent ? `${Math.round(t.agent.durationMs / 1000)}s${t.agent.timedOut ? " TIMEOUT" : ""}${t.agent.costUsd != null ? ` $${t.agent.costUsd.toFixed(2)}` : ""}${t.agent.tools?.usedKernelMcp ? " mcp" : ""}` : t.mode,
  }));
  const cols = Object.keys(rows[0] ?? { task: "" });
  const width = Object.fromEntries(cols.map((c) => [c, Math.max(c.length, ...rows.map((r) => String(r[c]).length))]));
  const line = (r) => cols.map((c) => String(r[c]).padEnd(width[c])).join("  ");
  return [line(Object.fromEntries(cols.map((c) => [c, c]))), cols.map((c) => "-".repeat(width[c])).join("  "), ...rows.map(line)].join("\n");
}

const pill = (ok, text) => `<span class="pill ${ok ? "ok" : "bad"}">${e(text)}</span>`;

function taskCard(t) {
  if (t.error) return `<section class="task" id="${e(t.id)}"><h2>${e(t.title)}</h2><p class="bad">Runner error: ${e(t.error)}</p></section>`;
  const a = t.agent;
  const shots = t.inspect.screenshots
    .map((s) => (s.file ? `<figure><a href="${e(`${t.id}/${s.file}`)}"><img loading="lazy" src="${e(`${t.id}/${s.file}`)}" alt="${e(`${t.title}: ${s.name}`)}"></a><figcaption>${e(s.name)}</figcaption></figure>` : `<p class="bad">${e(s.name)}: ${e(s.error)}</p>`))
    .join("");
  const assertions = t.inspect.assertions
    .map((x) => `<tr><td>${pill(x.pass, x.pass ? "pass" : "fail")}</td><td>${e(x.description)}</td><td class="detail">${e(x.detail)}</td></tr>`)
    .join("");
  const lint = t.lint.messages?.length
    ? `<ul>${t.lint.messages.map((m) => `<li><code>${e(m.file)}:${m.line}</code> ${pill(m.severity !== "error", m.rule ?? "parse")} ${e(m.message)}</li>`).join("")}</ul>`
    : "<p>No lint messages.</p>";
  const axe = t.inspect.axe?.violations.length
    ? `<ul>${t.inspect.axe.violations.map((v) => `<li>${pill(!["serious", "critical"].includes(v.impact), v.impact)} <code>${e(v.id)}</code> (${e(v.scheme)}, ${v.nodes} node${v.nodes === 1 ? "" : "s"}): ${e(v.help)}</li>`).join("")}</ul>`
    : t.inspect.axe ? "<p>No axe violations.</p>" : "<p>Not run (build failed).</p>";
  const agent = a
    ? `<dl class="agent">
        <dt>Time</dt><dd>${Math.round(a.durationMs / 1000)}s${a.timedOut ? " (timed out)" : ""}, exit ${a.exitCode}</dd>
        ${a.costUsd != null ? `<dt>Cost</dt><dd>$${a.costUsd.toFixed(3)}, ${a.turns} turns</dd>` : ""}
        ${a.costUsd == null && a.usage ? `<dt>Tokens</dt><dd>${e(Object.entries(a.usage).map(([k, v]) => `${k} ${v}`).join(", "))}</dd>` : ""}
        <dt>Kernel MCP</dt><dd>${a.tools.usedKernelMcp ? e(JSON.stringify(a.tools.kernelMcp)) : "not used"}${a.tools.failed ? ` (${a.tools.failed} failed call${a.tools.failed === 1 ? "" : "s"})` : ""}</dd>
        <dt>Signals</dt><dd>${["usedSkill", "readLlmsTxt", "readTypes", "ranKernelCheck", "ranLint", "ranTypecheck"].map((k) => pill(a.tools[k], k)).join(" ")}</dd>
        <dt>Tools</dt><dd><code>${e(JSON.stringify(a.tools.byName))}</code></dd>
      </dl>`
    : `<p>Mode: ${e(t.mode)} (no agent)</p>`;
  const b = t.score.breakdown;
  return `<section class="task" id="${e(t.id)}">
    <header><h2>${e(t.title)} <small>${e(t.id)} · ${e(t.package)}</small></h2><p class="score">${t.score.total}<small>/100</small></p></header>
    <p class="breakdown">Hygiene ${Object.entries(t.score.hygiene).map(([k, v]) => `${k} <b>${v}</b>/${WEIGHTS[k]}`).join(" · ")}, scaled by ${Math.round(t.score.assertionRate * 100)}% assertions passed → ${Math.round((t.score.total - b.assertions) * 10) / 10} · assertions <b>${b.assertions}</b>/${WEIGHTS.assertions}</p>
    <div class="shots">${shots || "<p>No screenshot (build failed).</p>"}</div>
    <details open><summary>Assertions (${t.score.assertionsPassed}/${t.score.assertionsTotal})</summary><table>${assertions}</table></details>
    <details ${t.lint.errors ? "open" : ""}><summary>Lint (${t.lint.errors} errors, ${t.lint.warnings} warnings)</summary>${lint}</details>
    <details ${t.inspect.axe?.seriousCritical ? "open" : ""}><summary>axe (${t.inspect.axe ? `${t.inspect.axe.seriousCritical} serious/critical rules` : "not run"})</summary>${axe}</details>
    <details ${t.typecheck.pass ? "" : "open"}><summary>TypeScript (${t.typecheck.pass ? "pass" : `${t.typecheck.errors} errors`})</summary><pre>${e(t.typecheck.output || "ok")}</pre></details>
    ${t.build.pass ? "" : `<details open><summary>Build failed</summary><pre>${e(t.build.output)}</pre></details>`}
    <details><summary>Agent</summary>${agent}</details>
    <p class="files">Output files: <a href="${e(`${t.id}/output/`)}">${e(`${t.id}/output/`)}</a></p>
  </section>`;
}

export function writeReport(results, outDir) {
  writeFileSync(join(outDir, "results.json"), `${JSON.stringify(results, null, 2)}\n`);
  const mean = results.summary.meanScore;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kernel evals ${e(results.runId)}</title>
<style>
:root { color-scheme: light dark; --bg: #fafafa; --fg: #1a1a1a; --muted: #5f5f5f; --card: #fff; --line: #e2e2e2; --ok: #1b7a3a; --bad: #b42318; }
@media (prefers-color-scheme: dark) { :root { --bg: #111; --fg: #ededed; --muted: #a8a8a8; --card: #1b1b1b; --line: #333; --ok: #5fd38a; --bad: #ff8a80; } }
body { margin: 0; padding: 24px 16px 64px; font: 15px/1.5 system-ui, sans-serif; background: var(--bg); color: var(--fg); }
main { max-width: 1100px; margin: 0 auto; }
h1 { margin: 0 0 4px; } .meta { color: var(--muted); margin: 0 0 24px; }
table { border-collapse: collapse; width: 100%; } th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
.summary { overflow-x: auto; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 8px; margin-bottom: 32px; }
.task { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; }
.task header { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; }
.task h2 { margin: 0; font-size: 1.2rem; } .task h2 small { color: var(--muted); font-weight: 400; font-size: .85rem; }
.score { font-size: 2rem; font-weight: 700; margin: 0; } .score small { font-size: 1rem; color: var(--muted); }
.breakdown, .files { color: var(--muted); }
.shots { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin: 12px 0; }
.shots img { width: 100%; max-height: 360px; object-fit: cover; object-position: top; border: 1px solid var(--line); border-radius: 8px; }
figure { margin: 0; } figcaption { color: var(--muted); font-size: .85rem; }
.pill { display: inline-block; padding: 0 8px; border-radius: 999px; font-size: .8rem; border: 1px solid currentColor; }
.ok { color: var(--ok); } .bad { color: var(--bad); }
.detail { color: var(--muted); font-size: .85rem; word-break: break-word; }
summary { cursor: pointer; font-weight: 600; margin: 8px 0; user-select: none; }
pre { white-space: pre-wrap; font-size: .8rem; background: var(--bg); padding: 8px; border-radius: 6px; }
dl.agent { display: grid; grid-template-columns: max-content 1fr; gap: 4px 12px; } dt { color: var(--muted); } dd { margin: 0; word-break: break-word; }
a { color: inherit; }
</style></head><body><main>
<h1>Kernel evals</h1>
<p class="meta">${e(results.runId)} · ${e(results.mode)}${results.agentCommand ? ` · <code>${e(results.agentCommand)}</code>` : ""} · setup: ${e(results.setup)} · commit ${e(results.git?.sha ?? "?")} · mean score <b>${mean}</b>/100</p>
<div class="summary"><table><thead><tr><th scope="col">Task</th><th scope="col">Score</th><th scope="col">tsc</th><th scope="col">Lint</th><th scope="col">Build</th><th scope="col">axe</th><th scope="col">Assertions</th><th scope="col">Agent</th></tr></thead><tbody>
${results.tasks
  .map((t) =>
    t.error
      ? `<tr><td><a href="#${e(t.id)}">${e(t.id)}</a></td><td colspan="7" class="bad">error</td></tr>`
      : `<tr><td><a href="#${e(t.id)}">${e(t.id)}</a></td><td><b>${t.score.total}</b></td><td>${pill(t.typecheck.pass, t.typecheck.pass ? "pass" : "fail")}</td><td>${t.lint.errors}E ${t.lint.warnings}W</td><td>${pill(t.build.pass, t.build.pass ? "pass" : "fail")}</td><td>${t.inspect.axe ? t.inspect.axe.seriousCritical : "-"}</td><td>${t.score.assertionsPassed}/${t.score.assertionsTotal}</td><td>${t.agent ? `${Math.round(t.agent.durationMs / 1000)}s${t.agent.costUsd != null ? ` · $${t.agent.costUsd.toFixed(2)}` : ""}${t.agent.tools.usedKernelMcp ? " · MCP" : ""}` : e(t.mode)}</td></tr>`,
  )
  .join("\n")}
</tbody></table></div>
${results.tasks.map(taskCard).join("\n")}
</main></body></html>
`;
  writeFileSync(join(outDir, "index.html"), html);
}
