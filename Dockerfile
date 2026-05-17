# Cache bust: 2026-05-17
# Stage 1: Pruning
FROM node:22-slim AS builder
RUN npm install -g pnpm@10 turbo
WORKDIR /app
COPY . .
RUN turbo prune @repo/api --docker

# Stage 2: Build & Run
FROM node:22-slim AS runner
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Build args for Prisma generate
ARG DATABASE_URL
ARG DIRECT_URL
ENV DATABASE_URL=$DATABASE_URL
ENV DIRECT_URL=$DIRECT_URL

RUN groupadd -r nodeuser && useradd -r -g nodeuser -m -d /home/nodeuser nodeuser
RUN npm install -g pnpm@10 turbo

COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

RUN pnpm --filter @repo/database run generate
RUN pnpm turbo run build --filter=@repo/api

RUN chown -R nodeuser:nodeuser /app /home/nodeuser
USER nodeuser
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "apps/api/dist/server.js"]
