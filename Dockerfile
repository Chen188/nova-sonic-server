FROM node:20

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose the port the server runs on
EXPOSE 3333

# Set environment variables (these will be overridden by docker-compose or at runtime)
ENV AWS_REGION=us-east-1

# Run the server
CMD ["node", "dist/server.js"]
