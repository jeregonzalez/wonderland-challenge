# Wonderland Challenge

The purpose of this challenge is to create a Sequencer monitor.

The Sequencer Monitor is a TypeScript/Node.js-based service designed to monitor the smart contracts and detect jobs that have not been executed (worked) for a specific number of consecutive blocks. It uses AWS services such as DynamoDB for data persistence and Discord for notifications.

## Overview

This project is intended to monitor Ethereum jobs for a sequencer contract on a given blockchain. It periodically checks whether specific jobs can be worked and tracks the number of consecutive blocks that these jobs remain unworked. If any job exceeds a specified threshold of consecutive unworked blocks, a notification is sent to a Discord channel.

## Installation and Setup

### Prerequisites

- Node.js (v20)
- AWS SDK configured for access to DynamoDB and other AWS services
- An Ethereum JSON-RPC node (e.g., Infura or Alchemy)
- A Discord Webhook URL for notifications
- Docker and Docker Compose on your system (for running locally)

### Environment Variables

You need to set up the following environment variables:

- `RPC_NODE_URL`: The URL of the Ethereum JSON-RPC node.
- `SEQUENCER_ADDRESS`: The address of the sequencer contract.
- `DYNAMODB_ENDPOINT_URL`: The endpoint URL for DynamoDB (optional, can be used for local DynamoDB testing).
- `AWS_REGION`: The AWS region where your DynamoDB table is located.
- `AWS_ACCESS_KEY_ID`: Your AWS access key ID.
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key.
- `DISCORD_WEBHOOK_URL`: The webhook URL for sending Discord notifications.
- `CONSEQUENT_WORKABLE_JOBS_LIMIT`: The number of consecutive blocks a job can remain unworked before triggering a notification.

### Installation

1. Clone this repository:

   ```bash
   git clone <repository-url>
   ```

2. Create .env file and complete env variables

   ```bash
   cp .env.example .env
   ```

### Running Locally

To run the service locally, ensure you have set up the environment variables as mentioned above.

The provided docker-compose.yml file defines a multi-container Docker application with four services:

- **dynamodb**: Runs a local DynamoDB instance.
- **sequencer-monitor**: A service that builds and runs the sequencer monitoring application.
- **block-listener**: A service that listens for new blocks and invokes the sequencer-monitor lambda.
- **dynamodb-admin**: A web-based GUI for managing DynamoDB.

Run the following command to build the images (if not already built) and start the containers:

```bash
docker-compose up --build
```

### Deploying to AWS Lambda

To deploy this application in a cloud production environment, it's recommended to set up an API Gateway to invoke the sequencer-monitor Lambda function. This API Gateway will act as a webhook endpoint. You can then configure an external service to trigger this webhook whenever a new block is mined. For example, you can use [Alchemy Webhooks](https://www.alchemy.com/webhooks) to automatically call the webhook on each new block.

## TODOs

- Update serverless.yml to enable cloud deployment of the Lambda function.
- Validate environment variable values to ensure correct configuration.
- Enhance error handling for better reliability and debugging.
- In the local environment, ensure that the **block-listener** only calls the **sequencer-monitor** after it has been started.
- Update lambda handler to parse data from an API Gateway event.
