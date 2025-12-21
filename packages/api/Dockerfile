# Simple Dockerfile for Toxicity Analyzer API
FROM node:20-slim

WORKDIR /app

# Copy everything from monorepo root
COPY . .

# Install dependencies
RUN npm install

# Build all packages
RUN npm run build --workspaces

# Expose port
EXPOSE 8080

# Start API server
WORKDIR /app/packages/api
CMD ["node", "dist/index.js"]
