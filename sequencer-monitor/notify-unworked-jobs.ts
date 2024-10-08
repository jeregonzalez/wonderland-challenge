import { BigNumberish, ethers } from "ethers";

import AWS from "aws-sdk";
import { DDBSequencerMonitorRepository } from "./repositories/sequencer-monitor";
import { DiscordNotifier } from "./services/notifier";
import { Handler } from "aws-lambda";
import { SequencerMonitor } from "./services/sequencer-monitor";

// Initialize resources
const provider = new ethers.JsonRpcProvider(process.env.RPC_NODE_URL);

const docClient = new AWS.DynamoDB.DocumentClient({
  endpoint: process.env.DYNAMODB_ENDPOINT_URL,
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
const ddbSequencerMonitorRepository = new DDBSequencerMonitorRepository(
  process.env.SEQUENCER_ADDRESS!,
  docClient
);
const discordNotifier = new DiscordNotifier(process.env.DISCORD_WEBHOOK_URL!);

const sequencerMonitor = new SequencerMonitor(
  provider,
  process.env.SEQUENCER_ADDRESS!,
  ddbSequencerMonitorRepository,
  discordNotifier
);

interface SequencerMonitorEvent {
  /** The block number to monitor. */
  blockNumber: BigNumberish;
}

/**
 * AWS Lambda handler function that monitors unworked jobs in the sequencer
 * and sends notifications if any jobs remain unworked for a specified number
 * of consecutive blocks.
 *
 * @param {SequencerMonitorEvent} event - The event object containing the block number to monitor.
 * @returns {Promise<void>} - A promise that resolves when the job monitoring process completes.
 */
export const handler: Handler = async (
  event: SequencerMonitorEvent
): Promise<void> => {
  await sequencerMonitor.monitorUnworkableJobs(
    event.blockNumber,
    Number(process.env.CONSEQUENT_WORKABLE_JOBS_LIMIT!)
  );
};
