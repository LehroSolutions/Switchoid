/**
 * Renders the project's Markdown into a browsable docs site.
 *
 * Run with:  bun run docs:build
 *
 * Every `.md` file in docs/ (plus the root brief) is converted to HTML with
 * `marked`, styled with a small self-contained stylesheet that honours the app
 * palette and `prefers-color-scheme` / `prefers-reduced-motion`. A machine-
 * readable `docs.json` manifest is emitted alongside for future indexing.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { basename, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const docsDir = join(root, 'docs')
const outDir = join(root, 'site')

/** Recursively collect markdown files, skipping hidden/build directories. */
function collect(dir) {
  const found = []
  let entries = []
  try {
    entries = readdirSync(dir)
  } catch {
    return found
  }
  for (const name of entries.sort()) {
    if (name.startsWith('.') || name === 'node_modules' || name === 'site') continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) found.push(...collect(full))
    else if (extname(name).toLowerCase() === '.md') found.push(full)
  }
  return found
}

const sources = collect(docsDir)
const rootBrief = join(root, 'Switchoid.md')
if (statSync(rootBrief).isFile()) sources.unshift(rootBrief)

if (!sources.length) {
  console.error('No markdown found. Add docs/*.md or a root brief, then re-run.')
  process.exit(1)
}

const STYLE = `
:root {
  color-scheme: dark;
  --bg: #0b0b10; --surface: #14141c; --text: #e8e8f0; --muted: #9a9ab0;
  --border: #262633; --accent: #7c6cf0; --teal: #2dd4bf;
}
@media (prefers-color-scheme: light) {
  :root { color-scheme: light; --bg: #f6f5fb; --surface: #fff; --text: #16161d;
    --muted: #5c5c72; --border: #e2e1ec; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); line-height: 1.65;
  font: 15px/1.65 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.wrap { max-width: 820px; margin: 0 auto; padding: 48px 24px 96px; }
nav { margin-bottom: 32px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
nav a { color: var(--teal); text-decoration: none; margin-right: 16px; font-size: 13px; }
nav a:hover { text-decoration: underline; }
h1, h2, h3 { line-height: 1.25; letter-spacing: -0.015em; }
h1 { font-size: 30px; }
a { color: var(--accent); }
code { background: var(--surface); border: 1px solid var(--border); border-radius: 5px;
  padding: 1px 6px; font-size: 13px; font-family: ui-monospace, "Cascadia Code", monospace; }
pre { background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
  padding: 16px; overflow-x: auto; }
pre code { background: none; border: 0; padding: 0; }
table { border-collapse: collapse; width: 100%; margin: 20px 0; }
th, td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; font-size: 14px; }
th { background: var(--surface); }
blockquote { margin: 20px 0; padding: 4px 18px; border-left: 3px solid var(--accent);
  color: var(--muted); }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
`

function page({ title, body, links }) {
  const nav = links
    .map((l) => `<a href="${l.href}">${l.label}</a>`)
    .join('')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Switchoid</title>
<style>${STYLE}</style></head>
<body><div class="wrap"><nav>${nav}</nav>${body}</div></body></html>
`
}

const pages = sources.map((file) => {
  const rel = relative(root, file)
  const name = basename(file, '.md')
  return {
    file,
    rel,
    name,
    title: name === 'Switchoid' ? 'Overview' : name.replace(/[-_]/g, ' '),
    html: marked.parse(readFileSync(file, 'utf8'))
  }
})

const links = pages.map((p) => ({
  href: p.name === 'Switchoid' ? 'index.html' : `${p.name}.html`,
  label: p.title
}))

mkdirSync(outDir, { recursive: true })

for (const p of pages) {
  const href = p.name === 'Switchoid' ? 'index.html' : `${p.name}.html`
  writeFileSync(join(outDir, href), page({ title: p.title, body: p.html, links }), 'utf8')
  console.log(`  ${href}  <- ${p.rel}`)
}

writeFileSync(
  join(outDir, 'docs.json'),
  JSON.stringify(
    pages.map((p) => ({
      title: p.title,
      source: p.rel,
      href: p.name === 'Switchoid' ? 'index.html' : `${p.name}.html`
    })),
    null,
    2
  ),
  'utf8'
)

console.log(`\n${pages.length} page(s) -> ${relative(root, outDir)}`)
