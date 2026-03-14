# ADR-003: Cloudflare D1 データベース

- **Status**: Accepted
- **Date**: 2025-12-01

## Context

ユーザー情報、使用量追跡、課金状態等を永続化するデータベースが必要。

## Decision

Cloudflare D1（SQLite ベース）を使用する。

## Alternatives Considered

| 選択肢 | メリット | デメリット |
|---|---|---|
| **Cloudflare D1 (採用)** | Workers と統合、無料枠大、SQLite 互換 | ベータ段階の機能あり |
| Turso (LibSQL) | D1 より高機能、レプリカ | 別サービスの依存追加 |
| Supabase (PostgreSQL) | フル PostgreSQL | Workers からの接続に TCP ドライバ必要 |

## Consequences

- Cloudflare エコシステム内で完結（R2, Workers, Pages, D1）
- SQLite の制約（JOIN 性能、同時書き込み）は初期規模では問題なし
- スケール限界到達時に Turso/PostgreSQL への移行を検討
