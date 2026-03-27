# QuickConv 集客・成長戦略 設計書

## 概要

QuickConv（quickconv.cc）の現状アナリティクス分析に基づく、SEO修正・コンテンツ強化・UX改善・集客施策の包括的成長戦略。

## 現状分析（2026-03-27 時点）

### アナリティクスデータ

| ソース | 期間 | 主要指標 |
|--------|------|---------|
| GA4 | 7日 | アクティブユーザー: 0（Cookie同意の壁） |
| Search Console | 12日 | クリック: 2、表示: 24、平均順位: 32.5、インデックス: 8ページ |
| CF Web Analytics | 24h | ビジット: 14、PV: 22（ボット除外） |
| CF HTTP Traffic | 30日 | 72.7kリクエスト（99%ボット/クローラー） |

### 致命的バグ

`SITE_URL = "https://quickconv.io"`（正: `quickconv.cc`）により、全ページのcanonical URL、hreflang、OG URL、JSON-LDが存在しないドメインを指している。180+ページ中8ページしかインデックスされない最大原因。

影響ファイル:
- `apps/web/src/lib/metadata.ts:4`
- `apps/web/src/components/json-ld.tsx:3`
- `apps/web/src/lib/utm.ts:19`
- `apps/web/src/messages/en.json:159`
- `apps/web/src/messages/ja.json:152`

### Core Web Vitals

| 指標 | Good | Poor |
|------|------|------|
| LCP | 83% | 17%（英語ページ） |
| INP | 100% | 0% |
| CLS | 100% | 0% |

Page load time: 1,300ms（前期比 +70.8%）

## 戦略方針

### ポジショニング

「次世代画像フォーマット（HEIC/AVIF/WebP）の日本語専門サービス」

### 市場戦略

日本語ファースト → グローバル展開

### ターゲットセグメント（優先順）

1. iPhoneユーザー（HEIC変換需要）
2. ブロガー（画像軽量化 + SEO）
3. SNS投稿者（フォーマット問題）
4. Web開発者（次世代フォーマット導入）

### 差別化ポイント

- 品質比較プレビュー（競合にない機能）
- HEIC対応（Squooshは非対応）
- 日本語ネイティブ
- 登録不要 + 十分な無料枠

## フェーズ構成

### Phase 1: テクニカルSEO修正（E9）— 1-2日

canonical URLバグ修正によるインデックス解放。

### Phase 2: コンテンツ + UX強化（E10）— 1-2週間

SEOコンテンツ拡充、UX/CRO改善、マルチ投稿スクリプト基盤構築。

### Phase 3: 集客・グロース施策（E11）— 1-2週間

技術記事配信、SNS/コミュニティ展開、Product Huntローンチ。

## エピック・Issue 構造

### E9: テクニカルSEO修正（Phase 1）

| # | Issue | 内容 | AC |
|---|-------|------|-----|
| 1 | canonical URL修正 | metadata.ts, json-ld.tsx, utm.ts, messages/*.json の quickconv.io → quickconv.cc | ビルド後の全HTMLでcanonicalが quickconv.cc を指すこと |
| 2 | サイトマップ再送信 | Search Consoleでサイトマップ再送信 + 主要URL再クロールリクエスト | Search Consoleでサイトマップ送信成功 |
| 3 | インデックスモニタリング | 2週間後にSearch Consoleでインデックス数確認 | インデックス数が50+に増加 |
| 4 | GA4計測改善検討 | Cookie同意なしでの基本計測方法を調査・実装 | CF Web AnalyticsとGA4の乖離が縮小 |

### E10: コンテンツ + UX強化（Phase 2）

#### SEOコンテンツ（8 Issue）

| # | Issue | 内容 |
|---|-------|------|
| 5 | 変換ページテンプレート強化 | ConvertPageContentコンポーネントにFAQ/説明/比較表セクション追加 |
| 6 | FAQPage JSON-LDスキーマ追加 | json-ld.tsxにgenerateFAQSchema()実装 |
| 7 | 主要10変換ページコンテンツ展開 | heic-to-jpg, heic-to-png, avif-to-jpg, png-to-avif, png-to-webp, webp-to-jpg, jpg-to-webp, svg-to-png, jpg-to-avif, mp4-to-gif |
| 8 | 残り変換ページコンテンツ展開 | png-to-jpg, heic-to-png, mp4-to-mp3, mp3-to-wav, wav-to-mp3, flac-to-mp3, ogg-to-mp3, jpg-to-pdf, png-to-pdf |
| 9 | ガイド記事: HEIC変換完全ガイド | iPhoneユーザー向け、日英両方 |
| 10 | ガイド記事: WebP vs AVIF vs HEIC比較 | フォーマット比較、実データ付き |
| 11 | ガイド記事: ブログ画像最適化ガイド | ブロガー向け、PageSpeed改善 |
| 12 | 内部リンク構造最適化 | ガイド⇔変換ページ相互リンク、トップページカテゴリ別一覧 |

#### UX/CRO改善（11 Issue）

| # | Issue | コスト | 効果 |
|---|-------|--------|------|
| 13 | ベネフィットバッジ追加 | 低 | 高 |
| 14 | 広告位置をDLボタン下に移動 | 低 | 高 |
| 15 | ヒーローコピー改善 | 低 | 高 |
| 16 | DLボタン全幅化 + 成功アニメーション | 低 | 中 |
| 17 | エラー時リトライボタン追加 | 低 | 中 |
| 18 | モバイルパディング調整 | 低 | 中 |
| 19 | 変換実績カウンター | 中 | 高 |
| 20 | 残り3回以下ソフトアップセル | 低 | 中 |
| 21 | 専用変換ページでドロップ即変換 | 中 | 高 |
| 22 | 変換前後ファイルサイズ比較表示 | 低 | 中 |
| 23 | LCP改善（英語ページ17% Poor対応） | 中 | 中 |

#### 投稿基盤（5 Issue）— team_salary リポジトリでPR

| # | Issue | 内容 |
|---|-------|------|
| 24 | マルチ投稿スクリプト基盤 | src/publishers/ ディレクトリ、統合CLI、Markdown frontmatter管理 |
| 25 | Zenn GitHub連携セットアップ | Zennリポジトリ連携設定、記事ディレクトリ構成 |
| 26 | Qiita API投稿実装 | Qiita API v2 クライアント |
| 27 | Dev.to API投稿実装 | Dev.to API クライアント |
| 28 | Hashnode API投稿実装 | Hashnode GraphQL API クライアント |

### E11: 集客・グロース施策（Phase 3）

#### コンテンツ配信（4 Issue）

| # | Issue | 内容 |
|---|-------|------|
| 29 | 技術記事①: 技術スタック全公開 | Next.js + CF Pages + Hono + Sharp on Cloud Run |
| 30 | 技術記事②: WebP/AVIF/HEIC比較2026 | ファイルサイズ・画質の実データ付き比較 |
| 31 | 技術記事③: 月額0円SaaS構築 | Cloudflare無料枠活用の実例 |
| 32 | 各記事の4プラットフォーム同時投稿 | 投稿スクリプトで Zenn/Qiita/Dev.to/Hashnode |

#### SNS/コミュニティ（3 Issue）

| # | Issue | 内容 |
|---|-------|------|
| 33 | Twitter/X ローンチ投稿 | #個人開発 タグ、ビフォーアフター画像付き |
| 34 | Reddit投稿 | r/webdev, r/SideProject にストーリー形式 |
| 35 | AlternativeTo.net登録 | Convertio/TinyPNG/Squooshの代替として登録 |

#### Product Hunt（4 Issue）

| # | Issue | 内容 |
|---|-------|------|
| 36 | PH メーカーアカウント準備 | アカウント作成、他プロダクトへの投票で実績作り |
| 37 | デモGIF作成 | 変換の速さを視覚化するGIF/動画 |
| 38 | Product Hunt ローンチ実行 | 火-木 PST 00:01 投稿、First Comment準備 |
| 39 | HackerNews Show HN投稿 | 技術的深さを強調した投稿 |

#### 効果測定（2 Issue）

| # | Issue | 内容 |
|---|-------|------|
| 40 | Phase完了時アナリティクス再測定 | GA4 + Search Console + CF Web Analytics の全指標再確認 |
| 41 | KPI定義と測定ダッシュボード | 主要KPIの定期確認フロー確立 |

## 成功基準

### E9: テクニカルSEO修正

| KPI | 現状 | 目標 | 計測方法 |
|-----|------|------|---------|
| インデックス済みページ数 | 8 | 100+ | Search Console |
| canonical URL一致 | quickconv.io（不一致） | quickconv.cc（一致） | ソースコード + HTML出力確認 |

### E10: コンテンツ + UX強化

| KPI | 現状 | 目標 | 計測方法 |
|-----|------|------|---------|
| 変換ページ平均コンテンツ量 | ~50語 | 300語+ | 実測 |
| FAQPage リッチリザルト対応 | 0ページ | 16ページ | Search Console |
| ガイド記事数 | 1 | 4+ | 実測 |
| Core Web Vitals LCP Good率 | 83% | 95%+ | CF Web Analytics |
| 投稿スクリプト対応PF | 0 | 4（Zenn/Qiita/Dev.to/Hashnode） | 実測 |

### E11: 集客・グロース施策

| KPI | 現状 | 目標 | 計測方法 |
|-----|------|------|---------|
| 日次ビジット（ボット除外） | 14 | 100+ | CF Web Analytics |
| Search Consoleクリック/月 | ~5 | 100+ | Search Console |
| 技術記事公開数 | 0 | 3+ | 各プラットフォーム |
| Product Hunt投稿 | 未実施 | 完了 | Product Hunt |

## 技術的実装方針

### canonical URL修正（E9）

5ファイルの `quickconv.io` → `quickconv.cc` 置換。修正後 `pnpm build` で全HTMLのcanonical/hreflang/OG URLを検証。

### 変換ページコンテンツ強化（E10）

- i18nメッセージファイル（`messages/ja.json`, `messages/en.json`）にFAQ・説明文追加
- `ConvertPageContent` コンポーネントにFAQ/説明/比較表セクション追加
- `json-ld.tsx` に `generateFAQSchema()` 追加

### UX改善（E10）

- 既存コンポーネント拡張: `conversion-card.tsx`, `hero.tsx` 等
- 変換実績カウンター: D1から `SELECT COUNT(*)` 取得、Workers APIエンドポイント追加

### 投稿スクリプト（E10 → team_salary リポジトリ）

- **リポジトリ**: `miyashita337/team_salary`
- **実装場所**: `src/publishers/`
- **構成**: 各PFのAPI Client（`zenn.ts`, `qiita.ts`, `devto.ts`, `hashnode.ts`）
- **統合CLI**: `npx ts-node src/publish.ts --file article.md --platforms all`
- **メタデータ管理**: Markdown frontmatter（title, tags, lang, platforms）
- **認証**: `.env`（`QIITA_TOKEN`, `DEVTO_API_KEY`, `HASHNODE_TOKEN`）
- **ワークフロー**: `main` から feature ブランチ → PR作成 → ユーザー承認

### 記事コンテンツ（E11）

- 記事ソース: `docs/articles/` に Markdown 管理
- UTMパラメータ: 既存 `utm.ts` 活用で自動付与
- 画像: `docs/articles/images/` に格納

## 運用ルール

### セッション管理

- 各エピックは別セッションで実装
- Issue着手時: `gh issue edit <N> --add-label in-progress`
- PRマージ時: `Closes #XX` 必須
- team_salary の投稿スクリプト Issue は team_salary リポジトリで PR

### 調査・レビュー

- フェーズ完了時の効果測定: AgentTeams招集
- コードレビュー: code-reviewer エージェント

### 依存関係

```
E9（Phase 1）→ E10（Phase 2）→ E11（Phase 3）
                    └── 投稿基盤 → 記事配信
```

## 参考: AgentTeams 会議結果

5名の専門家（SEOストラテジスト、グロースマーケター、コンテンツマーケター、UX/CRO専門家、競合分析アナリスト）の提案を統合。詳細は各エージェントの出力を参照。

### 主要競合との差別化

| 競合 | QuickConvの優位性 |
|------|------------------|
| Convertio | 日本語ネイティブ、登録不要、価格が半額以下 |
| iLoveIMG | AVIF対応、品質比較プレビュー |
| TinyPNG | HEIC対応、フォーマット変換（圧縮ではなく） |
| Squoosh | HEIC対応、バッチ処理、サーバーサイド変換 |
| CloudConvert | シンプルUI、一般ユーザー向け |
