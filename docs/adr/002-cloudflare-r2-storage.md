# ADR-002: Cloudflare R2 + 24h 自動削除

- **Status**: Accepted
- **Date**: 2025-12-01

## Context

変換元・変換後の画像を一時保存するストレージが必要。プライバシー保護のため自動削除が必須。

## Decision

Cloudflare R2 を使用し、Lifecycle Rules で 24h 自動削除を設定する。

## Alternatives Considered

| 選択肢 | メリット | デメリット |
|---|---|---|
| **Cloudflare R2 (採用)** | エグレス無料、Workers との統合、Lifecycle Rules | S3 互換だが一部 API 未対応 |
| AWS S3 | 機能豊富、実績 | エグレス課金、Cloudflare との通信コスト |
| GCS | Cloud Run との親和性 | エグレス課金 |

## Consequences

- エグレス費用 $0（R2 の最大メリット）
- 24h で自動削除されるためプライバシー保護が確保
- Workers Binding でアクセス（認証不要）
