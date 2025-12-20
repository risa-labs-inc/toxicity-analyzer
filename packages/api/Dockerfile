# Dockerfile for Toxicity Analyzer API
# Based on GHMonitoring deployment pattern
# Deploys Express.js backend to Cloud Run

FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci --production=false

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Copy migration files to dist directory
RUN mkdir -p dist/migrations && cp -r src/migrations/*.ts dist/migrations/ 2>/dev/null || true

# Copy knexfile to dist
RUN cp knexfile.ts dist/ 2>/dev/null || true

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Expose Cloud Run default port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["npm", "start"]
