#!/usr/bin/env node
/**
 * Renders 2 illustrative PNGs for docs/articles/003-claude-code-web-setup-hook.md.
 *
 * Article 003 is a debugging story about Claude Code on the Web's setup script
 * vs SessionStart hook — no QuickConv UI screenshots make sense. Instead we
 * render two diagrams from SVG:
 *   1) timing-comparison.png — shows when env vars become available
 *   2) ls-claude-after.png   — terminal-output style listing of ~/.claude/ symlinks
 *
 * Reads sharp from apps/converter (workspace dependency).
 */
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const CONVERTER_DIR = join(REPO_ROOT, "apps", "converter");
const OUT_DIR = join(REPO_ROOT, "docs", "articles", "images", "003-claude-code-web-setup-hook");
// Ensure the output directory exists; running this script from a clean checkout
// where `docs/articles/images/003-.../` has not been created yet would otherwise
// fail with ENOENT on the first toFile() call.
mkdirSync(OUT_DIR, { recursive: true });

const requireFromConverter = createRequire(join(CONVERTER_DIR, "package.json"));
const sharpEntryPath = requireFromConverter.resolve("sharp");
const { default: sharp } = await import(pathToFileURL(sharpEntryPath).href);

// --- Diagram 1: timing comparison ----------------------------------------
const timingSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
  <rect width="1200" height="700" fill="#0d1117"/>
  <text x="600" y="55" fill="#c9d1d9" font-family="-apple-system, system-ui, sans-serif" font-size="32" font-weight="700" text-anchor="middle">Claude Code on the Web: when do .env vars become available?</text>

  <!-- Setup script row -->
  <text x="60" y="160" fill="#f85149" font-family="system-ui" font-size="22" font-weight="600">setup script (runs once on snapshot creation)</text>
  <rect x="60" y="180" width="1080" height="80" rx="8" fill="#161b22" stroke="#30363d" stroke-width="2"/>
  <text x="100" y="215" fill="#8b949e" font-family="ui-monospace, Menlo, Monaco, monospace" font-size="18">echo "$GH_TOKEN"</text>
  <text x="100" y="245" fill="#f85149" font-family="ui-monospace, Menlo, Monaco, monospace" font-size="18">→ empty string. .env panel vars do NOT reach here.</text>

  <!-- Arrow -->
  <line x1="600" y1="290" x2="600" y2="350" stroke="#8b949e" stroke-width="2" stroke-dasharray="6 4"/>
  <polygon points="595,348 600,358 605,348" fill="#8b949e"/>

  <!-- SessionStart hook row -->
  <text x="60" y="400" fill="#3fb950" font-family="system-ui" font-size="22" font-weight="600">SessionStart hook (runs every session start, after env is ready)</text>
  <rect x="60" y="420" width="1080" height="80" rx="8" fill="#161b22" stroke="#30363d" stroke-width="2"/>
  <text x="100" y="455" fill="#8b949e" font-family="ui-monospace, Menlo, Monaco, monospace" font-size="18">echo "$GH_TOKEN"</text>
  <text x="100" y="485" fill="#3fb950" font-family="ui-monospace, Menlo, Monaco, monospace" font-size="18">→ ghp_xxxxx (90 chars). .env panel vars ARE available.</text>

  <!-- Conclusion -->
  <rect x="60" y="555" width="1080" height="90" rx="8" fill="#0d2f1c" stroke="#3fb950" stroke-width="2"/>
  <text x="100" y="590" fill="#3fb950" font-family="system-ui" font-size="20" font-weight="600">Fix</text>
  <text x="100" y="618" fill="#c9d1d9" font-family="system-ui" font-size="18">Move git-clone + symlink setup OUT of the setup script and INTO a SessionStart hook.</text>
</svg>`;

await sharp(Buffer.from(timingSvg))
  .png()
  .toFile(join(OUT_DIR, "01-timing-comparison.png"));
console.error("wrote 01-timing-comparison.png");

// --- Diagram 2: terminal listing -----------------------------------------
const lsSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="560" viewBox="0 0 1200 560">
  <rect width="1200" height="560" fill="#0d1117"/>
  <!-- Title bar -->
  <rect x="0" y="0" width="1200" height="40" fill="#161b22"/>
  <circle cx="22" cy="20" r="7" fill="#ff5f56"/>
  <circle cx="46" cy="20" r="7" fill="#ffbd2e"/>
  <circle cx="70" cy="20" r="7" fill="#27c93f"/>
  <text x="600" y="27" fill="#8b949e" font-family="system-ui" font-size="14" text-anchor="middle">~ — claude-code-on-web</text>

  <!-- Prompt + command -->
  <text x="30" y="95" fill="#3fb950" font-family="ui-monospace, Menlo, Monaco, monospace" font-size="18">user@cloud-sandbox</text>
  <text x="230" y="95" fill="#c9d1d9" font-family="ui-monospace, Menlo, Monaco, monospace" font-size="18">:</text>
  <text x="240" y="95" fill="#58a6ff" font-family="ui-monospace, Menlo, Monaco, monospace" font-size="18">~/.claude</text>
  <text x="345" y="95" fill="#c9d1d9" font-family="ui-monospace, Menlo, Monaco, monospace" font-size="18">$ ls -la</text>

  <!-- Output -->
  <g font-family="ui-monospace, Menlo, Monaco, monospace" font-size="17" fill="#c9d1d9">
    <text x="30" y="135">total 12</text>
    <text x="30" y="160">drwxr-xr-x 6 user user  192 May 17 13:35 .</text>
    <text x="30" y="185">drwxr-xr-x 8 user user  256 May 17 13:35 ..</text>
    <text x="30" y="210"><tspan fill="#58a6ff">lrwxrwxrwx</tspan> 1 user user   45 May 17 13:35 <tspan fill="#58a6ff" font-weight="600">CLAUDE.md</tspan> -&gt; <tspan fill="#a5d6ff">/home/user/agent-base/CLAUDE.md</tspan></text>
    <text x="30" y="235"><tspan fill="#58a6ff">lrwxrwxrwx</tspan> 1 user user   42 May 17 13:35 <tspan fill="#58a6ff" font-weight="600">agents</tspan>     -&gt; <tspan fill="#a5d6ff">/home/user/agent-base/agents</tspan></text>
    <text x="30" y="260"><tspan fill="#58a6ff">lrwxrwxrwx</tspan> 1 user user   44 May 17 13:35 <tspan fill="#58a6ff" font-weight="600">commands</tspan>   -&gt; <tspan fill="#a5d6ff">/home/user/agent-base/commands</tspan></text>
    <text x="30" y="285"><tspan fill="#58a6ff">lrwxrwxrwx</tspan> 1 user user   41 May 17 13:35 <tspan fill="#58a6ff" font-weight="600">hooks</tspan>      -&gt; <tspan fill="#a5d6ff">/home/user/agent-base/hooks</tspan></text>
    <text x="30" y="310"><tspan fill="#58a6ff">lrwxrwxrwx</tspan> 1 user user   42 May 17 13:35 <tspan fill="#58a6ff" font-weight="600">skills</tspan>     -&gt; <tspan fill="#a5d6ff">/home/user/agent-base/skills</tspan></text>
  </g>

  <!-- Caption -->
  <text x="30" y="380" fill="#3fb950" font-family="system-ui" font-size="20" font-weight="600">After the SessionStart hook runs:</text>
  <text x="30" y="415" fill="#c9d1d9" font-family="system-ui" font-size="17">~/.claude/ is fully populated with symlinks into the cloned agent-base repo.</text>
  <text x="30" y="445" fill="#c9d1d9" font-family="system-ui" font-size="17">Typing &quot;/&quot; in a new session lists all custom slash commands (/capture, /pdca, /inv, ...).</text>
  <text x="30" y="495" fill="#8b949e" font-family="system-ui" font-size="15" font-style="italic">Warm-path setup latency: ~61ms (measured on a local Mac; see article body).</text>
</svg>`;

await sharp(Buffer.from(lsSvg))
  .png()
  .toFile(join(OUT_DIR, "02-ls-claude-after.png"));
console.error("wrote 02-ls-claude-after.png");
