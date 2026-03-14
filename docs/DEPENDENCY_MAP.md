# QuickConv 依存関係マップ

## エピック間の依存関係

```mermaid
graph LR
    E1["E1: フリーミアム制限<br/>#8"]
    E2["E2: AdSense<br/>#9"]
    E3["E3: Stripe課金<br/>#10"]
    E4["E4: SEO + GA4<br/>#11"]
    E5["E5: 初期集客<br/>#12"]
    E6["E6: 品質比較<br/>#13"]
    E7["E7: フォーマット拡張<br/>#68"]
    E8["E8: エラー監視<br/>#69"]

    E1 -->|制限がないと有料の意味なし| E3
    E1 -->|広告非表示の前提| E2
    E4 -->|ブログ記事がAdSense審査に必要| E2
    E4 -->|SEO基盤が集客の前提| E5
    E3 -->|有料プランが品質制限の前提| E6
    E1 -->|プラン別制限| E6
    E5 -->|OGP/シェアにSEO基盤| E4

    style E1 fill:#ff6b6b,color:#fff
    style E2 fill:#ffa94d,color:#fff
    style E3 fill:#ffd43b,color:#000
    style E4 fill:#69db7c,color:#000
    style E5 fill:#74c0fc,color:#000
    style E6 fill:#b197fc,color:#fff
    style E7 fill:#868e96,color:#fff
    style E8 fill:#868e96,color:#fff
```

## E1: フリーミアム制限 サブIssue依存関係

```mermaid
graph TD
    E1_1["#14 識別トークン発行MW<br/>S"]
    E1_2["#15 D1レート制限リポジトリ<br/>S"]
    E1_3["#16 APIレート制限適用<br/>S"]
    E1_4["#17 Cookie同意+Privacy Policy<br/>S"]
    E1_5["#18 残り回数表示<br/>M"]
    E1_6["#19 制限到達モーダル<br/>M"]
    E1_7["#20 バッチ制限UI<br/>M"]
    E1_8["#21 E2Eテスト<br/>M"]

    E1_1 --> E1_2
    E1_1 --> E1_4
    E1_2 --> E1_3
    E1_3 --> E1_5
    E1_5 --> E1_6
    E1_5 --> E1_7
    E1_3 --> E1_8
    E1_7 --> E1_8

    style E1_1 fill:#ff6b6b,color:#fff
    style E1_2 fill:#ff6b6b,color:#fff
    style E1_3 fill:#ff6b6b,color:#fff
    style E1_4 fill:#ffa94d,color:#fff
    style E1_5 fill:#ffd43b,color:#000
    style E1_6 fill:#ffd43b,color:#000
    style E1_7 fill:#ffd43b,color:#000
    style E1_8 fill:#69db7c,color:#000
```

## E2: AdSense サブIssue依存関係

```mermaid
graph TD
    E2_1["#22 必須ページ追加<br/>S"]
    E2_2["#23 AdSense申請・審査<br/>S"]
    E2_3["#24 広告コンポーネント実装<br/>S"]
    E2_4["#25 広告枠配置設計<br/>M"]
    E2_5["#26 有料ユーザー広告非表示<br/>M"]
    E2_6["#27 RPM初期最適化<br/>S"]
    E4_6["#46 ブログ記事<br/>E4依存"]

    E2_1 --> E2_2
    E4_6 -.->|審査に必要| E2_2
    E2_2 --> E2_3
    E2_3 --> E2_4
    E2_4 --> E2_5
    E2_4 --> E2_6

    style E2_1 fill:#ffa94d,color:#fff
    style E2_2 fill:#ffa94d,color:#fff
    style E2_3 fill:#ffa94d,color:#fff
    style E2_4 fill:#ffd43b,color:#000
    style E2_5 fill:#ffd43b,color:#000
    style E2_6 fill:#ffa94d,color:#fff
    style E4_6 fill:#69db7c,color:#000
```

## E3: Stripe課金 サブIssue依存関係

```mermaid
graph TD
    subgraph "Phase 1.5: 買い切り"
        E3_1["#28 DB設計<br/>S"]
        E3_2["#29 Google OAuth<br/>M"]
        E3_3["#30 Checkout Session<br/>M"]
        E3_4["#31 Webhook処理<br/>M"]
        E3_5["#32 セッション管理JWT<br/>S"]
        E3_6["#33 価格表ページ<br/>M"]
        E3_7["#34 購入完了ページ<br/>S"]
    end

    subgraph "Phase 2: サブスク"
        E3_8["#35 DBスキーマ拡張<br/>S"]
        E3_9["#36 サブスクWebhook<br/>L"]
        E3_10["#37 Customer Portal<br/>S"]
        E3_11["#38 マイページ<br/>M"]
        E3_12["#39 年額プラン<br/>S"]
        E3_13["#40 サブスク誘導ナッジ<br/>M"]
    end

    E3_1 --> E3_2
    E3_1 --> E3_3
    E3_3 --> E3_4
    E3_2 --> E3_5
    E3_4 --> E3_5
    E3_3 --> E3_6
    E3_4 --> E3_7
    E3_5 --> E3_7

    E3_1 --> E3_8
    E3_4 --> E3_9
    E3_8 --> E3_9
    E3_5 --> E3_10
    E3_9 --> E3_10
    E3_10 --> E3_11
    E3_6 --> E3_12
    E3_9 --> E3_12
    E3_7 --> E3_13
    E3_9 --> E3_13
    E3_12 --> E3_13

    style E3_1 fill:#ffd43b,color:#000
    style E3_9 fill:#ff6b6b,color:#fff
```

## E4: SEO + GA4 サブIssue依存関係

```mermaid
graph TD
    subgraph "SEO"
        E4_1["#41 robots.txt/sitemap<br/>S"]
        E4_2["#42 Metadata/OGP/canonical<br/>S"]
        E4_3["#43 構造化データJSON-LD<br/>S"]
        E4_4["#44 Search Console登録<br/>S"]
        E4_5["#45 内部リンク設計<br/>M"]
        E4_6["#46 ブログ/ガイドページ<br/>L"]
    end

    subgraph "GA4"
        E4_7["#47 GA4導入<br/>S"]
        E4_8["#48 カスタムイベント計測<br/>M"]
        E4_9["#49 ファネル分析設定<br/>S"]
        E4_10["#50 CF Web Analytics<br/>S"]
    end

    E4_2 --> E4_3
    E4_1 --> E4_4
    E4_2 --> E4_4
    E4_5 --> E4_6

    E4_7 --> E4_8
    E4_8 --> E4_9
    E4_7 --> E4_10

    style E4_1 fill:#69db7c,color:#000
    style E4_7 fill:#69db7c,color:#000
    style E4_6 fill:#ff6b6b,color:#fff
```

## E5: 初期集客 サブIssue依存関係

```mermaid
graph TD
    subgraph "技術基盤"
        E5_1["#51 OGP・シェア基盤<br/>M"]
        E5_2["#52 シェアボタン<br/>S"]
        E5_3["#53 UTMパラメータ<br/>S"]
    end

    subgraph "マーケティング"
        E5_4["#54 Product Hunt準備<br/>L"]
        E5_5["#55 Reddit投稿<br/>M"]
        E5_6["#56 Hacker News投稿<br/>S"]
        E5_7["#57 Zenn/Qiita記事<br/>M"]
        E5_8["#58 note記事<br/>S"]
        E5_9["#59 X運用<br/>M"]
    end

    E5_1 --> E5_2
    E5_1 --> E5_4
    E5_1 --> E5_5
    E5_2 --> E5_9
    E5_5 --> E5_6

    style E5_1 fill:#74c0fc,color:#000
    style E5_4 fill:#ff6b6b,color:#fff
```

## E6: 品質比較プレビュー サブIssue依存関係

```mermaid
graph TD
    E6_1["#60 品質パラメータ型定義<br/>S"]
    E6_2["#61 /convert/preview EP<br/>M"]
    E6_3["#62 プレビュー変換ルートAPI<br/>M"]
    E6_4["#63 低解像度サムネイル<br/>S"]
    E6_5["#64 スライダー比較UI<br/>M"]
    E6_6["#65 パターン一覧・サイズ可視化<br/>M"]
    E6_7["#66 Pro自動推奨ロジック<br/>L"]
    E6_8["#67 ConversionCard統合<br/>M"]

    E6_1 --> E6_2
    E6_1 --> E6_3
    E6_2 --> E6_3
    E6_2 --> E6_4
    E6_4 --> E6_5
    E6_3 --> E6_6
    E6_5 --> E6_6
    E6_6 --> E6_7
    E6_5 --> E6_8
    E6_6 --> E6_8

    style E6_1 fill:#b197fc,color:#fff
    style E6_7 fill:#868e96,color:#fff
```

## E8: エラー監視 サブIssue依存関係

```mermaid
graph TD
    E8_1["#70 Sentryプロジェクト作成<br/>S"]
    E8_2["#71 Converter SDK導入<br/>M"]
    E8_3["#72 API Workers SDK導入<br/>M"]
    E8_4["#73 フロントエンド SDK導入<br/>M"]
    E8_5["#74 Source Maps設定<br/>M"]
    E8_6["#75 カスタムメトリクス<br/>M"]
    E8_7["#76 アラートルール・通知<br/>S"]

    E8_1 --> E8_2
    E8_1 --> E8_3
    E8_1 --> E8_4
    E8_3 --> E8_5
    E8_4 --> E8_5
    E8_2 --> E8_6
    E8_3 --> E8_6
    E8_6 --> E8_7

    style E8_1 fill:#868e96,color:#fff
```
