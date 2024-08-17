FROM node:20

WORKDIR /app

# Copy the package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Install Serverless globally
RUN npm install -g serverless@3

# Copy the rest of the application code to the container
COPY . .

# Expose the port that Serverless Offline will run on
EXPOSE 3002

# Start Serverless Offline when the container launches
CMD ["serverless", "offline", "start", "--host", "0.0.0.0"]
