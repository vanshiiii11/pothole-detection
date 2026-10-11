# Production Dockerfile
# Optimized for reliable, reproducible builds across local and cloud environments
FROM node:20-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev --fetch-retries=5 --fetch-retry-factor=2 && npm cache clean --force

# Copy pre-built production assets (generated during npm run build)
COPY dist ./dist
COPY dist-server ./dist-server

# Run as non-root user
USER node

# Expose default HTTP port
EXPOSE 8080

# Start server
CMD ["node", "dist-server/index.js"]
