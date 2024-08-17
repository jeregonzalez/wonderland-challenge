"use strict";
const AWS = require("aws-sdk");
const lambda = new AWS.Lambda({
    endpoint: "http://localhost:3002",
    region: "us-west-2",
});
const params = {
    FunctionName: "sequencer-monitor-dev-notify-unworked-jobs",
    InvocationType: "RequestResponse",
    Payload: JSON.stringify({
        blockNumber: 20535201,
    }),
};
lambda.invoke(params, (err, data) => {
    if (err) {
        console.error("Failed to invoke Lambda:", err);
    }
    else {
        console.log("Lambda response:", data.Payload);
    }
});
