---
name: "devcycle"
description: "corp dispatch 用 開発 goal playbook: 調査→実装→PR→[会長merge]→本番デプロイ→本番E2E→[会長close]→done（CI 自動パイプラインを会長ゲートで区切る）"
version: "1.0"
---

# 開発 goal playbook（corp dispatch / M4・corp#52）

引数: $ARGUMENTS（**Issue 番号**）

corp 本社から `/devcycle <Issue番号>` で dispatch される開発の一連フロー（convert-service 既定 selector）。
convert-service の **CI 自動パイプライン**（`.github/workflows/ci.yml`）を **会長ゲートで区切る多フェーズ手順**
に束ね、各フェーズ末に GitHub フェーズラベルを打つ。このラベルを corp board（可視化）と claude-hub の
auto-stop（GoalWatcher）が共有する。

## このコマンドの位置づけ（重要）

- corp dispatch の selector `devcycle`（convert-service 既定）に対応する slash コマンド。
- フェーズ間は **報告して待つ**。会長の merge/close で次フェーズへ進む（勝手に先へ進めない）。
- 終端で `done` ラベルを打つと claude-hub の GoalWatcher がセッションを猶予後 auto-stop する（M3）。
- **CI が本番までの deploy/E2E を自動実行する**。本 playbook は手で deploy せず、CI の進行を監視して
  ラベル付けと会長への報告・停止を行う。
- **pnpm 専用**。`npm install` / `yarn install` は実行しない（package-lock を生成し CI の
  `--frozen-lockfile` を壊す。RW-052）。依存は `pnpm install --frozen-lockfile`。

## CI パイプライン（真実源: `.github/workflows/ci.yml`）

| 契機 | 実行ジョブ |
|---|---|
| **PR** | `lint-and-build`（`pnpm run lint`/`build`/`format:check`）＋ `test`（vitest） |
| **main へ push（merge）** | `deploy-stg`（Pages staging ＋ `apps/api` Workers staging）→ `e2e-stg`（Playwright @staging）→ `deploy-prod`（Pages 本番 ＋ Workers 本番・**staging E2E でゲート**）→ `e2e-prod`（Playwright @本番） |

staging E2E が通らなければ本番デプロイは走らない（CI でゲート済み）。

## フェーズラベル（corp 共有語彙・spec §8）

| ラベル | 意味 | 会長の番か |
|---|---|---|
| `staging-ready` | PR 作成＋PR CI green。会長の merge 待ち | ✅ 会長 |
| `deployed` | merge 後 CI が本番デプロイ＋本番 E2E まで green。会長の close 待ち | 部署 |
| `done` | merge 漏れ確認済み・完了（auto-stop トリガー） | 終端 |

`approved` は corp の dispatch ゲートラベルで進行フェーズではない（board は無視）。

### 前提: フェーズラベル事前作成（冪等）

```bash
gh label create "staging-ready" --color "FBCA04" --description "PR CI green・会長merge待ち" --force
gh label create "deployed"      --color "1D76DB" --description "本番デプロイ+本番E2E green・会長close待ち" --force
gh label create "done"          --color "5319E7" --description "完了（corp auto-stop トリガー）" --force
```

## 自己修復ポリシー（全フェーズ共通）

エラー発生時: 自動修正（3回まで）→ AgentTeams 招集 → 会長確認（最終手段）。

---

## Phase 1: 調査 → 実装 → PR（→ `staging-ready`）

1. **調査**: Issue N の要件を把握。必要なら再現・原因特定（バグなら再現手順を確立）。
2. **実装**: dispatch ブランチ（`corp-dispatch-N`）上で実装。`apps/{web,api,converter}` / `packages/shared`
   の該当箇所を変更。
3. **ローカル検証（PR 前）**:
   ```bash
   pnpm install --frozen-lockfile
   pnpm run lint        # tsc 型チェック
   pnpm run build       # turbo build
   pnpm -r test         # vitest（変更パッケージ）
   ```
   UI 変更があれば任意で `cd apps/web && pnpm test:e2e`（ローカル Playwright）で事前確認。
4. **PR 作成**（直 push 禁止・PR 必須）。本文に変更概要・テスト方法を記載。
   - 注: PR 本文に `Closes #N` を付けると **merge で Issue が閉じる**が、本 playbook は Issue close では
     停止しない（`done` ラベルで停止する。AC-7）。早期 close を避けたい場合は PR 本文では参照のみに留める。
5. **PR CI（`lint-and-build` ＋ `test`）が green** になったら:
   ```bash
   gh issue edit "$ARGUMENTS" --add-label "staging-ready"
   ```
   会長へ「実装＋PR 完了、CI green。レビューと merge をお願いします」と報告し、**会長の merge を待つ**。

---

## Phase 2: [会長 merge] → 本番デプロイ → 本番 E2E（→ `deployed`）

会長が PR を merge したら、CI が自動で `deploy-stg → e2e-stg → deploy-prod → e2e-prod` を走らせる。
**手動 deploy はしない**。CI の進行を監視する。

1. **CI 監視**:
   ```bash
   gh run watch "$(gh run list --branch main --workflow CI --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
   ```
   または `gh run list --branch main` で最新 run の `deploy-prod` / `e2e-prod` ジョブの成否を確認。
2. **判定**:
   - **`e2e-prod` まで green（本番デプロイ＋本番 E2E 成功）**:
     ```bash
     gh issue edit "$ARGUMENTS" --remove-label "staging-ready" --add-label "deployed"
     ```
     会長へ本番デプロイ完了＋本番 E2E green を報告し、**会長の close を待つ**。
   - **staging E2E or 本番 E2E が fail**: 本番デプロイはゲートで止まる（または本番後に検知）。原因を調査し
     修正 PR を出す（自己修復ポリシー）。`deployed` は付けず会長へ通知。

---

## Phase 3: [会長 close] → merge 漏れ確認 → `done`

会長が Issue を close（または「close」「完了」指示）したら実行する。

1. **merge 漏れ確認**: 当該 Issue に紐づく PR がすべて merge 済みで、`main` に未反映の変更が無いことを確認。
   関連 follow-up（hotfix 等）があれば取りこぼしていないか点検する。
2. **本番反映の最終確認**: `e2e-prod` が当該リリースで green であること（本番が壊れたまま done にしない）。
3. **done ラベル付与（auto-stop トリガー）**:
   ```bash
   gh issue edit "$ARGUMENTS" --remove-label "deployed" --add-label "done"
   ```
   `done` 付与で claude-hub の GoalWatcher がセッションを猶予後 auto-stop する（M3）。会長へ完了報告。

> **AC-7（重要）**: 本番 E2E は merge（Issue が `Closes #N` で閉じても）より後に走りうる。GoalWatcher は
> Issue close ではなく `done` ラベルで停止するため、close 後も本番デプロイ＋本番 E2E が完走できる。
> `done` は本番 E2E green を確認してから打つこと。

---

## 統合ジャーニーAC（spec §11 devcycle 経路）

| # | 操作 | 期待結果 | 検証手段 |
|---|---|---|---|
| 1 | corp が `/devcycle <N>` を dispatch | 部署セッション起動→実装→PR 作成→PR CI green→`staging-ready` 付与 | `gh pr list` に PR、PR checks green、`gh issue view <N>` に `staging-ready` |
| 2 | 会長が PR を merge | CI が deploy-stg→e2e-stg→deploy-prod→e2e-prod を完走→`deployed` 付与 | `gh run list --branch main` で `e2e-prod` success、`gh issue view <N>` に `deployed` |
| 3 | 会長が Issue を close | merge 漏れ確認→`done` 付与→GoalWatcher が猶予後 auto-stop | `gh issue view <N>` に `done`、claude-hub で当該スレッドが archived |

> 注: 会長ゲート（merge / close）と CI 自動パイプラインを跨ぐため、フル E2E の決定的検証は corp からの
> 実 dispatch 時にのみ可能。本 PR ではコマンド定義（フェーズ・ラベル・停止点・参照する CI ジョブの実在）の
> 正しさをレビューで担保する。
