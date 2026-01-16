# Multi-stage Dockerfile for TMS Backend
# Production-grade optimization with security best practices

# Stage 1: Build
FROM node:18-alpine AS builder

# Set build arguments
ARG NODE_ENV=production
ARG BUILD_VERSION=1.0.0

# Set environment variables
ENV NODE_ENV=${NODE_ENV}
ENV BUILD_VERSION=${BUILD_VERSION}

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
# NOTE: Dockerfile COPY destinations don't support globs. Keep workspace dirs explicit.
COPY packages/utils/package*.json ./packages/utils/
COPY packages/types/package*.json ./packages/types/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/config/package*.json ./packages/config/
COPY packages/db/package*.json ./packages/db/

# Install all dependencies (including devDependencies)
RUN npm ci --include=dev

# Copy source code
COPY apps/backend/ ./apps/backend/
COPY packages/ ./packages/
COPY tsconfig.json ./
COPY turbo.json ./

# Build the application
RUN npm run build --workspace=apps/backend

# Stage 2: Production Runtime
FROM node:18-alpine AS production

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Create app directory with proper permissions
WORKDIR /app
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Copy package files
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs apps/backend/package*.json ./apps/backend/

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts

# Copy built artifacts from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages

# Create logs directory
RUN mkdir -p /app/logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/backend/dist/main.js"]

# Stage 3: Development (for local development)
FROM node:18-alpine AS development

# Set development environment
ENV NODE_ENV=development
ENV PORT=3000

# Install development dependencies
RUN apk add --no-cache \
    curl \
    git \
    python3 \
    make \
    g++

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
# NOTE: Dockerfile COPY destinations don't support globs. Keep workspace dirs explicit.
COPY packages/utils/package*.json ./packages/utils/
COPY packages/types/package*.json ./packages/types/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/config/package*.json ./packages/config/
COPY packages/db/package*.json ./packages/db/

# Install all dependencies
RUN npm install

# Copy source code
COPY apps/backend/ ./apps/backend/
COPY packages/ ./packages/
COPY tsconfig.json ./
COPY turbo.json ./

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start development server with hot reload
CMD ["npm", "run", "dev", "--workspace=apps/backend"]