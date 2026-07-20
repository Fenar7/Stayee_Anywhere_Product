# Base node image
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build stage
FROM base AS builder
COPY . .
# Generate prisma client for linux
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema, config, and install CLI for production migrations
# prisma.config.ts is required by Prisma v7 CLI to find the database URL at runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/scripts ./scripts

# Safely copy Prisma and dotenv from the builder stage instead of running npm install
# This prevents npm from overwriting the traced, generated @prisma/client
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

# Set production env
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
