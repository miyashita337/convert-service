# 技術記事ドラフト

## Zenn 記事: Cloudflare Workers + Sharp で画像変換サービスを作った

### タイトル
WebP/AVIF/HEIC の相互変換を Cloudflare Workers + GCP Cloud Run で実装した話

### 概要（150字）
次世代画像フォーマット（WebP, AVIF, HEIC）の相互変換サービス QuickConv の技術スタックと設計判断を解説。Cloudflare Workers, R2, D1, GCP Cloud Run (Sharp) のアーキテクチャ。

### 構成
1. **なぜ作ったか** — HEIC の互換性問題、WebP/AVIF の普及
2. **アーキテクチャ全体像** — Workers → Cloud Run → R2 の流れ
3. **Workers の制約と回避策** — Native module 不可 → Cloud Run に分離
4. **R2 のメリット** — エグレス無料、24h ライフサイクル
5. **D1 でのレート制限** — SHA-256 ハッシュでプライバシー保護
6. **Stripe 決済の Workers 実装** — nodejs_compat フラグ
7. **Next.js 静的エクスポート on Pages** — SSR 不要の判断
8. **コスト** — 月額 $0 で始められる構成
9. **まとめ**

### タグ
cloudflare, workers, sharp, webp, avif, heic, 個人開発

### UTM
https://quickconv.cc/?utm_source=zenn&utm_medium=referral&utm_campaign=guide

---

## Qiita 記事: iPhone の HEIC をブラウザで WebP/AVIF に変換する方法

### タイトル
iPhoneのHEIC写真をブラウザだけでWebP/AVIFに一括変換する方法

### 概要
iPhone で撮った HEIC 写真を、ソフト不要・ブラウザだけで WebP や AVIF に変換する方法を解説。QuickConv を使った具体的な手順と、技術的な裏側も紹介。

### 構成
1. **HEIC とは** — iPhone 標準フォーマット、互換性の問題
2. **なぜ WebP/AVIF に変換するのか** — ファイルサイズ比較
3. **QuickConv での変換手順** — スクリーンショット付き
4. **技術裏話** — Sharp での HEIC デコード
5. **プライバシーへの配慮** — 24h 自動削除
6. **まとめ**

### タグ
heic, webp, avif, iphone, 画像変換

### UTM
https://quickconv.cc/?utm_source=qiita&utm_medium=referral&utm_campaign=guide
