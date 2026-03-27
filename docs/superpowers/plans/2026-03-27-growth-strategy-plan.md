# QuickConv 集客・成長戦略 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** QuickConvのSEOバグ修正、コンテンツ/UX強化、集客施策を3フェーズで実行し、日次ビジット14→100+を達成する

**Architecture:** 3エピック構成（E9: テクニカルSEO → E10: コンテンツ+UX → E11: 集客）。各エピックはGitHub Issueで管理し、別セッションで実装。投稿スクリプトはteam_salaryサブモジュール（別リポジトリPR）

**Tech Stack:** Next.js (App Router), next-intl, Tailwind CSS, shadcn/ui, Vitest, Playwright, Hono (Workers), D1, team_salary (TypeScript/Playwright)

**Spec:** `docs/superpowers/specs/2026-03-27-growth-strategy-design.md`

---

## Phase 0: GitHub Issue/Epic 作成

### Task 0: エピック・サブIssue一括作成

**Files:**
- Reference: `docs/superpowers/specs/2026-03-27-growth-strategy-design.md`

- [ ] **Step 1: E9エピック作成**

```bash
gh issue create --title "E9: テクニカルSEO修正（Phase 1）" \
  --body "$(cat <<'EOF'
## 概要
canonical URLバグ修正（quickconv.io → quickconv.cc）によるインデックス解放。

## 背景
`SITE_URL = "https://quickconv.io"` が5ファイルに残っており、全ページのcanonical/hreflang/OG URLが存在しないドメインを指している。180+ページ中8ページしかインデックスされない最大原因。

## 成功基準
- [ ] インデックス済みページ: 8 → 100+（2-4週間後確認）
- [ ] canonical URL: 全ページで quickconv.cc を指す
- [ ] ビルド成功 + E2Eテスト全PASS

## サブIssue
作成後にリンク

## 参照
- Spec: docs/superpowers/specs/2026-03-27-growth-strategy-design.md
- Plan: docs/superpowers/plans/2026-03-27-growth-strategy-plan.md
EOF
)" --label "epic,p0"
```

- [ ] **Step 2: E9サブIssue 4件作成**

```bash
# E9-1: canonical URL修正
gh api repos/miyashita337/convert-service/issues \
  -f title="fix(seo): canonical URL修正 quickconv.io → quickconv.cc" \
  -f body="$(cat <<'EOF'
## 親Issue
E9: テクニカルSEO修正

## 対象ファイル
- `apps/web/src/lib/metadata.ts:4` — `SITE_URL`
- `apps/web/src/components/json-ld.tsx:3` — `SITE_URL`
- `apps/web/src/lib/utm.ts:19` — `SITE_URL` + L16コメント
- `apps/web/src/messages/en.json:159` — `privacy@quickconv.io`
- `apps/web/src/messages/ja.json:152` — `privacy@quickconv.io`

## AC
- [ ] 5ファイルすべてで `quickconv.io` → `quickconv.cc` に置換
- [ ] `pnpm build` 成功
- [ ] ビルド出力HTML内に `quickconv.io` が含まれないこと（grep確認）
- [ ] E2Eテスト全PASS
EOF
)" -f "labels[]=p0" -f "labels[]=bug"

# E9-2: サイトマップ再送信
gh api repos/miyashita337/convert-service/issues \
  -f title="chore(seo): Search Consoleサイトマップ再送信 + 再クロール" \
  -f body="$(cat <<'EOF'
## 親Issue
E9: テクニカルSEO修正

## 作業内容
1. Search Consoleで `sitemap.xml` を再送信
2. 主要10 URLの「URL検査」→「インデックス登録をリクエスト」
3. 対象: /, /ja, /en, /ja/convert/heic-to-jpg, /en/convert/heic-to-jpg, /ja/convert/png-to-webp, /en/convert/png-to-webp, /ja/convert/avif-to-jpg, /ja/guide, /en/guide

## AC
- [ ] サイトマップ送信ステータス: 成功
- [ ] 主要10 URLのクロールリクエスト完了
EOF
)" -f "labels[]=p0" -f "labels[]=chore"

# E9-3: インデックスモニタリング
gh api repos/miyashita337/convert-service/issues \
  -f title="chore(seo): インデックス数モニタリング（2週間後確認）" \
  -f body="$(cat <<'EOF'
## 親Issue
E9: テクニカルSEO修正

## 作業内容
canonical修正デプロイ後2週間（2026-04-10頃）にSearch Consoleで確認:
1. インデックス済みページ数
2. 検索クエリの表示回数変化
3. 新規インデックスされたページ一覧

## AC
- [ ] インデックス数が50+に増加
- [ ] 結果をIssueコメントに記録
EOF
)" -f "labels[]=p0" -f "labels[]=chore"

# E9-4: GA4計測改善
gh api repos/miyashita337/convert-service/issues \
  -f title="feat(analytics): GA4 Cookie同意不要の基本計測実装" \
  -f body="$(cat <<'EOF'
## 親Issue
E9: テクニカルSEO修正

## 背景
GA4はCookie同意後にのみ発火するため、CF Web Analytics（14ビジット/日）とGA4（0）で大きな乖離がある。

## 検討案
1. GA4の consent mode v2 を使い、同意前でもcookielessで基本計測
2. CF Web Analyticsを主計測に切り替え、GA4は補助に
3. 現状維持（CF Web Analyticsで十分）

## AC
- [ ] 計測方針を決定しIssueに記録
- [ ] 選択した方針を実装（必要な場合）
EOF
)" -f "labels[]=p0" -f "labels[]=feat"
```

- [ ] **Step 3: E10エピック作成**

```bash
gh issue create --title "E10: コンテンツ + UX強化（Phase 2）" \
  --body "$(cat <<'EOF'
## 概要
SEOコンテンツ拡充（変換ページ強化 + ガイド記事）、UX/CRO改善（11項目）、マルチ投稿スクリプト基盤構築。

## 成功基準
- [ ] 変換ページ平均コンテンツ量: ~50語 → 300語+
- [ ] FAQPage リッチリザルト対応: 0 → 16ページ
- [ ] ガイド記事数: 3 → 6+
- [ ] Core Web Vitals LCP Good率: 83% → 95%+
- [ ] 投稿スクリプト: 4PF対応（Zenn/Qiita/Dev.to/Hashnode）

## サブカテゴリ
### SEOコンテンツ（8 Issue）
変換ページテンプレート強化、FAQスキーマ、コンテンツ展開、ガイド記事、内部リンク

### UX/CRO改善（11 Issue）
ベネフィットバッジ、広告位置、ヒーローコピー、DLボタン、リトライ、モバイル、カウンター、アップセル、即変換、サイズ比較、LCP

### 投稿基盤（5 Issue）— team_salary リポジトリ
マルチ投稿CLI、Zenn/Qiita/Dev.to/Hashnode API実装

## 依存
E9（Phase 1）完了後に着手

## 参照
- Spec: docs/superpowers/specs/2026-03-27-growth-strategy-design.md
EOF
)" --label "epic,p0"
```

- [ ] **Step 4: E10サブIssue 24件作成**

以下のコマンドで一括作成（SEOコンテンツ8件 + UX/CRO 11件 + 投稿基盤5件）。
各Issueの詳細bodyは長大なため、実行セッションでスペックを参照して作成する。

```bash
# SEOコンテンツ Issues
for issue in \
  "feat(seo): 変換ページテンプレート強化（FAQ/説明/比較表セクション追加）" \
  "feat(seo): FAQPage JSON-LDスキーマ追加" \
  "feat(seo): 主要10変換ページコンテンツ展開" \
  "feat(seo): 残り変換ページコンテンツ展開" \
  "docs: ガイド記事 HEIC変換完全ガイド" \
  "docs: ガイド記事 ブログ画像最適化ガイド" \
  "feat(seo): 内部リンク構造最適化" \
  "docs: ガイド記事コンテンツカレンダー策定"; do
  gh api repos/miyashita337/convert-service/issues \
    -f title="$issue" -f body="E10サブIssue。詳細はSpec参照。" \
    -f "labels[]=p0" -f "labels[]=feat"
done

# UX/CRO Issues
for issue in \
  "feat(ux): ベネフィットバッジ追加（3秒変換/登録不要/自動削除）" \
  "fix(ux): 広告位置をDLボタン下に移動" \
  "feat(ux): ヒーローコピー改善（具体的ペインに訴求）" \
  "feat(ux): DLボタン全幅化 + 成功アニメーション" \
  "feat(ux): エラー時リトライボタン追加" \
  "fix(ux): モバイルパディング調整" \
  "feat(ux): 変換実績カウンター（社会的証明）" \
  "feat(ux): 残り3回以下ソフトアップセル表示" \
  "feat(ux): 専用変換ページでドロップ即変換" \
  "feat(ux): 変換前後ファイルサイズ比較表示" \
  "perf: LCP改善（英語ページ17% Poor対応）"; do
  gh api repos/miyashita337/convert-service/issues \
    -f title="$issue" -f body="E10サブIssue。詳細はSpec参照。" \
    -f "labels[]=p0"
done

# 投稿基盤 Issues（convert-serviceリポで管理、実装はteam_salary PR）
for issue in \
  "feat(tools): マルチ投稿スクリプト基盤（team_salary PR）" \
  "feat(tools): Zenn GitHub連携セットアップ" \
  "feat(tools): Qiita API投稿実装（team_salary PR）" \
  "feat(tools): Dev.to API投稿実装（team_salary PR）" \
  "feat(tools): Hashnode API投稿実装（team_salary PR）"; do
  gh api repos/miyashita337/convert-service/issues \
    -f title="$issue" -f body="E10サブIssue。実装はteam_salaryリポジトリでPR。詳細はSpec参照。" \
    -f "labels[]=p0" -f "labels[]=feat"
done
```

- [ ] **Step 5: E11エピック + サブIssue 13件作成**

```bash
gh issue create --title "E11: 集客・グロース施策（Phase 3）" \
  --body "$(cat <<'EOF'
## 概要
技術記事配信（4PF同時投稿）、SNS/コミュニティ展開、Product Huntローンチ。

## 成功基準
- [ ] 日次ビジット: 14 → 100+
- [ ] Search Consoleクリック/月: ~5 → 100+
- [ ] 技術記事: 3本以上公開
- [ ] Product Hunt: ローンチ完了

## 依存
E10（Phase 2）完了後に着手

## 参照
- Spec: docs/superpowers/specs/2026-03-27-growth-strategy-design.md
EOF
)" --label "epic,p0"

# コンテンツ配信
for issue in \
  "docs: 技術記事① 個人開発で画像変換SaaS技術スタック全公開" \
  "docs: 技術記事② WebP/AVIF/HEIC徹底比較2026" \
  "docs: 技術記事③ 月額0円SaaS構築（Cloudflare無料枠）" \
  "chore: 各記事の4プラットフォーム同時投稿実行"; do
  gh api repos/miyashita337/convert-service/issues \
    -f title="$issue" -f body="E11サブIssue。詳細はSpec参照。" \
    -f "labels[]=p0"
done

# SNS/コミュニティ
for issue in \
  "chore: Twitter/X #個人開発 ローンチ投稿" \
  "chore: Reddit投稿（r/webdev, r/SideProject）" \
  "chore: AlternativeTo.net登録"; do
  gh api repos/miyashita337/convert-service/issues \
    -f title="$issue" -f body="E11サブIssue。詳細はSpec参照。" \
    -f "labels[]=p0"
done

# Product Hunt
for issue in \
  "chore: Product Huntメーカーアカウント準備" \
  "feat: デモGIF作成（変換速度視覚化）" \
  "chore: Product Huntローンチ実行" \
  "chore: HackerNews Show HN投稿"; do
  gh api repos/miyashita337/convert-service/issues \
    -f title="$issue" -f body="E11サブIssue。詳細はSpec参照。" \
    -f "labels[]=p0"
done

# 効果測定
for issue in \
  "chore: Phase完了時アナリティクス再測定" \
  "feat: KPI定義と測定ダッシュボード"; do
  gh api repos/miyashita337/convert-service/issues \
    -f title="$issue" -f body="E11サブIssue。詳細はSpec参照。" \
    -f "labels[]=p0"
done
```

- [ ] **Step 6: 親IssueにサブIssueリンクを追加**

各エピックIssueのbodyを更新し、サブIssueへのリンク（`#XX`）を追記。

- [ ] **Step 7: コミット**

```bash
git add docs/superpowers/specs/2026-03-27-growth-strategy-design.md docs/superpowers/plans/2026-03-27-growth-strategy-plan.md
git commit -m "$(cat <<'EOF'
docs: add growth strategy spec and implementation plan

E9/E10/E11の3エピック構成で集客・成長戦略を策定。
- E9: テクニカルSEO修正（canonical URLバグ修正）
- E10: コンテンツ + UX強化（24 Issue）
- E11: 集客・グロース施策（13 Issue）
EOF
)"
```

---

## Phase 1: E9 テクニカルSEO修正

### Task 1: canonical URL修正（quickconv.io → quickconv.cc）

**Files:**
- Modify: `apps/web/src/lib/metadata.ts:4`
- Modify: `apps/web/src/components/json-ld.tsx:3`
- Modify: `apps/web/src/lib/utm.ts:16,19`
- Modify: `apps/web/src/messages/en.json:159`
- Modify: `apps/web/src/messages/ja.json:152`

- [ ] **Step 1: 現状確認 — quickconv.io の全出現箇所を検索**

```bash
grep -rn "quickconv\.io" apps/web/src/
```

Expected: 5-6ファイルにヒット

- [ ] **Step 2: metadata.ts を修正**

```typescript
// apps/web/src/lib/metadata.ts:4
// Before:
const SITE_URL = "https://quickconv.io";
// After:
const SITE_URL = "https://quickconv.cc";
```

- [ ] **Step 3: json-ld.tsx を修正**

```typescript
// apps/web/src/components/json-ld.tsx:3
// Before:
const SITE_URL = "https://quickconv.io";
// After:
const SITE_URL = "https://quickconv.cc";
```

- [ ] **Step 4: utm.ts を修正**

```typescript
// apps/web/src/lib/utm.ts:16 (コメント内)
// Before:
//   https://quickconv.io/?utm_source=twitter...
// After:
//   https://quickconv.cc/?utm_source=twitter...

// apps/web/src/lib/utm.ts:19
// Before:
const SITE_URL = "https://quickconv.io";
// After:
const SITE_URL = "https://quickconv.cc";
```

- [ ] **Step 5: messages/en.json を修正**

```json
// Before (line 159):
"rightsContact": "To exercise these rights, please contact us at privacy@quickconv.io."
// After:
"rightsContact": "To exercise these rights, please contact us at privacy@quickconv.cc."
```

- [ ] **Step 6: messages/ja.json を修正**

```json
// Before (line 152):
"rightsContact": "これらの権利を行使するには、privacy@quickconv.io までご連絡ください。"
// After:
"rightsContact": "これらの権利を行使するには、privacy@quickconv.cc までご連絡ください。"
```

- [ ] **Step 7: 修正後の検証 — quickconv.io が残っていないことを確認**

```bash
grep -rn "quickconv\.io" apps/web/src/
```

Expected: 0 hits

- [ ] **Step 8: ビルド検証**

```bash
pnpm build
```

Expected: ビルド成功

- [ ] **Step 9: ビルド出力のcanonical URL検証**

```bash
grep -r "quickconv\.io" apps/web/out/ | head -5
grep -c "quickconv\.cc" apps/web/out/en/index.html
```

Expected: quickconv.io = 0 hits, quickconv.cc = 複数ヒット

- [ ] **Step 10: コミット**

```bash
git add apps/web/src/lib/metadata.ts apps/web/src/components/json-ld.tsx apps/web/src/lib/utm.ts apps/web/src/messages/en.json apps/web/src/messages/ja.json
git commit -m "fix(seo): canonical URL修正 quickconv.io → quickconv.cc

全ページのcanonical/hreflang/OG URLが存在しないドメイン(quickconv.io)を
指していた致命的バグを修正。インデックス数 8 → 180+ の改善を期待。

Closes #XX"
```

### Task 2: GA4 Consent Mode v2 検討・実装

**Files:**
- Modify: `apps/web/src/components/google-analytics.tsx`

- [ ] **Step 1: 現在のGA4実装を確認**

```bash
cat apps/web/src/components/google-analytics.tsx
```

- [ ] **Step 2: GA4 consent mode v2 のデフォルト設定を追加**

GA4スクリプトの前に consent default を設定。Cookie同意前でもcookielessで基本計測が行われる:

```typescript
// google-analytics.tsx に追加（gtagスクリプト読み込み前）
// window.dataLayer に consent default を push
window.dataLayer = window.dataLayer || [];
function gtag(...args: unknown[]) { window.dataLayer.push(args); }
gtag('consent', 'default', {
  'analytics_storage': 'denied',
  'ad_storage': 'denied',
});
```

Cookie同意後に `gtag('consent', 'update', { 'analytics_storage': 'granted' })` を呼ぶ。

- [ ] **Step 3: ビルド + 動作確認**

```bash
pnpm build
```

- [ ] **Step 4: コミット**

```bash
git add apps/web/src/components/google-analytics.tsx
git commit -m "feat(analytics): GA4 consent mode v2 実装

Cookie同意前でもcookielessで基本計測を行い、
CF Web AnalyticsとGA4の乖離を縮小。

Closes #XX"
```

---

## Phase 2: E10 コンテンツ + UX強化

> 各Taskは別セッションで実装。以下はIssue単位の実装ガイド。

### Task 3: 変換ページテンプレート強化

**Files:**
- Create: `apps/web/src/components/convert-page-content.tsx`
- Modify: `apps/web/src/app/[locale]/convert/[slug]/page.tsx`
- Modify: `apps/web/src/messages/en.json` — `convertPages` namespace追加
- Modify: `apps/web/src/messages/ja.json` — `convertPages` namespace追加

- [ ] **Step 1: i18nメッセージに変換ページコンテンツ追加**

`messages/en.json` と `messages/ja.json` に `convertPages` namespaceを追加。各変換ペアごとにFAQ（3-5問）、フォーマット説明（200-300語）、比較表データを格納。

```json
{
  "convertPages": {
    "heic-to-jpg": {
      "about": "HEIC (High Efficiency Image Container) is Apple's default photo format...",
      "benefits": "Converting HEIC to JPG ensures universal compatibility...",
      "comparison": {
        "quality": "Lossy",
        "fileSize": "Smaller than PNG, larger than HEIC",
        "compatibility": "Universal"
      },
      "faq": [
        {
          "question": "Does converting HEIC to JPG reduce quality?",
          "answer": "There is minimal quality loss..."
        },
        {
          "question": "What is the maximum file size?",
          "answer": "QuickConv supports files up to 50MB..."
        },
        {
          "question": "Are my files safe?",
          "answer": "All files are automatically deleted after 24 hours..."
        }
      ]
    }
  }
}
```

- [ ] **Step 2: ConvertPageContent コンポーネント作成**

```tsx
// apps/web/src/components/convert-page-content.tsx
"use client";
import { useTranslations } from "next-intl";

interface ConvertPageContentProps {
  slug: string;
  from: string;
  to: string;
}

export function ConvertPageContent({ slug, from, to }: ConvertPageContentProps) {
  const t = useTranslations("convertPages");
  const key = slug; // e.g., "heic-to-jpg"

  return (
    <div className="mt-12 max-w-3xl mx-auto space-y-8">
      {/* About section */}
      <section>
        <h2 className="text-2xl font-semibold mb-3">
          About {from} to {to} Conversion
        </h2>
        <p className="text-muted-foreground">{t(`${key}.about`)}</p>
      </section>

      {/* Benefits */}
      <section>
        <h2 className="text-2xl font-semibold mb-3">Why Convert?</h2>
        <p className="text-muted-foreground">{t(`${key}.benefits`)}</p>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-2xl font-semibold mb-3">FAQ</h2>
        {/* FAQ items rendered from i18n */}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: convert/[slug]/page.tsx にコンポーネント追加**

```tsx
// apps/web/src/app/[locale]/convert/[slug]/page.tsx
// ConversionCard の下に追加:
<ConvertPageContent slug={slug} from={fromUpper} to={toUpper} />
```

- [ ] **Step 4: テスト + ビルド確認**
- [ ] **Step 5: コミット**

### Task 4: FAQPage JSON-LDスキーマ追加

**Files:**
- Modify: `apps/web/src/components/json-ld.tsx`
- Modify: `apps/web/src/app/[locale]/convert/[slug]/page.tsx`

- [ ] **Step 1: json-ld.tsx に FAQJsonLd コンポーネント追加**

```tsx
interface FAQItem {
  question: string;
  answer: string;
}

interface FAQJsonLdProps {
  items: FAQItem[];
}

export function FAQJsonLd({ items }: FAQJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
```

- [ ] **Step 2: convert/[slug]/page.tsx に FAQJsonLd 追加**
- [ ] **Step 3: ビルド + リッチリザルトテスト**
- [ ] **Step 4: コミット**

### Task 5-8: 変換ページコンテンツ展開 + ガイド記事

各変換ページのi18nコンテンツを messages/en.json, messages/ja.json に追加。
ガイド記事は既存の `guide/[slug]` パターンに従い、新スラグを追加。

既存ガイドスラグ: `what-is-avif`, `heic-to-jpg-guide`, `webp-vs-avif-vs-heic`
追加予定: `blog-image-optimization`

### Task 9-19: UX/CRO改善（11 Issue）

各Issueの実装ポイント:

| Task | 主要変更ファイル | 実装概要 |
|------|----------------|---------|
| 9 | `page.tsx` (home) | ドロップゾーン下に3アイコンバッジ追加 |
| 10 | `conversion-card.tsx:348` | AdSlot をDLボタン後に移動 |
| 11 | `messages/*.json` + `page.tsx` | tagline/description を具体的ペインに変更 |
| 12 | `conversion-card.tsx` | DLボタンに `w-full` + framer-motion成功アニメ |
| 13 | `conversion-card.tsx` | error state にリトライボタン追加 |
| 14 | `file-dropzone` | `p-12` → `p-6 md:p-12` |
| 15 | Workers API + `page.tsx` | `/api/stats` エンドポイント + カウンター表示 |
| 16 | `conversion-card.tsx` | `remainingCount <= 3` 時にインラインメッセージ |
| 17 | `convert/[slug]/page.tsx` | slug解析済みの場合、フォーマット自動選択 |
| 18 | `conversion-card.tsx` | 完了画面にサイズ比較テーブル追加 |
| 19 | `page.tsx`, 画像最適化 | LCP要素の最適化（priority loading等） |

### Task 20-24: 投稿基盤（team_salary PR）

**リポジトリ:** `miyashita337/team_salary`

- [ ] **Step 1: team_salary を最新mainに更新**

```bash
cd tools/team_salary && git checkout main && git pull origin main
```

- [ ] **Step 2: feature ブランチ作成**

```bash
git checkout -b feat/multi-platform-publisher
```

- [ ] **Step 3: src/publishers/ ディレクトリ構造作成**

```
src/publishers/
├── index.ts          # 統合CLI エントリポイント
├── types.ts          # 共通型定義
├── markdown-parser.ts # frontmatter パーサー
├── qiita.ts          # Qiita API v2 クライアント
├── devto.ts          # Dev.to API クライアント
├── hashnode.ts       # Hashnode GraphQL クライアント
└── zenn.ts           # Zenn GitHub連携ヘルパー
```

- [ ] **Step 4: types.ts 定義**

```typescript
export interface ArticleFrontmatter {
  title: string;
  titleEn?: string;
  tags: string[];
  lang: "ja" | "en";
  platforms: ("zenn" | "qiita" | "devto" | "hashnode")[];
  published?: boolean;
  slug?: string;
}

export interface PublishResult {
  platform: string;
  success: boolean;
  url?: string;
  error?: string;
}

export interface Publisher {
  name: string;
  publish(frontmatter: ArticleFrontmatter, content: string): Promise<PublishResult>;
}
```

- [ ] **Step 5: 各PFクライアント実装**

Qiita: `POST https://qiita.com/api/v2/items` (Bearer token)
Dev.to: `POST https://dev.to/api/articles` (api-key header)
Hashnode: GraphQL `https://gql.hashnode.com` (mutation publishPost)
Zenn: GitHub連携のため、`articles/` ディレクトリにmdファイルを生成

- [ ] **Step 6: 統合CLI実装**

```bash
npx tsx src/publishers/index.ts --file docs/articles/001-tech-stack.md --platforms all
```

- [ ] **Step 7: PR作成**

```bash
git add src/publishers/
git commit -m "feat: マルチプラットフォーム記事投稿基盤

Zenn/Qiita/Dev.to/Hashnode への記事同時投稿CLI。
Markdown frontmatter でメタデータ管理。"
gh pr create --title "feat: マルチプラットフォーム記事投稿基盤" \
  --body "QuickConv集客施策のための記事配信基盤。4PF対応。"
```

---

## Phase 3: E11 集客・グロース施策

### Task 25-27: 技術記事執筆

**Files:**
- Create: `docs/articles/001-tech-stack.md`
- Create: `docs/articles/002-format-comparison.md`
- Create: `docs/articles/003-zero-cost-saas.md`

各記事は以下のfrontmatter形式:

```markdown
---
title: "個人開発で画像変換SaaSを作った技術スタック全公開"
titleEn: "Building an Image Converter SaaS: Full Tech Stack Breakdown"
tags: ["個人開発", "Next.js", "Cloudflare", "SaaS"]
lang: ja
platforms: ["zenn", "qiita", "devto", "hashnode"]
---

# 個人開発で画像変換SaaSを作った技術スタック全公開

...記事本文...

---
QuickConvで実際に試す: https://quickconv.cc/?utm_source=zenn&utm_medium=social&utm_campaign=tech_article
```

### Task 28: 4PF同時投稿実行

投稿スクリプトで3記事を順次配信。UTMパラメータはPFごとに自動差し替え。

### Task 29-31: SNS/コミュニティ投稿

Twitter/X、Reddit、AlternativeTo.net への投稿。既存の `quickconv-sns-post.ts` を活用可能。

### Task 32-35: Product Hunt ローンチ

Phase 2完了後に実行。デモGIF作成 → アカウント準備 → ローンチ。

### Task 36-37: 効果測定

GA4 + Search Console + CF Web Analytics の全指標を再確認し、KPI達成状況をIssueに記録。

---

## 依存関係図

```
Task 0 (Issue作成)
    ↓
Task 1-2 (E9: canonical修正 + GA4)
    ↓
Task 3-19 (E10: コンテンツ + UX) ← 並列実行可
Task 20-24 (E10: 投稿基盤) ← 並列実行可
    ↓
Task 25-27 (E11: 記事執筆) → Task 28 (投稿実行)
Task 29-31 (E11: SNS) ← 並列実行可
    ↓
Task 32-35 (E11: Product Hunt) ← Phase 2完了後
    ↓
Task 36-37 (効果測定)
```

## 実行時の注意事項

1. **team_salary PRワークフロー**: `main` から feature ブランチ → PR → ユーザー承認後マージ → convert-service でサブモジュール更新
2. **Issue着手ルール**: `gh issue edit <N> --add-label in-progress`（他セッションとの衝突防止）
3. **PRルール**: `Closes #XX` 必須
4. **E2Eテスト**: 各Phase完了後に `E2E_TARGET=staging npx playwright test --project=production`
5. **make pre-git-check**: push前に必ず実行
