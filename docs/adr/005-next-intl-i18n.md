# ADR-005: next-intl による i18n

- **Status**: Accepted
- **Date**: 2025-12-01

## Context

日本語と英語の2言語対応が必要。静的エクスポートとの互換性が求められる。

## Decision

next-intl を使用し、クライアントサイドで言語切り替えを行う。

## Alternatives Considered

| 選択肢 | メリット | デメリット |
|---|---|---|
| **next-intl (採用)** | 静的エクスポート対応、型安全、App Router 対応 | クライアントサイドのみ |
| next-i18next | 実績豊富 | Pages Router 向け、App Router サポート弱 |
| react-intl | 軽量 | Next.js 統合が手動 |

## Consequences

- `messages/{locale}.json` にメッセージを管理
- SEO: `<html lang>` と `<link hreflang>` で対応
- 将来の言語追加はメッセージファイル追加のみ
