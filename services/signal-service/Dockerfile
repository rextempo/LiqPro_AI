FROM node:16-alpine

# Set up workspace
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy libs directory
COPY libs/ ./libs/

# Copy services/signal-service directory
COPY services/signal-service/ ./services/signal-service/

# Install dependencies
RUN cd libs/common && npm install && npm run build && \
    cd ../database && npm install && npm run build && \
    cd ../security && npm install && npm run build && \
    cd ../../services/signal-service && npm install && npm run build

EXPOSE 3002

# Start the service
WORKDIR /app/services/signal-service
CMD ["npm", "start"] 