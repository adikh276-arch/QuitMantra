FROM node:24-alpine

WORKDIR /app

# Copy all files
COPY . .

# Install dependencies
RUN npm install

# Expose port and start the server
EXPOSE 3000

CMD ["node", "server/index.js"]
