# UTM パラメータ設計

## 体系

| パラメータ | 値 | 説明 |
|---|---|---|
| `utm_source` | twitter, facebook, line, reddit, hackernews, producthunt, zenn, qiita, note, direct, email | 流入元 |
| `utm_medium` | social, referral, email, organic | チャネル種別 |
| `utm_campaign` | share, launch, guide, blog, newsletter | キャンペーン |
| `utm_content` | (任意) | 識別子（変換スラッグ等） |

## チャネル別設定

| チャネル | source | medium | campaign | 用途 |
|---|---|---|---|---|
| X シェアボタン | twitter | social | share | ユーザーによるシェア |
| Facebook シェア | facebook | social | share | ユーザーによるシェア |
| LINE シェア | line | social | share | ユーザーによるシェア |
| Reddit 投稿 | reddit | social | launch | r/webdev, r/SideProject |
| Hacker News | hackernews | social | launch | Show HN |
| Product Hunt | producthunt | referral | launch | PH ローンチ |
| Zenn 記事 | zenn | referral | guide | 技術記事 |
| Qiita 記事 | qiita | referral | guide | 技術記事 |
| note 記事 | note | referral | blog | ブログ記事 |
| コピーリンク | direct | social | share | クリップボードコピー |

## ヘルパー関数

`apps/web/src/lib/utm.ts` で `buildUtmUrl()` と `buildShareUtmUrl()` を提供。

## GA4 での確認

「トラフィック獲得」レポートで `utm_source` / `utm_medium` の組み合わせで分類される。
