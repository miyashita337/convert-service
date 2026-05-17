#!/usr/bin/env bash
# Measure the warm-path latency of the SessionStart hook described in
# docs/articles/003-claude-code-web-setup-hook.md.
#
# Methodology (matches tools/seo-pipeline/benchmark.mjs):
#   - Synthesize a stub `agent-base` directory containing the 4 child dirs
#     (commands/skills/agents/hooks) + CLAUDE.md so the symlink loop has work.
#   - Pre-create real directories at the symlink destinations so the
#     "real-dir backup" branch (mv to .bak) is exercised — this is the worst
#     case the production hook hits on first session start of an existing
#     ~/.claude/ layout.
#   - Run 6 trials, discard the first as warm-up, median of the remaining 5.
#
# Output: a single line containing the median ms.
# Usage: bash tools/seo-pipeline/measure-sessionstart-hook.sh

set -euo pipefail

if ! command -v python3 >/dev/null 2>&1; then
  echo "[error] python3 required" >&2
  exit 1
fi

one_trial() {
  local TMPHOME
  TMPHOME="$(mktemp -d)"
  local AGENT_BASE_DIR="$TMPHOME/agent-base"
  mkdir -p "$AGENT_BASE_DIR"/{commands,skills,agents,hooks}
  echo "stub" > "$AGENT_BASE_DIR/CLAUDE.md"
  mkdir -p "$TMPHOME/.claude"
  for d in commands skills agents hooks; do mkdir -p "$TMPHOME/.claude/$d"; done

  local START END HOME_BACKUP="$HOME"
  START=$(python3 -c "import time;print(int(time.perf_counter()*1000))")
  HOME="$TMPHOME"
  for dir in commands skills agents hooks; do
    src="$AGENT_BASE_DIR/$dir"
    dst="$HOME/.claude/$dir"
    if [ -d "$src" ]; then
      if [ -d "$dst" ] && [ ! -L "$dst" ]; then
        mv "$dst" "${dst}.bak.$(date +%s%N)"
      fi
      ln -sfn "$src" "$dst"
    fi
  done
  [ -f "$AGENT_BASE_DIR/CLAUDE.md" ] && ln -sf "$AGENT_BASE_DIR/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
  END=$(python3 -c "import time;print(int(time.perf_counter()*1000))")
  HOME="$HOME_BACKUP"
  echo $((END - START))
}

TIMES=()
for i in 1 2 3 4 5 6; do
  TIMES+=("$(one_trial)")
done
echo "raw trials (ms): ${TIMES[*]}" >&2
python3 - "${TIMES[@]}" <<'PY'
import statistics, sys
vals = [int(x) for x in sys.argv[1:]][1:]   # drop first as warm-up
print(int(statistics.median(vals)))
PY
