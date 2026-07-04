FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start Vite dev server and expose it to the network
CMD ["npm", "run", "dev", "--", "--host"]
