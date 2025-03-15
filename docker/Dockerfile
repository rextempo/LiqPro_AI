# Build stage
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY shared/package.json ./shared/

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build applications
RUN pnpm build

# Production stage
FROM node:18-alpine AS production

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/backend/node_modules ./backend/node_modules

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "backend/dist/index.js"] 