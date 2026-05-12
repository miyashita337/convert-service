# SEO自動化動画 主張ファクトチェック記録

- **対象動画**: 【保存版】AI社員を8人雇って記事作成を完全自動化！SEO集客を勝手にしてもらう方法【Claude Code】
- **動画 URL**: https://www.youtube.com/watch?v=RRyIglv7Okg
- **解析日**: 2026-05-13
- **記録元**: Epic #320 / Sub #321 / AgentTeams (fact-checker) 協議結果
- **関連レポート**: [`2026-05-13-seo-automation-claude-code-video-summary.md`](./2026-05-13-seo-automation-claude-code-video-summary.md)

---

## ファクトチェック判定一覧

| # | 主張 | 判定 | 根拠 URL | QuickConv への含意 |
|---|---|---|---|---|
| 1 | Ahrefs MCP の存在 | 一部裏付け（要 Ahrefs Lite $99/月、MCP キー別途取得） | https://docs.ahrefs.com/mcp/docs/introduction | 動画の「無料」含意は誤り。MVP では Search Console + 手動 seed を優先、Ahrefs MCP は ROI 評価後に判断（#323） |
| 2 | Claude Code Desktop の予約タスク機能 | 裏付け | https://code.claude.com/docs/en/scheduled-tasks | Desktop はローカル実行必須（マシン起動前提）。クラウド常駐の運用には不向き。GitHub Actions cron か Claude Cloud Tasks が代替候補 |
| 3 | AI 生成記事の Google 扱い（人間チェック付き） | 一部裏付け（月60本ペースは Scaled Content Abuse リスク） | https://developers.google.com/search/docs/fundamentals/using-gen-ai-content | AI 生成自体は不可ではないが、量産は減点対象。QuickConv 既存ドメイン評価を毀損するため、月2-4本以下の高品質運用を採用 |
| 4 | E-E-A-T の Experience を他者 X / YouTube 取得で担保 | **反証あり** | https://guidelines.raterhub.com/searchqualityevaluatorguidelines.pdf (Sep 2025) | Experience = コンテンツ作成者の直接経験。他者一次情報のキュレーションは Experience を構成しない。QuickConv では運営者が自分で検証した変換ベンチ・スクショを Experience とする |
| 5 | X API での無料リサーチ取得 | **反証あり**（2026-02 以降従量課金、無料枠廃止） | https://postproxy.dev/blog/x-api-pricing-2026/ | リサーチ用途で実費発生。X 連携は MVP に組み込まない、または手動収集に留める |
| 6 | WordPress REST API 自動入稿 | 裏付け（xmlrpc は非推奨化済） | https://kinsta.com/blog/xmlrpc-php/ | QuickConv は Next.js + Cloudflare Pages で WordPress 未採用。動画前提が直接適用不可。公開先は note / Qiita（既存 `tools/team_salary` 経由）に切替（#326） |
| 7 | Gemini "Nano Banana" 画像生成 API の正式名称 | 裏付け（Google DeepMind 公式ブランド） | https://deepmind.google/models/gemini-image/ | Nano Banana = Gemini 2.5 Flash Image。商用利用は Google AI Studio 利用規約準拠。MVP では画像生成を含めない（手動アイキャッチで十分） |

---

## QuickConv 戦略への含意（結論）

### 採用しない方針

- **月60本 AI 量産**: 主張 #3 #4 より、Google の Scaled Content Abuse / E-E-A-T Experience 要件に抵触するリスクが高い
- **動画通りの 7 エージェント全自動**: 主張 #1 #2 #5 #6 より、前提コンポーネントの多くに有料化・QuickConv 環境非適合・反証が存在し、構築コストに見合う ROI が成立しない

### 採用する方針（Epic #320 で実装）

- **量より質**: 既存 5 記事 (001-005) を E-E-A-T 強化リライト（#322）。実機スクショ・変換ベンチ・運営者プロフィールで Experience を満たす
- **半自動化 MVP**: キーワード選定 + 競合分析 + 構成案生成までを Claude Code subagent 化、執筆〜公開は人間 + `tools/team_salary` 既存パイプライン（#323 #324 #325 #326）
- **撤退基準**: 2 週間運用後、生成成功率 < 70% / Claude 料金 > ¥15k / インデックス 0 本 のいずれかで廃止 ADR（#327）

### 動画ソースの位置づけ

本動画は **LINE 登録誘導のリードマグネット**であり、第三者検証ゼロの自社実績主張を含む。**「アイデア源泉」としては有用だが、技術選定の根拠としては不採用**。fact-checking ルール（`~/agent-base/rules/general/fact-checking.md`）の「根拠なきベストプラクティス主張禁止」原則を適用する。

---

## 出典の確度評価

| 出典 | 確度 | 備考 |
|---|---|---|
| developers.google.com / Search Central | 高 | Google 公式ドキュメント |
| guidelines.raterhub.com (Search Quality Rater Guidelines) | 高 | Google 公式 PDF、Sep 2025 版 |
| code.claude.com | 高 | Anthropic 公式 |
| deepmind.google | 高 | Google DeepMind 公式 |
| docs.ahrefs.com | 高 | Ahrefs 公式 |
| postproxy.dev | 中 | サードパーティ集計、X API 公式ページとのクロスチェック推奨 |
| kinsta.com | 中 | ホスティング事業者の公式記事、技術的内容は信頼可 |

---

## 関連

- Epic: [#320 E12: SEO 自動化導入の検討と段階的実装](https://github.com/miyashita337/convert-service/issues/320)
- 動画文章化レポート: [`2026-05-13-seo-automation-claude-code-video-summary.md`](./2026-05-13-seo-automation-claude-code-video-summary.md)
- 適用ルール: `~/agent-base/rules/general/fact-checking.md`
