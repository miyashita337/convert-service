# QuickConv — Product Hunt Launch Drafts

URL: https://quickconv.cc
Launch target: Product Hunt (https://www.producthunt.com)

---

## 1. Tagline（60文字以内、3案）

**案A（推奨）**
> Convert WebP, AVIF & HEIC — instantly, free, no sign-up needed.

*58文字。"no sign-up" は PH で好まれるフレーズ。次世代フォーマット特化を前面に。*

**案B**
> The fast, free converter for next-gen image formats: WebP, AVIF, HEIC.

*70文字 → 60文字制限を超えるため要短縮 → 参考案として保持*

**案C**
> Free WebP ↔ AVIF ↔ HEIC converter with before/after quality preview.

*68文字 → 短縮版: "WebP · AVIF · HEIC converter with live quality preview — free."（60文字）*

**最終推奨 Tagline:**
```
Convert WebP, AVIF & HEIC — instantly, free, no sign-up needed.
```

---

## 2. Description（260文字以内、1案）

```
QuickConv is a free, browser-based converter built for next-gen image formats.
Convert between WebP, AVIF, and HEIC in seconds — no account, no watermarks.

Key features:
• Before/after quality preview — see exactly what you're getting
• Batch convert up to 3 images at once (free tier)
• 10 conversions/day free; paid plans from ¥380/month
• Japanese & English UI

Built solo on Cloudflare Workers + GCP Cloud Run. Feedback very welcome!
```

*文字数: 約260文字（英語）。箇条書きで PH の視覚スキャンに対応。個人開発の文脈を末尾に添えてストーリー性を付与。*

---

## 3. First Comment（メーカーとしての最初のコメント、1案）

```
Hey Product Hunt! 👋 I'm Harie, the solo developer behind QuickConv.

I built this because I kept running into the same frustration: converting a HEIC photo from my iPhone to WebP for a blog post required either janky desktop apps or overloaded online tools with ads everywhere — and none of them showed me whether the quality was actually acceptable before I downloaded.

So I built QuickConv with two obsessions in mind:
1. **Zero friction** — open the URL, drop your file, done. No account, no email, no dark patterns.
2. **Quality transparency** — the before/after preview slider lets you judge compression quality with your own eyes before committing to a download.

On the technical side: the whole stack runs on Cloudflare Workers + Pages (free tier) and GCP Cloud Run, so operating costs are essentially $0. That lets me keep the free tier genuinely useful rather than crippled.

This is a very early launch — I'd love brutal honest feedback:
- Are there formats you wish I supported? (JPEG XL? RAW?)
- Does the quality preview actually help your workflow?
- Any UX friction points?

Thanks for checking it out. Every upvote and comment helps a solo dev enormously. 🙏
```

---

## 4. Topics / Tags（Product Hunt カテゴリ選択）

Product Hunt では最大5つのトピックを選択できます。推奨順：

| 優先度 | Tag | 理由 |
|--------|-----|------|
| 1 | **Productivity** | 作業効率化ツールとして最大母集団 |
| 2 | **Design Tools** | デザイナー・ブロガーがターゲット |
| 3 | **Developer Tools** | 技術的背景・API展開を見据えて |
| 4 | **Photo & Video** | 画像変換の直接カテゴリ |
| 5 | **Open Source** / **No-Code** | 将来対応 or 登録不要を強調する場合 |

**推奨セット:** Productivity / Design Tools / Photo & Video / Developer Tools / Open Source

---

## 5. Launch Checklist（ローンチ当日にやること）

### 前日まで（T-1）
- [ ] Product Hunt アカウントを作成／プロフィール画像・bio を設定（maker として認証）
- [ ] Gallery 画像を用意（最低3枚、推奨5枚）
  - [ ] Hero: ツールのスクリーンショット（OGP 比率 1270×760px）
  - [ ] 変換フロー GIF（ドロップ → 変換 → DL の3ステップ）
  - [ ] Before/After プレビュースライダーのデモ GIF
  - [ ] モバイル表示スクリーンショット（日本語 / 英語）
  - [ ] 料金プランの比較表スクリーンショット
- [ ] Thumbnail（240×240px 正方形ロゴ）を用意
- [ ] 本番環境が安定していることを確認（負荷テスト）
- [ ] PH のドラフトを作成・保存（Tagline / Description / Gallery すべて入力）
- [ ] First Comment の文章を手元に保存しておく（投稿直後すぐ貼れるように）

### ローンチ当日（太平洋時間 0:01 AM = JST 17:01 に投稿）
- [ ] **0:01 AM PT（JST 17:01）に投稿**（PH は PT でリセット。早い時間帯ほど1日の露出が長い）
- [ ] 投稿直後に First Comment を投稿（maker コメントは早いほど目立つ）
- [ ] SNS でシェア
  - [ ] X (Twitter) に投稿 — PH リンクを貼る
  - [ ] Hacker News "Show HN" 投稿（別日が望ましいが同日もOK）
  - [ ] 個人ブログ・Zenn / Qiita に開発記事を投稿
- [ ] 友人・知人に PH リンクを直接送りアップボート依頼（5〜10人程度）
  - ※ PH は「SNS でのシェア依頼」より「直接 DM」が効果的
- [ ] コメントへの返信を1日中こまめに行う（レスポンス速度が注目度に影響）
- [ ] 英語コミュニティ（Reddit r/webdev, r/selfhosted 等）でもシェア

### ローンチ翌日（T+1）
- [ ] PH 結果を記録（順位・アップボート数・コメント数）
- [ ] フィードバックを Issue 化してロードマップに反映
- [ ] 結果をブログ／X でシェア（透明性は PH コミュニティに好まれる）

---

## 補足メモ

- **ローンチ時間**: 太平洋時間 0:01 AM（= JST 17:01）が鉄板。1日の露出が最大化される。
- **ハンターを立てる**: 自分で Hunter にもなれるが、フォロワーが多い PH インフルエンサーに事前にアプローチするとトップ掲載の可能性が上がる。
- **価格の見せ方**: Free tier を前面に出し、有料は「制限を外す」として位置づけると PH ユーザーには刺さりやすい。
- **個人開発ストーリー**: "built by one person" は PH で非常に好まれる。First Comment に明示済み。
- **日本語対応**: 英語コミュニティがメインだが、日本語対応は差別化ポイントとしてDescription に1行入れた。
