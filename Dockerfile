# Use Node.js 18 on Alpine Linux
FROM node:18-alpine

# Set the npm proxy configuration
# RUN npm config set proxy http://192.168.49.1:8282
# RUN npm config set https-proxy http://192.168.49.1:8282

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies using --omit=dev
RUN npm install 

# Copy the rest of your application
COPY . .

# Expose port (optional, if your app runs on a specific port, e.g., 3000)
EXPOSE 3000

# Command to run your application
CMD ["npm", "start"]
