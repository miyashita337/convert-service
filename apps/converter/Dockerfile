FROM node:22-slim AS builder
WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/converter/package.json apps/converter/

RUN pnpm install --frozen-lockfile || pnpm install

COPY packages/shared packages/shared
COPY apps/converter apps/converter

# Bundle with esbuild - includes shared package, externals for native modules
# pnpm workspace ではバイナリがサブパッケージ側の node_modules に配置される
RUN apps/converter/node_modules/.bin/esbuild apps/converter/src/index.ts \
    --bundle \
    --platform=node \
    --format=cjs \
    --outfile=apps/converter/dist/index.js \
    --external:sharp \
    --external:@aws-sdk/*

FROM node:22-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/apps/converter/dist ./dist

# esbuild で shared はバンドル済み。ランタイムでは external にした native モジュールのみインストール
RUN npm init -y > /dev/null 2>&1 && \
    npm install sharp@^0.33.0 @aws-sdk/client-s3@^3.700.0 --omit=dev

ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
