#!/usr/bin/env node
// Check the actual consumer archive so site assets cannot leak into npm releases.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = mkdtempSync(join(tmpdir(), 'kernel-styles-package-'));
try {
  const [pack] = JSON.parse(execFileSync('npm', [
    'pack', '--json', '--ignore-scripts', '--pack-destination', output,
    '--cache', join(output, 'npm-cache'),
  ], { cwd: join(root, 'packages/styles'), encoding: 'utf8' }));
  const archive = join(output, pack.filename);
  execFileSync('tar', ['-xzf', archive, '-C', output]);
  const files = pack.files.map(file => file.path);
  assert(!files.some(path => /\.(woff2?|ttf|otf|eot)$/i.test(path)), 'Published styles must not contain font binaries');
  for (const path of files.filter(path => path.endsWith('.css'))) {
    const css = readFileSync(join(output, 'package', path), 'utf8');
    assert(!/@font-face\b|\bKK (?:Sans|Mono|Serif)\b|data:font\//i.test(css), `Font declaration leaked into ${path}`);
  }
  const tokens = readFileSync(join(output, 'package/src/tokens.css'), 'utf8');
  assert.match(tokens, /--kernel-font-sans:\s*system-ui[,;]/);
  assert.match(tokens, /--kernel-font-mono:\s*ui-monospace[,;]/);
  const pkg = JSON.parse(readFileSync(join(output, 'package/package.json'), 'utf8'));
  assert(!pkg.exports['./fonts/*'], 'Font binaries must not be exported');
  for (const target of Object.values(pkg.exports)) {
    if (!target.includes('*')) assert(files.includes(target.replace(/^\.\//, '')), `Missing export: ${target}`);
  }
  assert(files.includes('src/themes/index.css'), 'Named themes must remain available');
  console.log(`Styles archive checked: ${files.length} files, system font defaults, no bundled fonts.`);
} finally {
  rmSync(output, { recursive: true, force: true });
}
