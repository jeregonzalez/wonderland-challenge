import { BigNumberish, ethers } from "ethers";

import { Notifier } from "./notifier";
import { SequencerMonitorRepository } from "../repositories/sequencer-monitor";
import sequencerAbi from "../abis/sequencer-abi.json";
import workableAbi from "../abis/workable-abi.json";

export class SequencerMonitor {
  protected sequencerContract: ethers.Contract;
  protected jobContracts: { [jobAddress: string]: ethers.Contract } = {};

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

  protected async getMasterNetwork(blockNumber: BigNumberish): Promise<string> {
    return await this.sequencerContract.getMaster({ blockTag: blockNumber });
  }

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

  protected async handleConsecutiveWorkableBlocks(
    network: string,
    workableStatuses: { [jobAddress: string]: boolean },
    consequentBlocksLimit: number
  ) {
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

  protected async notifyUnworkedJobs(
    network: string,
    unworkedJobs: string[],
    consequentBlocksLimit: number
  ) {
    const message =
      `Warning: Unworked jobs detected for network ${network}.` +
      `The following jobs have not been worked for more than ${consequentBlocksLimit} blocks:\n${unworkedJobs.join(
        "\n"
      )}`;
    await this.notifier.notify(message);
  }
}
