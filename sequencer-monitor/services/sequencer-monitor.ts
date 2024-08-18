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

    console.log("Getting networks...");
    const networks = await this.getNetworks(blockNumber);

    console.log("Getting workable statuses...");
    const workableStatusesByNetwork = await this.getWorkableStatusesByNetwork(
      blockNumber,
      networks,
      jobAddresses
    );

    console.log("Handling consequent workable blocks...");
    const unworkedJobs = await this.handleConsecutiveWorkableBlocks(
      workableStatusesByNetwork,
      consequentBlocksLimit
    );

    if (unworkedJobs.length > 0) {
      console.log("Notifying unworked jobs...");
      await this.notifyUnworkedJobs(unworkedJobs, consequentBlocksLimit);
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

  protected async getNetworks(blockNumber: BigNumberish): Promise<string[]> {
    const numNetworks: bigint = await this.sequencerContract.numNetworks({
      blockTag: blockNumber,
    });
    const promises = Array.from({ length: Number(numNetworks) }, (_, i) =>
      this.sequencerContract.networkAt(i, { blockTag: blockNumber })
    );
    return await Promise.all(promises);
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

  protected async getWorkableStatusesByNetwork(
    blockNumber: BigNumberish,
    networks: string[],
    jobAddresses: string[]
  ): Promise<{ [network: string]: { [jobAddress: string]: boolean } }> {
    const promises = networks.map((network) =>
      this.getWorkableStatuses(blockNumber, network, jobAddresses)
    );
    const workableStatuses = await Promise.all(promises);

    const workableStatusesByNetwork: {
      [network: string]: { [jobAddress: string]: boolean };
    } = {};
    for (let i = 0; i < networks.length; i++) {
      workableStatusesByNetwork[networks[i]] = workableStatuses[i];
    }
    return workableStatusesByNetwork;
  }

  protected async handleConsecutiveWorkableBlocks(
    workableStatusesByNetwork: {
      [network: string]: { [jobAddress: string]: boolean };
    },
    consequentBlocksLimit: number
  ) {
    const consequentWorkableBlocks =
      await this.sequencerMonitorRepository.getConsequentWorkableBlocks();

    const unworkedJobs: { network: string; jobAddress: string }[] = [];
    for (const network in workableStatusesByNetwork) {
      const workableStatuses = workableStatusesByNetwork[network];

      for (const jobAddress in workableStatuses) {
        const networkJob = `${network}-${jobAddress}`;
        const canWork = workableStatuses[jobAddress];

        if (canWork === true) {
          consequentWorkableBlocks[networkJob] =
            (consequentWorkableBlocks[networkJob] ?? 0) + 1;
          if (consequentWorkableBlocks[networkJob] >= consequentBlocksLimit) {
            unworkedJobs.push({ network, jobAddress });
          }
        } else {
          if (consequentWorkableBlocks[networkJob] > 0) {
            consequentWorkableBlocks[networkJob] = 0;
          }
        }
      }
    }

    await this.sequencerMonitorRepository.setConsequentWorkableBlocks(
      consequentWorkableBlocks
    );

    return unworkedJobs;
  }

  protected async notifyUnworkedJobs(
    unworkedJobs: { network: string; jobAddress: string }[],
    consequentBlocksLimit: number
  ) {
    await this.notifier.notify(
      `The following jobs have not been worked for more than ${consequentBlocksLimit} blocks:\n${unworkedJobs
        .map(
          ({ network, jobAddress }) =>
            `Network: ${network} - Job: ${jobAddress}`
        )
        .join("\n")}`
    );
  }
}
