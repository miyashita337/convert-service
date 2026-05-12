# ADR 006: SEO 自動化 MVP 着手判断（Go/NoGo + スコープ確定）

- **日付**: 2026-05-13
- **ステータス**: Accepted
- **判断者**: 個人開発者（運営者） + AgentTeams 5名協議
- **関連**: Epic [#320](https://github.com/miyashita337/convert-service/issues/320)、Sub #321（クローズ済）、Sub #322（Phase 1 クローズ済 → Phase 2 #330）

---

## コンテキスト

YouTube動画「[AI社員を8人雇って記事作成を完全自動化](https://www.youtube.com/watch?v=RRyIglv7Okg)」のSEOオウンドメディア自動化アイデアを QuickConv に適用するか判断する必要があった。Epic #320 で 7 サブ Issue に分解し、Sub #321（ファクトチェック記録）と Sub #322 Phase 1（既存記事リライト Phase 1）まで完了した時点で **MVP（#323-#326）の Go/NoGo を決定する**。

## 完了済み Phase（判断材料）

### Sub #321 ファクトチェック結果（[`docs/research/2026-05-13-seo-automation-claims-factcheck.md`](../research/2026-05-13-seo-automation-claims-factcheck.md)）

| 動画主張 | 判定 |
|---|---|
| Ahrefs MCP 「無料で使える」 | 反証（Lite $99/月必須） |
| X API 無料リサーチ | 反証（2026-02 以降従量課金） |
| 他者ツイートで E-E-A-T Experience 担保 | 反証（Quality Rater Guidelines Sep 2025） |
| 月60本AI量産が SEO に安全 | 一部反証（Scaled Content Abuse リスク） |
| Claude Code Desktop 予約タスク機能 | 裏付け |
| Gemini Nano Banana 画像生成 | 裏付け |
| WordPress REST API 自動入稿 | 裏付け（ただし QuickConv は WP 不採用） |

### Sub #322 Phase 1 結果（[PR #329](https://github.com/miyashita337/convert-service/pull/329)）

- 既存 5 記事（001-005）に **著者プロフィール + 競合比較表** を追加
- 所要時間: 約 30 分（半自動：Claude が編集、ユーザーが merge）
- text 系のみの Phase 1 でも E-E-A-T の **Authoritativeness / Trust** 観点は即時改善
- Phase 2（実機スクショ・変換ベンチ・note/Qiita更新）は #330 へ分離

---

## 決定

### 1. MVP（#323-#326）に **限定 Go**

#323-#325 を **「キーワード候補出力 + 競合 H2/H3 抽出 + 構成案 MD 生成」までの 1 コマンド CLI** として実装する。スコープを以下に厳密に絞る:

- **公開先**: note / Qiita のみ（既存 `tools/team_salary` 経由）。WordPress 関連実装は不採用
- **画像生成**: 含めない（手動アイキャッチで十分、Nano Banana は将来検討）
- **X 取得**: 含めない（API コスト発生、ToS リスク）
- **Ahrefs MCP**: 第一選択にしない（Search Console + 手動 seed のみ）。将来別 ADR で再評価
- **スケジューラー**: 自動 cron なし、人間が任意に CLI 実行（Phase 1）
- **品質スコアリング 95点ゲート + 再執筆ループ**: 含めない（コスト爆発リスク）
- **subagent fan-out**: RW-037 に従い必要時のみ。「キーワード」「競合」「構成案」を 3 並列ではなく **直列** で実行

### 2. #326 publish-draft 統合は MVP に含める

`tools/seo-pipeline/publish-draft.mjs` は MVP の最終ピースとして実装する。理由: 自動化のループを閉じないと運用試験ができない。ただし以下を必須:

- DOMPurify 等の HTML サニタイズ ゲート
- `.env.seo` で SEO 系 API キーを分離
- **デフォルト draft**（`--publish` 明示なしでは下書き保存）

### 3. Sub #327（2週間後の撤退/拡張 ADR）の運用

- MVP 着手から **2 週間後** に test-writer 提供の撤退基準（生成成功率 < 70% / Claude 料金 > ¥15k / インデックス 0 本 等）を測定
- 全部クリア → Phase 2（画像生成・スケジューラー導入）を別 ADR 化
- 1 件でも触れたら **廃止 ADR** を本 ADR の Superseded として書く

### 4. 短期優先: Sub #322 Phase 2（#330）を MVP より先に進めることも可

- #330 は実環境ツール作業（Claude in Chrome / 実変換計測）で別セッション必須
- ただし完了すれば E-E-A-T の Experience 強化として効くため、MVP と並行可能
- 順序は運営者判断（インデックスデータが先に欲しいなら #330 先、自動化検証が先なら MVP 先）

---

## 不採用となった選択肢

| 選択肢 | 理由 |
|---|---|
| 動画通りの 7 エージェント月60本版を採用 | fact-checker / devils-advocate / security-reviewer 全員が NO |
| MVP を完全廃止（記事手動運用継続） | architect の MVP 提案を活かせず、Sub #322 Phase 1 の流れも止まる |
| #323-326 を一括 PR で実装 | RW-035（暗黙契約累積）と同型構造、3+ Issue 分割が安全 |
| Ahrefs MCP を MVP 第一選択 | $99/月、ROI 未検証、Search Console で代替可能 |

---

## 帰結

### 即時アクション

1. Sub #323（キーワード選定 subagent）に着手可能（着手ブロッカーなし）
2. Sub #322 Phase 2（#330）も並行着手可能（独立タスク）
3. Sub #327 の運用基準計測は MVP 動作開始から起算

### モニタリング

- 2 週間後（推定 2026-05-27）に撤退基準を計測
- 結果は **本 ADR の Successor ADR** として記録（継続なら ADR-006a、廃止なら ADR-006b）

### 関連 RW

- RW-035（pdca-parallel.sh 暗黙契約累積）— 同型構造を避けるため MVP スコープを最小に絞った
- RW-037（subagent 起動原則）— 必要時のみ fan-out
- RW-002（publish 直公開）— デフォルト draft 必須
- RW-014（.env 広域 deny）— `.env.seo` 分離で同型を防ぐ
