#!/bin/bash

# Set environment variables if not already set
export NODE_ENV=${NODE_ENV:-development}
export PORT=${PORT:-3004}
export LOG_LEVEL=${LOG_LEVEL:-info}

# RabbitMQ configuration
export RABBITMQ_HOST=${RABBITMQ_HOST:-localhost}
export RABBITMQ_PORT=${RABBITMQ_PORT:-5672}
export RABBITMQ_USER=${RABBITMQ_USER:-guest}
export RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD:-guest}
export RABBITMQ_VHOST=${RABBITMQ_VHOST:-/}

# Service URLs
export DATA_SERVICE_URL=${DATA_SERVICE_URL:-http://localhost:3001}
export SIGNAL_SERVICE_URL=${SIGNAL_SERVICE_URL:-http://localhost:3002}
export SCORING_SERVICE_URL=${SCORING_SERVICE_URL:-http://localhost:3003}

# Start the service
echo "Starting Agent Engine service..."
if [ "$NODE_ENV" = "development" ]; then
  # Use ts-node-dev for development
  npx ts-node-dev --respawn --transpile-only src/index-new.ts
else
  # Use node for production
  node dist/index.js
fi 