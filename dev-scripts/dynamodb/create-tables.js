const AWS = require("aws-sdk");

// Configure AWS credentials and region
AWS.config.update({
  accessKeyId: "local",
  secretAccessKey: "local",
  region: "us-west-2",
  endpoint: process.env.DYNAMODB_ENDPOINT_URL || "http://localhost:8000",
});

const dynamodb = new AWS.DynamoDB();

// Define the table schema
const tableParams = {
  TableName: "consequent-workable-blocks",
  KeySchema: [{ AttributeName: "sequencer_address", KeyType: "HASH" }],
  AttributeDefinitions: [
    { AttributeName: "sequencer_address", AttributeType: "S" },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10,
  },
};

// Create the table
const createTable = async () => {
  try {
    const data = await dynamodb.createTable(tableParams).promise();
    console.log("DynamoDB table created successfully:", data);
  } catch (err) {
    console.error("Error creating DynamoDB table:", err);
  }
};

// Run the table creation function
createTable();
