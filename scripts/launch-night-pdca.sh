#!/usr/bin/env bash
# launch-night-pdca.sh - 夜間/朝に複数 Issue の /pdca を tmux + claude で並列/順次起動
#
# 使い方:
#   bash scripts/launch-night-pdca.sh batch-b4    # 並列 (#193, #194, #238 - docs のみ、最低リスク)
#   bash scripts/launch-night-pdca.sh batch-b1    # 並列 (#287, #286 - 小規模独立)
#   bash scripts/launch-night-pdca.sh status      # 現在動いている pdca-* tmux session 一覧
#   bash scripts/launch-night-pdca.sh attach <N>  # tmux attach -t pdca-<N>
#   bash scripts/launch-night-pdca.sh kill-all    # 全 pdca-* session を kill (注意)
#
# 設計:
#   - 各 Issue を別 tmux session (pdca-<N>) で起動
#   - claude --dangerously-skip-permissions で起動
#   - readiness polling 経由で /pdca <N> を送信 (RW-025/RW-027 対策)
#   - 起動後 detached のまま、ユーザーは attach して観察可能
#
# 前提:
#   - tmux, claude, gh コマンドが PATH にある
#   - convert-service ルートで実行 (REPO_ROOT 検出)
#   - ~/agent-base/scripts/pdca-tmux-ready.sh が存在 (readiness polling 用)

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

READY_HELPER="${HOME}/agent-base/scripts/pdca-tmux-ready.sh"
if [ ! -x "$READY_HELPER" ]; then
  echo "ERROR: readiness helper が見つかりません: $READY_HELPER" >&2
  echo "agent-base が ~/agent-base に clone されているか確認してください" >&2
  exit 2
fi

# バッチ定義 (Issue 31 件分析レポート 2026-04-27 に基づく)
# B1: 小規模・独立・低リスク
B1_ISSUES=(287 286)
# B2: ci.yml 触る系 (B1 内の workflow 修正と直列、要 Pushover secret 確認後)
B2_ISSUES=(294 296)
# B3: バグ調査 (要 /inv 先行)
B3_ISSUES=(275)
# B4: docs のみ・新規ファイル・最低リスク
B4_ISSUES=(193 194 238)

# 単一 Issue を tmux + claude + /pdca で起動
spawn_pdca() {
  local issue_num="$1"
  local session_name="pdca-${issue_num}"

  if tmux has-session -t "$session_name" 2>/dev/null; then
    echo "[SKIP] tmux session '$session_name' は既に存在 (attach で確認: tmux attach -t $session_name)"
    return 0
  fi

  echo "[START] pdca-${issue_num} 起動中..."
  tmux new-session -d -s "$session_name" -c "$REPO_ROOT" "claude --dangerously-skip-permissions"

  # readiness 検出 (RW-025/RW-027: 固定 sleep 禁止)
  if ! bash "$READY_HELPER" "$session_name" 60; then
    echo "[FAIL] $session_name: readiness timeout (60s)" >&2
    tmux capture-pane -t "$session_name" -p | tail -20 >&2
    return 1
  fi

  # /pdca コマンド送信
  tmux send-keys -t "$session_name" "/pdca ${issue_num}" Enter
  echo "[READY] $session_name: /pdca ${issue_num} 送信完了"
  echo "         観察: tmux attach -t $session_name"
}

# バッチ起動 (並列)
launch_batch() {
  local batch_name="$1"
  shift
  local issues=("$@")

  echo "============================================"
  echo "Batch ${batch_name} 起動 (${#issues[@]} 件並列)"
  echo "============================================"

  local failed=()
  for issue in "${issues[@]}"; do
    if ! spawn_pdca "$issue"; then
      failed+=("$issue")
    fi
  done

  echo ""
  echo "起動完了 (失敗 ${#failed[@]} 件)"
  if [ ${#failed[@]} -gt 0 ]; then
    echo "失敗: ${failed[*]}"
  fi
  echo ""
  echo "tmux ls で状態確認、'launch-night-pdca.sh status' でも可"
}

# サブコマンド分岐
case "${1:-}" in
  batch-b1)
    launch_batch "B1" "${B1_ISSUES[@]}"
    ;;
  batch-b2)
    launch_batch "B2" "${B2_ISSUES[@]}"
    ;;
  batch-b3)
    launch_batch "B3" "${B3_ISSUES[@]}"
    ;;
  batch-b4)
    launch_batch "B4" "${B4_ISSUES[@]}"
    ;;
  all-night)
    # B4 → 30 分後 B1 (B4 が触る docs/ と B1 の apps/api,docs/launch は完全独立だが安全側に時差)
    launch_batch "B4" "${B4_ISSUES[@]}"
    echo ""
    echo "30 分後に B1 を起動するなら手動で 'launch-night-pdca.sh batch-b1' を叩いてください"
    echo "(本スクリプトは sleep を含めません - cron や at コマンドで遅延起動推奨)"
    ;;
  status)
    echo "現在の pdca-* tmux session:"
    tmux ls 2>/dev/null | grep -E '^pdca-' || echo "  (なし)"
    ;;
  attach)
    if [ -z "${2:-}" ]; then
      echo "Usage: $0 attach <issue_num>" >&2
      exit 2
    fi
    tmux attach -t "pdca-$2"
    ;;
  kill-all)
    echo "WARNING: 全 pdca-* session を kill します。続行 (yes/N)? "
    read -r ans
    if [ "$ans" = "yes" ]; then
      tmux ls 2>/dev/null | grep -E '^pdca-' | cut -d: -f1 | xargs -I {} tmux kill-session -t {}
      echo "完了"
    else
      echo "中止"
    fi
    ;;
  *)
    cat <<'USAGE'
Usage: launch-night-pdca.sh <subcommand>

サブコマンド:
  batch-b1     #287, #286 を並列起動 (小規模・独立)
  batch-b2     #294, #296 を並列起動 (ci.yml 系、Pushover secret 要確認)
  batch-b3     #275 単独 (バグ調査、/inv 推奨)
  batch-b4     #193, #194, #238 を並列起動 (docs のみ、最低リスク)
  all-night    B4 のみ起動 (B1 は手動推奨)
  status       現在動いてる pdca-* session を表示
  attach <N>   tmux attach -t pdca-<N>
  kill-all     全 pdca-* session を kill (確認あり)

推奨フロー (今夜):
  1. bash scripts/launch-night-pdca.sh batch-b4   # 朝までに 3 PR が ready で待ってる
  2. (朝) bash scripts/launch-night-pdca.sh status   # 完了/進行を確認
  3. (朝) gh pr list --author @me   # 作成された PR を確認
  4. (朝) 必要なら batch-b1 を起動

Issue 詳細:
  #193 docs: WebP→PNG 記事ドラフト
  #194 docs: MP4→MP3 記事ドラフト
  #238 docs: KPI 定義ダッシュボード
  #287 fix(api): convert.ts の test-key フォールバック除去
  #286 docs: HN ドラフトの JPEG/PNG 文言修正
  #294 ci: Pushover 通知ロバスト化
  #296 ci: staging E2E メール分離
  #275 bug: Compare Quality で Failed to fetch
USAGE
    exit 0
    ;;
esac
