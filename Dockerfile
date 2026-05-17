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

# 1. Create the system user with a real home directory
RUN groupadd -r nodeuser && useradd -r -g nodeuser -m -d /home/nodeuser nodeuser
RUN npm install -g pnpm@10 turbo

# 2. Copy dependency manifests ONLY
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# 🚀 Ignore scripts during install
# This prevents Prisma from crashing because the schema isn't here yet
RUN pnpm install --frozen-lockfile --ignore-scripts

# 3. Copy full source (includes schema.prisma)
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

# 🚀 THE MONOREPO BUILD SEQUENCE
# Generate Prisma Client specifically for the database package
RUN pnpm --filter @repo/database run generate

# Now build the API (it will now find the generated Prisma types)
RUN pnpm turbo run build --filter=@repo/api

# 🚀 THE OBIT FIX: Nuclear permissions for the non-root user
RUN chown -R nodeuser:nodeuser /app /home/nodeuser

# 🔒 Security
USER nodeuser

EXPOSE 3001
ENV NODE_ENV=production

# 🚀 Path verified via your VS Code Explorer image
CMD ["node", "apps/api/dist/server.js"]