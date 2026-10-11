# Stage 1: Build client and server
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install all dependencies (including devDependencies required for build)
# Limit concurrent sockets to prevent connection resets during containerized npm downloads
RUN npm config set maxsockets 5 && npm ci

# Copy full application source files
COPY src/ ./src/
COPY server/ ./server/
COPY index.html ./index.html
COPY vite.config.ts ./vite.config.ts
COPY tsconfig.json ./tsconfig.json
COPY metadata.json ./metadata.json

# Build both client (Vite -> dist) and server (TypeScript -> dist-server)
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Install production dependencies only
COPY package*.json ./
RUN npm config set maxsockets 5 && npm ci --omit=dev && npm cache clean --force

# Copy pre-built assets from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server

# Run as non-root user
USER node

# Expose default HTTP port
EXPOSE 8080

# Start production server
CMD ["node", "dist-server/index.js"]
