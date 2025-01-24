# Base stage
FROM node:18-slim AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps

# Install necessary SSL and Prisma dependencies
RUN apt-get update -y && apt-get install -y \
    openssl \
    ca-certificates \
    debian-archive-keyring \
    curl \
    python3 \
    pkg-config \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Development stage
FROM base AS development
WORKDIR /app

# Install development dependencies
RUN apt-get update -y && apt-get install -y \
    openssl \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy node_modules and other files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

# Generate Prisma Client for development
RUN npx prisma generate

# Set development environment
ENV NODE_ENV development
ENV PORT 3000
ENV HOSTNAME 0.0.0.0

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]


## Dockerfile
# FROM node:18-slim AS base

# # Install dependencies only when needed
# FROM base AS deps
# WORKDIR /app

# # Install necessary SSL and Prisma dependencies
# RUN apt-get update -y && apt-get install -y \
#     openssl \
#     ca-certificates \
#     debian-archive-keyring \
#     curl \
#     python3 \
#     pkg-config \
#     build-essential \
#     && apt-get clean \
#     && rm -rf /var/lib/apt/lists/*

# # Copy package files
# COPY package.json package-lock.json* ./
# COPY prisma ./prisma/

# # Install dependencies
# RUN npm ci

# # Generate Prisma Client
# RUN npx prisma generate

# # Rebuild the source code only when needed
# FROM base AS builder
# WORKDIR /app
# COPY --from=deps /app/node_modules ./node_modules
# COPY . .

# # Generate Prisma Client
# RUN npx prisma generate
# RUN npm run build

# # Production image, copy all files and run next
# FROM base AS runner
# WORKDIR /app

# ENV NODE_ENV production

# # Install necessary SSL library
# RUN apt-get update -y && apt-get install -y \
#     openssl \
#     ca-certificates \
#     && apt-get clean \
#     && rm -rf /var/lib/apt/lists/*

# # Create system user
# RUN addgroup --system --gid 1001 nodejs
# RUN adduser --system --uid 1001 nextjs

# # Copy built files
# COPY --from=builder /app/public ./public
# COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# COPY --from=builder /app/prisma ./prisma
# COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# # Set user
# USER nextjs

# # Expose port
# EXPOSE 3000

# ENV PORT 3000
# ENV HOSTNAME localhost

# CMD ["npm", "run", "dev"]
# # CMD ["node", "server.js"]