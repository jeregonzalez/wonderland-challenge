const AWS = require("aws-sdk");
const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider(process.env.RPC_NODE_URL);
const lambda = new AWS.Lambda({
  endpoint: "http://host.docker.internal:3002",
  region: "us-west-2",
});

const monitorUnworkedJobs = async (blockNumber) => {
  console.log("Invoking Lambda with block number:", blockNumber);
  const params = {
    FunctionName: "sequencer-monitor-dev-notify-unworked-jobs",
    InvocationType: "Event",
    Payload: JSON.stringify({
      blockNumber,
    }),
  };
  lambda.invoke(params, (err, data) => {
    if (err) {
      console.error("Failed to invoke Lambda:", err);
    } else {
      console.log("Lambda invoked successfully:", data);
    }
  });
};

provider.on("block", monitorUnworkedJobs);
