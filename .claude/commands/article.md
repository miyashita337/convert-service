---
name: "article"
description: "corp dispatch 用 記事 goal playbook(convert-service): 執筆→下書き→[会長承認]→公開+クロスポスト→[会長close]→merge→done"
version: "1.0"
---

# 記事 goal playbook（convert-service / M4・corp#52）

引数: $ARGUMENTS（**Issue 番号**）

corp 本社から `/article <Issue番号>` で dispatch される、QuickConv の SEO/集客記事制作フロー
（convert-service の **明示 selector**。既定 selector は `devcycle`）。team_salary の article playbook と
**同型**（同じフェーズ・ラベル・会長ゲート）だが、convert-service の記事資産・投稿フローに合わせる。

## 責務分離（真実源: `docs/articles/README.md`）

- **convert-service 配下**: 記事本体 `docs/articles/<NNN>-<slug>.md`（YAML frontmatter）＋画像、
  Dev.to/Hashnode 投稿スクリプト（`tools/publish-{devto,hashnode}-<NNN>.mjs`・英語記事のクロスポスト）。
- **`tools/team_salary` 配下（submodule）から流用**: note / Qiita / X / Threads / IG の投稿モジュール
  （重複実装禁止）。

## このコマンドの位置づけ（重要）

- フェーズ間は **報告して待つ**。会長の承認/close で次フェーズへ進む（勝手に先へ進めない）。
- 終端で `done` ラベルを打つと claude-hub の GoalWatcher がセッションを猶予後 auto-stop する（M3）。
- dispatch は非対話前提。テーマ・ターゲットは Issue 本文から推論し、会長に都度質問しない。
- `.env` 注入は `npx dotenv -e .env -- <cmd>` を使う（`set -a && . .env` 形式は使わない）。

## フェーズラベル（corp 共有語彙・spec §8）

| ラベル | 意味 | 会長の番か |
|---|---|---|
| `draft-returned` | 記事下書き（`published: false`）作成済み。会長の承認待ち | ✅ 会長 |
| `published` | 各プラットフォームへ公開＋クロスポスト済み。会長の close 待ち | 部署 |
| `done` | merge 済み・完了（auto-stop トリガー） | 終端 |

### 前提: フェーズラベル事前作成（冪等）

```bash
gh label create "draft-returned" --color "FBCA04" --description "記事下書き作成済・会長承認待ち" --force
gh label create "published"      --color "0E8A16" --description "公開+クロスポスト済・会長close待ち" --force
gh label create "done"           --color "5319E7" --description "完了（corp auto-stop トリガー）" --force
```

## 自己修復ポリシー（全フェーズ共通）

エラー発生時: 自動修正（3回まで）→ AgentTeams 招集 → 会長確認（最終手段）。

---

## Phase A: 執筆 → 下書き → 返却（→ `draft-returned`）

1. **記事執筆**: `docs/articles/<NNN>-<slug>.md` を新規作成（連番は既存の最大 +1）。frontmatter は
   `published: false`／`canonical_url: ""`／`platforms: {}`（空）で開始。本文はエビデンスに基づき執筆
   （推論のみで数値を書かない）。
2. **画像**: ヘッダ画像を `docs/articles/images/<NNN>-<slug>/` に生成・配置（frontmatter `cover_image`）。
3. **下書き確認**: build を壊さないこと（`pnpm install --frozen-lockfile && pnpm run build`。pnpm 専用・
   `npm install` 禁止＝RW-052）。記事はこの時点で **未公開**（`published: false`）。
4. **フェーズラベル付与 + 報告 + 停止**:
   ```bash
   gh issue edit <N> --add-label "draft-returned"
   gh issue comment <N> --body "## 下書き返却 - <timestamp>\n\n- 記事: docs/articles/<NNN>-<slug>.md（published:false）\n\n会長の承認をお待ちします（承認後に公開＋クロスポストへ進みます）。"
   ```
   会長へ下書き（記事パス・要旨）を報告し、**ここで停止して会長の承認発言を待つ**。

---

## Phase B: [会長承認] → 公開 + クロスポスト（→ `published`）

会長から承認（「承認」「公開して」等）を受けてから実行する。

1. **Dev.to / Hashnode（英語記事・convert-service 配下）**: 既存パターンに倣い
   `tools/publish-{devto,hashnode}-<NNN>.mjs` を用意し実行する（必要 env: `DEVTO_API_KEY` /
   `HASHNODE_TOKEN` / `HASHNODE_PUBLICATION_ID`）。
   ```bash
   npx dotenv -e .env -- node tools/publish-devto-<NNN>.mjs
   npx dotenv -e .env -- node tools/publish-hashnode-<NNN>.mjs
   ```
2. **note / Qiita / SNS（`tools/team_salary` submodule を流用）**: submodule 側の投稿モジュールで
   note / Qiita / X / Threads / IG へクロスポストする（`docs/articles/README.md` の流用方針に従う）。
3. **frontmatter 更新**: `published: true`／`published_at`／`canonical_url`／`platforms.{devto,hashnode,
   note,qiita,...}` に公開 URL を反映してコミットする。
4. **フェーズラベル付与 + 報告 + 停止**:
   ```bash
   gh issue edit <N> --remove-label "draft-returned" --add-label "published"
   ```
   会長へ各プラットフォームの公開 URL を報告し、**会長の close を待つ**。
   - いずれかの公開が失敗したら、そのプラットフォームを切り分けて再試行（自己修復ポリシー）。主要公開が
     成立しないうちは `published` を付けない。

---

## Phase C: [会長 close] → merge → `done`

会長が Issue を close（または「close」「完了」指示）したら実行する。

1. **merge**: dispatch ブランチ（`corp-dispatch-<N>`）上の記事 `.md`・画像・frontmatter 更新・投稿スクリプトを
   **PR 経由で main へ反映**（直 push 禁止・PR 必須）。PR があれば merge。
2. **merge 漏れ確認**: `git status --porcelain` で未コミット変更が無いこと、frontmatter の公開 URL が
   反映済みであることを確認。
3. **done ラベル付与（auto-stop トリガー）**:
   ```bash
   gh issue edit <N> --add-label "done"
   ```
   `done` 付与で claude-hub の GoalWatcher がセッションを猶予後 auto-stop する（M3）。会長へ完了報告。

---

## 統合ジャーニーAC（spec §11 article 経路）

| # | 操作 | 期待結果 | 検証手段 |
|---|---|---|---|
| 1 | corp が `/article <N>` を dispatch | 部署セッション起動→Phase A 実行→`docs/articles/<NNN>-<slug>.md`（published:false）作成＋`draft-returned` 付与 | 記事ファイル存在＋frontmatter `published: false`、`gh issue view <N>` に `draft-returned` |
| 2 | 会長が承認発言 | Phase B 実行→Dev.to/Hashnode＋note/Qiita/SNS 公開→frontmatter `published: true`＋URL→`published` 付与 | 各 platform URL が HTTP 200、frontmatter `platforms` に URL、`gh issue view <N>` に `published` |
| 3 | 会長が Issue を close | Phase C 実行→PR merge→`done` 付与→GoalWatcher が猶予後 auto-stop | `gh issue view <N>` に `done`、claude-hub で当該スレッドが archived |

> 注: 会長ゲートを跨ぐため、フル E2E の決定的検証は corp からの実 dispatch 時にのみ可能。本 PR では
> コマンド定義（フェーズ・ラベル・停止点・`docs/articles/README.md` の投稿フロー準拠）の正しさをレビューで
> 担保する。
