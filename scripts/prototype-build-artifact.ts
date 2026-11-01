// fallow-ignore-file unused-file
// PROTOTYPE (throwaway): bundle the prototype variants plus a data sample into
// one self-contained HTML page for a Claude artifact.
// Usage: node -r esbuild-register scripts/prototype-build-artifact.ts <out.html>
import { readFileSync, writeFileSync } from 'node:fs';
import tailwind from '@tailwindcss/postcss';
import { build } from 'esbuild';
import postcss from 'postcss';

const out = process.argv[2];
const SAMPLE_SIZE = 15;
const ALWAYS = [1289]; // UZ abdomna, the page opens on it

async function main() {
  const snapshot = JSON.parse(
    readFileSync('public/prototype/snapshot.json', 'utf8')
  ) as { rows: number[][] };
  // Sample: procedures offered by the most institutions.
  const count = new Map<number, number>();
  for (const r of snapshot.rows) count.set(r[0], (count.get(r[0]) ?? 0) + 1);
  const top = [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([i]) => i)
    .filter((i) => !ALWAYS.includes(i));
  const picks = [...ALWAYS, ...top].slice(0, SAMPLE_SIZE);
  const history: Record<string, unknown> = {};
  for (const i of picks) {
    history[i] = JSON.parse(
      readFileSync(`public/prototype/history/${i}.json`, 'utf8')
    );
  }
  const data = JSON.stringify({ snapshot, history });

  const js = await build({
    entryPoints: ['src/components/prototype/artifact-entry.tsx'],
    bundle: true,
    minify: true,
    format: 'iife',
    write: false,
    jsx: 'automatic',
    target: 'es2022',
    alias: {
      'next/navigation': './src/components/prototype/artifact-shims.tsx',
      'next/dynamic': './src/components/prototype/artifact-shims.tsx',
    },
    define: { 'process.env.NODE_ENV': '"production"' },
  });

  const globals = readFileSync('src/app/globals.css', 'utf8');
  const css = (
    await postcss([tailwind()]).process(globals, {
      from: 'src/app/globals.css',
    })
  ).css;

  const html = `<title>Čakalne dobe prototipi</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap">
<style>
${css}
:root { --font-sans: 'Geist', ui-sans-serif, system-ui, sans-serif; }
body { background: var(--background); color: var(--foreground); font-family: var(--font-sans); }
</style>
<div id="root"></div>
<script>window.__PROTO__ = ${data.replaceAll('</', '<\\/')};</script>
<script>${js.outputFiles[0].text.replaceAll('</script', '<\\/script')}</script>
`;
  writeFileSync(out, html);
  process.stdout.write(
    `wrote ${out}: ${(html.length / 1024 / 1024).toFixed(2)} MB, history for ${picks.length} procedures\n`
  );
}
main();
