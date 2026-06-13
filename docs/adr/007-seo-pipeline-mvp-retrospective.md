# ADR 007: SEO MVP パイプライン 2 週間運用後の撤退判断 →（運用検証により）保留・再評価

- **日付**: 2026-06-13（同日後刻、運用検証を受けて判断を改定）
- **ステータス**: Accepted（当初の「廃止」判断は、同日の運用検証 1 件をもって **保留（再評価）** に改定。下記「追記」が最終決定）
- **Supersedes**: ADR-006 §3「Sub #327 の運用」(運用後判断の保留部分のみ。ADR-006 の Go/NoGo・スコープ確定は履歴として有効)
- **判断者**: 個人開発者（運営者）
- **関連**: Epic [#320](https://github.com/miyashita337/convert-service/issues/320)、Sub [#327](https://github.com/miyashita337/convert-service/issues/327)、[ADR-006](006-seo-automation-mvp-go-nogo.md)、公開記事 [007 (Qiita)](https://qiita.com/quickconv/items/f639b634d01534b1251f)

---

## 追記（2026-06-13 後刻）: 運用検証により「廃止」を「保留・再評価」へ改定（最終決定）

当初、本 ADR は「2 週間で run 0 件・インデックス 0 本 → 撤退基準抵触 → 廃止」と結論した（下記「計測結果」「決定」セクション）。しかしこの集計は **「一度も運用していない」ことが breach の主因**であり、撤退前に運用検証を 1 件実施した。

### 実施した運用検証（パイプライン end-to-end 1 件）

| 段階 | 結果                                                                                                                                                                         |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 生成 | `node tools/seo-pipeline/run.mjs --keyword "HEIC JPEG 変換"` 実行 → keywords.json(9語) + outline.md。**ただし出力は TODO 付きの骨子のみ**                                    |
| 執筆 | 骨子から本文を手動執筆（[`docs/articles/007-heic-to-jpeg.md`](../articles/007-heic-to-jpeg.md)）。事実検証済み（HEIC 変換実在・無料枠 10MB・ベンチ数値は捏造せず未計測明示） |
| 公開 | Qiita に **public** 公開・生存確認 OK（[記事](https://qiita.com/quickconv/items/f639b634d01534b1251f)、HTTP 200、noindex なし＝Google インデックス可能）                     |

### 検証で判明した公開ループの欠陥（パイプラインが「1 コマンド公開」になっていない）

1. `publish-draft.mjs` shim が Qiita を **private 固定**（SEO 用途に不適）
2. team_salary `publish-quickconv-qiita.ts` の `SUPPORTED_SLUGS` が **ハードコード許可制**（新規記事ごとに submodule 編集が必要。本検証で 007 追加＝[team_salary PR #222](https://github.com/miyashita337/team_salary/pull/222)）
3. 同スクリプトの引数パーサが `--slug=値` のみ対応で、shim が渡す `--slug 値`（スペース形）を取りこぼす

### 改定後の決定: **保留（撤退判断を延期）**

- 当初の「廃止」は撤回する（運用 1 件・公開 1 件の実績が出たため、撤退基準 #1/#5 の前提が消えた）
- ただし **Phase 2 拡張も承認しない**。生成は骨子のみで本文価値は手動執筆が担い、公開ループには上記 3 欠陥がある（= 自動化はまだ律速を解消していない）
- **再評価条件**: 公開した 007 記事のインデックス/流入を ~2〜4 週後に Search Console で確認し、`retrospective.mjs --since 2026-06-13 --indexed-count <n>` で再集計。SEO 効果が確認できれば公開ループ 3 欠陥を改修して継続投資、確認できなければ改めて廃止 ADR を書く
- これに伴い deletion 追跡 Issue [#366](https://github.com/miyashita337/convert-service/issues/366) は **保留（close 候補）** とする

> 以下の「計測結果」「決定」セクションは改定前の記録として保持する（撤退基準の機械集計手順そのものは有効）。

---

## コンテキスト

[ADR-006](006-seo-automation-mvp-go-nogo.md) §3 で「MVP 着手から 2 週間後に test-writer 提供の撤退基準を計測し、全部クリアなら Phase 2、1 件でも触れたら廃止 ADR を書く」と定めた。

MVP 生成パイプライン（Sub #323-#326）は **2026-05-13** に出荷完了（[#335](https://github.com/miyashita337/convert-service/pull/335) / [#337](https://github.com/miyashita337/convert-service/pull/337) / [#338](https://github.com/miyashita337/convert-service/pull/338) / [#340](https://github.com/miyashita337/convert-service/pull/340)）。本 ADR 作成時点（2026-06-13）で約 1 か月が経過し、2 週間運用ウィンドウは満了している。

本 Sub #327 で集計ツール `tools/seo-pipeline/retrospective.mjs` を実装し、5 指標を機械集計した。

## 計測結果（`retrospective.mjs --since 2026-05-13`）

| #   | 指標                 | しきい値          | 実測                                                                                                                             | 判定       |
| --- | -------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | 記事生成成功率       | < 70% で廃止      | **N/A（run 0 件＝未運用）**                                                                                                      | **BREACH** |
| 2   | HITL 承認率          | < 50% で廃止      | N/A（機械ログ不在 / pipeline 経由公開 0 件）                                                                                     | 未計測     |
| 3   | Claude API 料金      | > ¥15,000 で廃止  | **¥0**（outline-generator は deterministic で LLM 非使用）                                                                       | PASS       |
| 4   | ビルド破壊件数       | >= 2 で廃止       | **1 件**（CI 失敗 5 件中 seo-pipeline 起因 1 件＝[#345](https://github.com/miyashita337/convert-service/pull/345) の `d57d744`） | PASS       |
| 5   | 生成記事インデックス | 0 本 / 2週 で廃止 | **0 本**（pipeline 生成記事が 0 本のため必然）                                                                                   | **BREACH** |

計測根拠:

- 指標 1: `docs/articles/seo-drafts/`（`.gitignore` 対象、ローカル走査）に since 以降の日付ディレクトリが **0 件**。`run.mjs` の出力（keywords/competitor/outline）が一度もコミット・残存していない。
- 指標 4: `gh run list --workflow CI` の失敗 run を since 以降で取得し、head commit が `tools/seo-pipeline/` を触れたものだけを計上。残り 4 件は Stripe E2E 系（`aded4b5` 等）で本 pipeline 無関係。
- 指標 2・3・5: 外部コンソール（Anthropic / Search Console）依存。ツールは推測で 0 を埋めず `未計測` を明示し、手動入力スロット（`--claude-cost-yen` / `--indexed-count` / `--hitl-*`）で受ける設計。本 ADR では deterministic 設計（料金 ≈¥0）と「pipeline 生成記事 0 本 → indexed 0」を確定事実として扱う。

## 決定

### 1. 生成パイプライン（自動化 MVP）を **廃止（撤退）** する

ADR-006 §3 のルール「1 件でも撤退基準に触れたら廃止」に従う。指標 1（生成 0 件＝未運用）と指標 5（インデックス 0 本）が breach。撤退対象は **キーワード→構成案の自動化** に限定する:

- `tools/seo-pipeline/run.mjs`（3 段オーケストレーター）
- `tools/seo-pipeline/keyword-research.mjs`
- `tools/seo-pipeline/competitor-analysis.mjs`
- `tools/seo-pipeline/outline-generator.mjs`
- 上記の `__tests__/*.test.mjs`、`.env.seo.example`、README 該当節

撤退理由は **「高コスト」ではなく「需要ゼロ／律速でない」**。料金（¥0）・ビルド安全性（起因 1 件 < 2）は問題なかった。2 週間で一度も運用されず、成功した SEO 成果（既存 5 記事の E-E-A-T リライト = #330）は本 pipeline に依存せず手動で達成された。devils-advocate が ADR-006 協議で指摘した「自動化は SEO の律速ではない」が裏付けられた形。未使用機能の黙認は YAGNI 違反（agent-output-quality #4）であり、deprecate / 削除を選ぶ。

### 2. 記事メンテナンスツールは **保持** する

以下は #330（既存記事リライト）で実利用・コミット済み証跡があり、「SEO 自動化 MVP」ではなく **記事メンテナンスツール** として再分類して残す:

- `tools/seo-pipeline/benchmark.mjs`（`docs/articles/benchmarks/2026-05-17.json` を生成・記事が参照）
- `tools/seo-pipeline/publish-draft.mjs`（`--update` モードで Qiita 記事更新の dry-run に使用）
- `tools/seo-pipeline/render-article-003-diagrams.mjs`（003 記事の図版レンダリング）

### 3. Phase 2 拡張は **却下**

画像生成・スケジューラ・LLM polish・subagent fan-out 拡張は採用しない。自動化が律速でないことが運用データで示されたため、追加投資の根拠がない。

### 4. 撤退ツール `retrospective.mjs` は **保持**

集計ロジックと撤退基準（`THRESHOLDS`）を将来再評価で再利用できるよう残す。本 ADR の計測 consumer であり、orphan writer ではない（observability ルール準拠）。

### 5. 実削除は **別 PR** で実施

本 PR は ADR とツールに限定し、生成パイプラインの実削除は別 Issue / PR で行う（Sub #327 受入基準「廃止の場合、関連スクリプトの削除 PR を別途起票」）。

## 不採用となった選択肢

| 選択肢                                       | 理由                                                                                    |
| -------------------------------------------- | --------------------------------------------------------------------------------------- |
| 生成パイプラインを **継続（現状維持）**      | 2 週間で 0 運用。未使用機能の保守は YAGNI 違反（#4）。需要が出れば git 履歴から復元可能 |
| Phase 2 へ **拡張**                          | ADR-006 §3 の「全部クリア」条件を満たさない（指標 1・5 が breach）                      |
| `seo-pipeline` ディレクトリを **丸ごと削除** | benchmark / publish-draft(--update) / diagram は #330 で実利用中。生成系のみ撤退が正確  |
| 本 PR で **同時に削除**                      | 撤退判断（ADR）と破壊的変更（削除）を 1 PR に混ぜない。AC が「別途起票」を要求          |

## 帰結

### 即時アクション

1. 生成パイプライン削除 PR を追跡する follow-up Issue を起票（[#366](https://github.com/miyashita337/convert-service/issues/366)）
2. ADR-006 に本 ADR への successor 参照を追記
3. `retrospective.mjs` と本 ADR をマージ

### モニタリング / 再評価条件

- 将来 SEO 記事生成の自動化需要が再燃した場合、本 ADR を Superseded にして再導入 ADR を書く
- 再評価時は `retrospective.mjs --since <date> --claude-cost-yen <n> --indexed-count <n>` で同じ 5 指標を再計測する

### 関連 RW / ルール

- agent-output-quality #4（使われない機能の継続保守の禁止）— 本撤退判断の主根拠
- ADR-006 §3（2 週間後の撤退/拡張ルール）— 本 ADR がその successor
- observability ルール（writer には consumer を）— `retrospective.mjs` は ADR の集計 consumer として導入
