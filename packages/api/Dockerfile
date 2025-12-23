# Dockerfile for Toxicity Analyzer API
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy only backend packages (not frontends)
COPY packages/shared ./packages/shared
COPY packages/intelligence-layer ./packages/intelligence-layer
COPY packages/api ./packages/api

# Install all dependencies
RUN npm install

# Build only backend packages
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/intelligence-layer
RUN npm run build --workspace=packages/api

# Compile knexfile separately (it's not in src folder)
RUN npx tsc packages/api/knexfile.ts --esModuleInterop --resolveJsonModule --skipLibCheck

# Expose Cloud Run port
EXPOSE 8080

# Start API
WORKDIR /app/packages/api
CMD ["node", "dist/index.js"]
