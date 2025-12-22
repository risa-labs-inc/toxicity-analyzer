# Dockerfile for Toxicity Analyzer API
# Simple single-stage build for Cloud Run

FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/intelligence-layer/package*.json ./packages/intelligence-layer/
COPY packages/api/package*.json ./packages/api/

# Install dependencies
RUN npm install

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/intelligence-layer ./packages/intelligence-layer
COPY packages/api ./packages/api
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/intelligence-layer
RUN npm run build --workspace=packages/api

# Compile knexfile.ts separately (it's outside src/ directory)
RUN npx tsc packages/api/knexfile.ts --outDir packages/api --esModuleInterop --resolveJsonModule --module commonjs

# Expose Cloud Run port
EXPOSE 8080

# Set working directory to root for start script
WORKDIR /app

# Start API using root package.json start script
CMD ["node", "packages/api/dist/index.js"]
