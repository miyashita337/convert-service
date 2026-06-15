---
title: "iPhoneのHEIC画像をJPGに変換する方法【無料・登録不要】"
qiita_item_id: "e08043a14ca91b357e65"
tags: ["iPhone", "画像変換", "個人開発", "HEIC", "QuickConv"]
archived_reason: "HEIC→JPG カニバリ解消で stub 化した旧記事の原文退避 (会長指示 2026-06-15)"
---

![HEIC→JPG変換](https://raw.githubusercontent.com/miyashita337/convert-service/main/docs/blog-assets/192/header-heic-to-jpg.png)

iPhoneで撮った写真をWindowsで開こうとしたら「このファイルは開けません」と表示された経験はありませんか？

原因は**HEIC**という画像フォーマット。この記事では、HEICをJPGにワンクリックで変換する方法を紹介します。

## HEICとは？

iOS 11（2017年）以降、iPhoneのカメラはデフォルトで**HEIC（High Efficiency Image Container）**フォーマットで撮影します。

| 比較項目 | HEIC | JPG |
|---|---|---|
| ファイルサイズ | 小さい（JPGの約半分） | 大きい |
| 画質 | 高い | 同等〜やや劣る |
| 透過 | 対応 | 非対応 |
| Windows対応 | △ | ◎ |
| SNS対応 | △ | ◎ |

HEICは優れたフォーマットですが、**互換性に問題がある**のが現状です。

## HEIC→JPG変換の方法3選

### 方法1: QuickConvで変換（おすすめ）

- **登録不要**（メールアドレスも不要）
- **24時間でファイル自動削除**（プライバシー安心）
- **ドラッグ&ドロップだけ**

### QuickConvでの操作手順

**Step 1: quickconv.cc にアクセス**

ブラウザで [quickconv.cc](https://quickconv.cc) を開きます。ドロップゾーンと人気の変換一覧が表示されます。

![Step1: QuickConvトップページ](https://raw.githubusercontent.com/miyashita337/convert-service/main/docs/blog-assets/192/real-step1-top.png)

**Step 2: HEICファイルをアップロードしてフォーマットを選択**

ファイルをドラッグ&ドロップすると、ファイル名が表示され、出力フォーマットの選択ボタン（jpg / webp / avif 等）が表示されます。

![Step2: ファイルアップロード後のフォーマット選択画面](https://raw.githubusercontent.com/miyashita337/convert-service/main/docs/blog-assets/192/real-step2-format-select.png)

**Step 3: 変換完了 → ダウンロード**

「jpg」ボタンをクリックすると変換が開始され、数秒で完了します。「ダウンロード」ボタンが表示されるのでクリックして保存します。

![Step3: 変換完了後のダウンロード画面](https://raw.githubusercontent.com/miyashita337/convert-service/main/docs/blog-assets/192/real-step3-result.png)

### 方法2: iPhoneの設定を変更する

今後の撮影をJPGにする場合：
1. **設定** → **カメラ** → **フォーマット**
2. 「**互換性優先**」を選択

ただし、既に撮影済みのHEICファイルには効果なし。

### 方法3: macOSのプレビュー.appで変換

1. HEICファイルをプレビューで開く
2. **ファイル** → **書き出す** → JPEG選択

1枚ずつなので大量変換には不向き。

## よくある質問

**Q: 変換すると画質は劣化する？**
→ 高品質設定なら肉眼ではほぼわかりません。QuickConvはデフォルトで高品質。

**Q: 複数ファイルを一括変換できる？**
→ Freeプランで最大3枚同時変換。

**Q: アップロードしたファイルは安全？**
→ 24時間で自動削除。永続保存なし。

## 方法比較

| 方法 | 手軽さ | 既存ファイル対応 | 大量変換 |
|---|---|---|---|
| **QuickConv** | ◎ | ◎ | ○ |
| iPhone設定変更 | ○ | ✗ | — |
| macOSプレビュー | △ | ◎ | ✗ |

## まとめ

HEICファイルの変換に困ったら、[QuickConv](https://quickconv.cc) を試してみてください。登録不要で今すぐ使えます。

## 技術メモ

QuickConvの変換エンジンはSharp（libvips）をGCP Cloud Run上で動かしています。HEICのデコードにはlibheifを使用。Cloudflare R2でエグレス無料のストレージを実現しています。

