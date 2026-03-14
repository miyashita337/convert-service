# ADR-001: Sharp on GCP Cloud Run

- **Status**: Accepted
- **Date**: 2025-12-01

## Context

画像変換エンジンの実行環境を選定する必要がある。Cloudflare Workers には native module の制約があり、Sharp（libvips ベース）を直接実行できない。

## Decision

GCP Cloud Run（us-central1）で Sharp を Docker コンテナとして実行する。

## Alternatives Considered

| 選択肢 | メリット | デメリット |
|---|---|---|
| **GCP Cloud Run (採用)** | native module 利用可能、無料枠あり、max-instances で制御可能 | Cloudflare エコシステム外、レイテンシ増 |
| Cloudflare Workers + WASM | エコシステム統一 | Sharp の WASM 版が不安定、品質制限 |
| AWS Lambda | 実績豊富 | Cloudflare R2 との通信コスト増 |

## Consequences

- API（Workers）→ Converter（Cloud Run）間に HTTP 通信が発生
- Cloud Run の max-instances=3 でコスト制御
- R2 への直接アクセスは Service Account 経由
