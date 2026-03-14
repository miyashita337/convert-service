# ADR-004: Next.js 静的エクスポート

- **Status**: Accepted
- **Date**: 2025-12-01

## Context

フロントエンドのデプロイ方式を決定する必要がある。

## Decision

Next.js の静的エクスポート（`output: 'export'`）を使用し、Cloudflare Pages にデプロイする。

## Alternatives Considered

| 選択肢 | メリット | デメリット |
|---|---|---|
| **静的エクスポート (採用)** | CDN 配信、Pages 無料枠、シンプル | SSR 不可、動的ルート制限 |
| SSR on Workers | 動的レンダリング可能 | @cloudflare/next-on-pages の制約 |
| Vercel | Next.js 公式サポート | 無料枠制限、ベンダーロックイン |

## Consequences

- API 通信はクライアントサイドで実行
- i18n はクライアントサイドルーティング（next-intl）
- Pages の無料枠（無制限リクエスト）で運用コスト $0
