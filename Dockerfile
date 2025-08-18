# Dockerfile для SvelteKit приложения PDM
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production image
FROM node:18-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 sveltekit

# Copy built application
COPY --from=builder --chown=sveltekit:nodejs /app/build build/
COPY --from=builder --chown=sveltekit:nodejs /app/node_modules node_modules/
COPY --from=builder --chown=sveltekit:nodejs /app/package.json package.json

# Create logs directory
RUN mkdir -p /app/logs && chown sveltekit:nodejs /app/logs

USER sveltekit

EXPOSE 4173

ENV NODE_ENV=production
ENV PORT=4173

# Logging configuration
ENV LOG_LEVEL=info
ENV LOG_FORMAT=json

CMD ["node", "build"]
