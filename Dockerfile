# Cache bust: 2026-05-17c
FROM node:22-slim AS runner

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ARG DATABASE_URL
ARG DIRECT_URL
ENV DATABASE_URL=$DATABASE_URL
ENV DIRECT_URL=$DIRECT_URL
ENV NODE_ENV=production

RUN npm install -g pnpm@10

COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm --filter @repo/database run generate
RUN pnpm --filter @repo/database run build
RUN pnpm --filter @repo/api run build

EXPOSE 3001
CMD ["node", "apps/api/dist/server.js"]