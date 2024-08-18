import { BigNumberish, ethers } from "ethers";

import { Notifier } from "./notifier";
import { SequencerMonitorRepository } from "../repositories/sequencer-monitor";
import sequencerAbi from "../abis/sequencer-abi.json";
import workableAbi from "../abis/workable-abi.json";

/**
 * Class responsible for monitoring sequencer jobs and detecting unworked jobs
 * within a network. It interacts with smart contracts to check job statuses
 * and notifies when jobs are not worked for a certain number of consecutive blocks.
 */
export class SequencerMonitor {
  protected sequencerContract: ethers.Contract;
  protected jobContracts: { [jobAddress: string]: ethers.Contract } = {};

  /**
   * Initializes a new instance of the SequencerMonitor class.
   * @param {ethers.AbstractProvider} ethersProvider - The ethers provider instance for interacting with the blockchain.
   * @param {string} sequencerAddress - The address of the sequencer contract.
   * @param {SequencerMonitorRepository} sequencerMonitorRepository - The repository for managing the storage of consecutive workable blocks.
   * @param {Notifier} notifier - The notifier instance for sending notifications.
   */
  constructor(
    protected readonly ethersProvider: ethers.AbstractProvider,
    protected readonly sequencerAddress: string,
    protected sequencerMonitorRepository: SequencerMonitorRepository,
    protected notifier: Notifier
  ) {
    this.sequencerContract = new ethers.Contract(
      this.sequencerAddress,
      sequencerAbi,
      this.ethersProvider
    );
  }

  /**
   * Monitors unworkable jobs by checking their statuses and notifying
   * if any jobs remain unworked for a specified number of consecutive blocks.
   * @param {BigNumberish} blockNumber - The block number to monitor.
   * @param {number} consequentBlocksLimit - The limit of consecutive blocks for which a job can remain unworked before notifying.
   */
  public async monitorUnworkableJobs(
    blockNumber: BigNumberish,
    consequentBlocksLimit: number
  ) {
    console.log("Monitoring sequencer at block number", blockNumber);

    console.log("Getting job addresses...");
    const jobAddresses = await this.getJobAddresses(blockNumber);

    console.log("Getting master network...");
    const masterNetwork = await this.getMasterNetwork(blockNumber);

    console.log(
      `Getting job workable statuses for network ${masterNetwork}...`
    );
    const workableStatuses = await this.getWorkableStatuses(
      blockNumber,
      masterNetwork,
      jobAddresses
    );
    for (const workableStatus in workableStatuses) {
      workableStatuses[workableStatus] = true;
    }

    console.log("Handling consequent workable blocks...");
    const unworkedJobs = await this.handleConsecutiveWorkableBlocks(
      masterNetwork,
      workableStatuses,
      consequentBlocksLimit
    );

    if (unworkedJobs.length > 0) {
      console.log("Notifying unworked jobs...");
      await this.notifyUnworkedJobs(
        masterNetwork,
        unworkedJobs,
        consequentBlocksLimit
      );
    }
  }

  /**
   * Retrieves the job addresses from the sequencer contract at the given block number.
   * @param {BigNumberish} blockNumber - The block number to query the job addresses.
   * @returns {Promise<string[]>} - A promise that resolves to an array of job addresses.
   */
  protected async getJobAddresses(
    blockNumber: BigNumberish
  ): Promise<string[]> {
    const numJobs: bigint = await this.sequencerContract.numJobs({
      blockTag: blockNumber,
    });
    const promises = Array.from({ length: Number(numJobs) }, (_, i) =>
      this.sequencerContract.jobAt(i, { blockTag: blockNumber })
    );
    return await Promise.all(promises);
  }

  /**
   * Retrieves the master network from the sequencer contract at the given block number.
   * @param {BigNumberish} blockNumber - The block number to query the master network.
   * @returns {Promise<string>} - A promise that resolves to the master network string.
   */
  protected async getMasterNetwork(blockNumber: BigNumberish): Promise<string> {
    return await this.sequencerContract.getMaster({ blockTag: blockNumber });
  }

  /**
   * Retrieves the workable statuses of jobs on a network at a specific block number.
   * @param {BigNumberish} blockNumber - The block number to query.
   * @param {string} network
   * @param {string[]} jobAddresses - An array of job addresses to check.
   * @returns {Promise<{ [jobAddress: string]: boolean }>} - A promise that resolves to an object mapping job addresses to their workable status.
   */
  protected async getWorkableStatuses(
    blockNumber: BigNumberish,
    network: string,
    jobAddresses: string[]
  ): Promise<{ [jobAddress: string]: boolean }> {
    const promises = jobAddresses.map((jobAddress) => {
      this.jobContracts[jobAddress] ??= new ethers.Contract(
        jobAddress,
        workableAbi,
        this.ethersProvider
      );
      return this.jobContracts[jobAddress].workable(network, {
        blockTag: blockNumber,
      });
    });
    const responses = await Promise.all(promises);

    const workableStatuses: { [jobAddress: string]: boolean } = {};
    for (let i = 0; i < jobAddresses.length; i++) {
      workableStatuses[jobAddresses[i]] = responses[i][0];
    }
    return workableStatuses;
  }

  /**
   * Handles tracking and updating of consecutive workable blocks and identifies unworked jobs.
   * @param {string} network
   * @param {{ [jobAddress: string]: boolean }} workableStatuses - An object mapping job addresses to their workable status.
   * @param {number} consequentBlocksLimit - The limit of consecutive blocks for which a job can remain unworked before notifying.
   * @returns {Promise<string[]>} - A promise that resolves to an array of unworked job addresses.
   */
  protected async handleConsecutiveWorkableBlocks(
    network: string,
    workableStatuses: { [jobAddress: string]: boolean },
    consequentBlocksLimit: number
  ): Promise<string[]> {
    const consequentWorkableBlocks =
      await this.sequencerMonitorRepository.getConsequentWorkableBlocks(
        network
      );

    const unworkedJobs: string[] = [];

    for (const jobAddress in workableStatuses) {
      const canWork = workableStatuses[jobAddress];

      if (canWork === true) {
        consequentWorkableBlocks[jobAddress] =
          (consequentWorkableBlocks[jobAddress] ?? 0) + 1;

        if (consequentWorkableBlocks[jobAddress] >= consequentBlocksLimit) {
          unworkedJobs.push(jobAddress);
        }
      } else if (consequentWorkableBlocks[jobAddress] > 0) {
        consequentWorkableBlocks[jobAddress] = 0;
      }
    }

    // TODO - Avoid rewrite if there are no changes
    await this.sequencerMonitorRepository.setConsequentWorkableBlocks(
      network,
      consequentWorkableBlocks
    );

    return unworkedJobs;
  }

  /**
   * Sends a notification about unworked jobs on a network.
   * @param {string} network
   * @param {string[]} unworkedJobs - An array of unworked job addresses.
   * @param {number} consequentBlocksLimit - The limit of consecutive blocks for which a job can remain unworked before notifying.
   */
  protected async notifyUnworkedJobs(
    network: string,
    unworkedJobs: string[],
    consequentBlocksLimit: number
  ): Promise<void> {
    const message =
      `Warning: Unworked jobs detected for network ${network}.` +
      `The following jobs have not been worked for more than ${consequentBlocksLimit} blocks:\n${unworkedJobs.join(
        "\n"
      )}`;
    await this.notifier.notify(message);
  }
}
