# Dockerfile for data ingestion job
FROM node:20-slim

WORKDIR /app

# Copy package files for all workspaces
COPY package*.json ./
COPY tsconfig.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/data-ingestion/package*.json ./packages/data-ingestion/

# Install dependencies
RUN npm install

# Copy source code and data
COPY packages/shared ./packages/shared
COPY packages/data-ingestion ./packages/data-ingestion
COPY data ./data

# Build shared package first
WORKDIR /app/packages/shared
RUN npm run build

# Build data-ingestion package
WORKDIR /app/packages/data-ingestion
RUN npm run build

# Run the import
WORKDIR /app
ENTRYPOINT ["node", "packages/data-ingestion/dist/index.js"]
CMD ["all"]
