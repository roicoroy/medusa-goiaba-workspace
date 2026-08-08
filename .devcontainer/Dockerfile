# ---- Build Stage ----
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy lockfile and manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY patches ./patches
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Copy source
COPY . .

# Build the api app with the oxc toolchain (tsdown) and prune the lockfile.
RUN npx nx run api:prune --configuration=production

# ---- Runtime Stage ----
FROM node:22-alpine AS runner

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built output (which includes package.json, pnpm-lock.yaml, and main.cjs)
COPY --from=builder /app/dist/apps/api ./

# Copy patches just in case pnpm strict checks require them
COPY patches ./patches

# Install production-only packages against the pruned lockfile
RUN pnpm install --prod --ignore-scripts --no-frozen-lockfile

EXPOSE 3000

CMD ["node", "main.cjs"]
