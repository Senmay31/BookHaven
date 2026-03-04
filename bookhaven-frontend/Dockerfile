# ── Stage 1: Install dependencies ───
FROM node:18-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm install

# ── Stage 2: Build the Next.js app ──
FROM node:18-alpine AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Build the production Next.js bundle
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ── Stage 3: Production runner ──
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy only the built output and required files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]