FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Make the start script executable
RUN chmod +x dist/index.js

# Set environment variables
ENV NODE_ENV=production

# Run the server
CMD ["node", "dist/index.js"]
