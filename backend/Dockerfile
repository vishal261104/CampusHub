FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 5000

# Start server using the script defined in package.json (nodemon index.js)
CMD ["npm", "start"]
