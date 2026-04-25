#!/usr/bin/env bash
# tools/team_salary の submodule pointer を origin/main の最新に進めて commit する。
# PR merge 後、convert-service 側で実行する想定。
#
# Usage:
#   bash scripts/bump-team-salary.sh [--no-commit]
#
# Options:
#   --no-commit  pointer 更新のみ、commit はしない（手動 commit したい場合）

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

if [[ ! -d tools/team_salary ]]; then
  echo "[bump-team-salary] tools/team_salary が見つかりません" >&2
  exit 1
fi

NO_COMMIT=0
if [[ "${1:-}" == "--no-commit" ]]; then
  NO_COMMIT=1
fi

OLD_SHA=$(git submodule status tools/team_salary | awk '{print $1}' | sed 's/^[+-]//')
git submodule update --remote tools/team_salary
NEW_SHA=$(cd tools/team_salary && git rev-parse HEAD)
NEW_SHORT=$(cd tools/team_salary && git rev-parse --short HEAD)

if [[ "$OLD_SHA" == "$NEW_SHA" ]]; then
  echo "[bump-team-salary] 既に最新 ($NEW_SHORT)。何もしません。"
  exit 0
fi

echo "[bump-team-salary] $OLD_SHA -> $NEW_SHA"

if [[ $NO_COMMIT -eq 1 ]]; then
  echo "[bump-team-salary] --no-commit 指定のため commit せず終了。手動で 'git add tools/team_salary && git commit' してください。"
  exit 0
fi

LATEST_MSG=$(cd tools/team_salary && git log -1 --pretty=%s)

git add tools/team_salary
git commit -m "chore: bump team_salary to ${NEW_SHORT} (${LATEST_MSG})"

echo "[bump-team-salary] commit 完了。push する場合: git push origin <branch>"
