# =============================================================================
# SabbyLink Backend Dockerfile
# =============================================================================
# Multi-stage build for optimized production image
# Uses Bun runtime for 50% less RAM than Node.js

# Stage 1: Dependencies
FROM oven/bun:1.0-alpine AS deps

WORKDIR /app

# Copy package files only (no lockfile)
COPY package.json ./

# Install all dependencies (including dev for build)
RUN rm -f bun.lockb && bun install --no-save

# Stage 2: Runner (production)
FROM oven/bun:1.0-alpine AS runner

# Install curl for healthchecks
RUN apk add --no-cache curl

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 sabbylink && \
    adduser --system --uid 1001 sabbylink

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code (Bun runs TypeScript directly)
COPY . .

# Create data directories
RUN mkdir -p /data /backups /app/logs && \
    chown -R sabbylink:sabbylink /data /backups /app/logs

# Switch to non-root user
USER sabbylink

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Set environment
ENV NODE_ENV=production \
    PORT=3000

# Start the application (Bun runs TypeScript directly)
CMD ["bun", "run", "src/index.ts"]
