---
title: "Claude Code on the Web: Why Your .env Vars Don't Reach the Setup Script (and How SessionStart Hook Fixes It)"
description: "A debugging story about Claude Code Cloud Sandbox: the .env panel vars never make it into the setup script, only into the session shell. Moving clone logic to a SessionStart hook makes everything work."
tags: ["anthropic", "claude", "devops", "bash"]
canonical_url: ""
cover_image: "https://storage.googleapis.com/zenn-user-upload/35c9731d164a-20260419.png"
published: true
published_at: "2026-04-19"
platforms:
  hashnode: ""
  devto: ""
  zenn: "https://zenn.dev/harieshokunin/articles/b1064354319ce2"
  qiita: ""
---

![Claude Code on the web setup hook](https://storage.googleapis.com/zenn-user-upload/35c9731d164a-20260419.png)

## TL;DR

- Environment variables you put in the `.env` panel of Claude Code on the web (Cloud Sandbox) **do not reach the setup script**.
- They only reach the **shell inside the running Claude Code session**.
- So `git clone "https://x-access-token:${GH_TOKEN}@..."` inside the setup script fails — `GH_TOKEN` is empty at that point.
- **Move the clone into a SessionStart hook** and it just works, because by then `$GH_TOKEN` is populated.

This is a write-up of how I narrowed down a behavior that the official docs don't spell out clearly.

## Background

### What I wanted to do

I've been collecting custom slash commands, skills, and a personal `CLAUDE.md` under `~/.claude/` locally. I wanted the same setup available inside Claude Code on the web. Everything is stored in a private repo called `miyashita337/agent-base`.

According to the docs, cloud sessions do **not** carry over user-level settings like `~/.claude/CLAUDE.md` — only what's committed to the repo is available. So my plan was: on session start, clone `agent-base` and symlink its contents into `~/.claude/`.

### First attempt (failed)

I put a GitHub PAT into the `.env` panel of the Cloud Sandbox settings and tried to clone from the setup script.

```bash
# setup script
#!/bin/bash
set -e
git clone "https://x-access-token:${GH_TOKEN}@github.com/miyashita337/agent-base.git" "$HOME/agent-base"
```

`.env` panel:

```
GH_TOKEN=github_pat_...   # ~90 chars, real value
GIT_AUTHOR_NAME=miyashita337
...
```

Result: **`fatal: could not read Username`**.

## Narrowing it down

### Symptom 1: my `echo` output never showed up

For debugging I added `echo "GH_TOKEN length: ${#GH_TOKEN}"` in the setup script. But the setup-script UI only shows the last few lines of output, so anything mid-script gets silently dropped.

### Workaround: dump everything to a log file

I rewrote the script to redirect diagnostics into `/tmp/env-diag.log` and then `cat` it from inside the session.

```bash
#!/bin/bash
set -e

LOG=/tmp/env-diag.log

{
  echo "===== ENV DIAGNOSTICS ====="
  echo "GH_TOKEN length: ${#GH_TOKEN}"
  echo "GIT_AUTHOR_NAME: [${GIT_AUTHOR_NAME}]"
  echo "TZ: [${TZ}]"
  echo "LANG: [${LANG}]"
  echo ""
  echo "--- All env vars (names only) ---"
  env | cut -d= -f1 | sort
} | tee "$LOG"
```

Then I started a new session and asked Claude Code to `cat /tmp/env-diag.log`.

### Symptom 2: the cache trap

On some runs I didn't even see the "setup script executed" log line. Per the docs, the setup script **runs only on first creation** — after that, a filesystem snapshot is reused. Editing the `.env` panel alone does **not** invalidate the snapshot.

What does invalidate it:

- Changing the setup script body
- Changing the allowed-domains list
- ~7 days of age

So I added a throwaway comment line like `# cache-bust 2026-04-19-01` at the top of the setup script. Semantically it's a no-op, but it's enough to force a rerun on the next session.

### The result: every env var was empty

```
===== ENV DIAGNOSTICS =====
GH_TOKEN length: 0
GIT_AUTHOR_NAME: []
TZ: []
LANG: []
...
Custom vars found: 0 / expected 8
```

It wasn't just `GH_TOKEN` — **nothing from the `.env` panel was reaching the setup script**.

### The clincher: the session shell has them

Inside the running Claude Code session, I checked the same variables directly from the shell:

```bash
$ echo "GH=${#GH_TOKEN}, TZ=[$TZ], LANG=[$LANG]"
GH=93, TZ=[Asia/Tokyo], LANG=[ja_JP.UTF-8]
```

All present. So:

| When it runs | `.env` panel vars available? |
|---|---|
| Setup script | ❌ No |
| Claude Code session shell | ✅ Yes |

## Root cause and fix

### Root cause

The `.env` panel is injected **only into the Claude Code session shell**, not into the setup script. It's not a bug — it's just not documented clearly. The docs show `GH_TOKEN` as an example `.env` value, but that's aimed at the `gh` CLI picking it up inside the session, not at setup-script usage.

### Fix: move clone logic into a SessionStart hook

Drop the clone from the setup script. Put it in a SessionStart hook defined in the repo's `.claude/settings.json`. The hook runs **after** Claude Code has started, so `$GH_TOKEN` is in scope.

**`.claude/settings.json`**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/scripts/setup-agent-base.sh"
          }
        ]
      }
    ]
  }
}
```

**`scripts/setup-agent-base.sh`**

```bash
#!/bin/bash
set -e

AGENT_BASE_DIR="$HOME/agent-base"

# Skip locally
[ "$CLAUDE_CODE_REMOTE" != "true" ] && exit 0

# Clone (GH_TOKEN is available at this point)
if [ ! -d "$AGENT_BASE_DIR" ]; then
  if [ -z "${GH_TOKEN:-}" ]; then
    echo "setup-agent-base: GH_TOKEN is not set" >&2
    exit 1
  fi
  # Pass the token via extraHeader so it doesn't end up in .git/config
  git -c http.extraHeader="Authorization: Bearer ${GH_TOKEN}" \
      clone "https://github.com/miyashita337/agent-base.git" "$AGENT_BASE_DIR"
  git -C "$AGENT_BASE_DIR" config --unset-all http.extraHeader 2>/dev/null || true
fi

# Symlink into ~/.claude/ (idempotent)
mkdir -p "$HOME/.claude"
for dir in commands skills agents hooks; do
  src="$AGENT_BASE_DIR/$dir"
  dst="$HOME/.claude/$dir"
  if [ -d "$src" ]; then
    # If the destination is a real directory, back it up first
    # (ln -sf into an existing dir creates a nested symlink inside it)
    if [ -d "$dst" ] && [ ! -L "$dst" ]; then
      mv "$dst" "${dst}.bak.$(date +%s)"
    fi
    ln -sfn "$src" "$dst"
  fi
done

if [ -f "$AGENT_BASE_DIR/CLAUDE.md" ]; then
  ln -sf "$AGENT_BASE_DIR/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
fi

exit 0
```

A few deliberate choices:

1. **`CLAUDE_CODE_REMOTE` guard** — early-exit outside of cloud sessions so local dev isn't affected.
2. **Idempotent** — skip clone if the dir exists, but always refresh the symlinks. Partial-failure recovery just works.
3. **No token in the URL** — use `http.extraHeader` so `.git/config` never contains a plaintext token.
4. **`ln -sfn` not `ln -sf`** — if the destination is already a real directory, `ln -sf` nests the symlink *inside* it (e.g. `~/.claude/commands/commands`). Backing it up first and using `-n` (`--no-dereference`) forces a clean replacement.

### What about the setup script?

**Leave it empty.** You can delete the diagnostics too.

## Verification

Fresh session, `ls -la ~/.claude/`:

```
CLAUDE.md -> /home/user/agent-base/CLAUDE.md
commands  -> /home/user/agent-base/commands
skills    -> /home/user/agent-base/skills
agents    -> /home/user/agent-base/agents
hooks     -> /home/user/agent-base/hooks
```

Typing `/` shows all the custom slash commands from `agent-base` (`/capture`, `/pdca`, `/inv`, ...) and they execute without issue.

## Gotchas summary

| Gotcha | Fix |
|---|---|
| `.env` vars don't reach the setup script | Move clone into a SessionStart hook |
| Setup-script `echo` output is truncated | Redirect to a log file and `cat` it later |
| Setup script is cached and won't rerun | Add/edit a throwaway comment to bust the cache |
| New sessions can't start with an empty prompt | Type anything — but remember it becomes the first instruction to Claude |
| `ln -sf` doesn't overwrite existing directories | Back up first, then `ln -sfn` |
| `git clone https://x-access-token:${TOKEN}@...` leaks the token into `.git/config` | Pass it via `-c http.extraHeader=...` instead |

## Closing

The "setup script can't see `.env` vars" behavior is inferable if you read the docs carefully — the `gh` CLI example hints at "this is for in-session auto-pickup" — but it's never stated plainly. Easy to misread as "you can use these in the setup script too."

Hope this saves someone else the afternoon I lost.

## References

- [Use Claude Code on the web — Claude Code Docs](https://code.claude.com/docs/en/claude-code-on-the-web)
- [Hooks configuration — Claude Code Docs](https://code.claude.com/docs/en/hooks)
- Original Japanese post: https://zenn.dev/harieshokunin/articles/b1064354319ce2

![Verification screenshot](https://storage.googleapis.com/zenn-user-upload/dd6ce1e200e5-20260419.png)
