FROM node:16-alpine

# Set up workspace
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build shared libraries and service
RUN cd libs/common && npm install && npm run build && \
    cd ../database && npm install && npm run build && \
    cd ../security && npm install && npm run build && \
    cd ../../services/data-service && npm install && \
    npx tsc --build

EXPOSE 3001

# Start the service
WORKDIR /app/services/data-service
CMD ["npm", "start"] 