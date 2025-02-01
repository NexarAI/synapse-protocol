# Build stage
FROM node:18-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Production stage
FROM node:18-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Start the application
CMD ["npm", "start"]

# Add labels
LABEL org.opencontainers.image.source="https://github.com/NexarAI/synapse-protocol"
LABEL org.opencontainers.image.description="Nexar AI™ Synapse Protocol"
LABEL org.opencontainers.image.licenses="MIT" 
