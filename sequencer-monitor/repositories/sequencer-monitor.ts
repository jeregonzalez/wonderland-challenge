import AWS from "aws-sdk";

/**
 * Interface representing a repository for managing consequent workable blocks
 * for a sequencer monitor. It defines methods for retrieving and storing
 * consecutive workable block data.
 */
export interface SequencerMonitorRepository {
  /**
   * Retrieves the number of consecutive workable blocks for each job in the specified network.
   *
   * @param {string} network - The network identifier for which to retrieve the data.
   * @returns {Promise<{ [jobAddress: string]: number }>} - A promise that resolves with an object
   * mapping job addresses to their respective count of consecutive workable blocks.
   */
  getConsequentWorkableBlocks(network: string): Promise<{
    [jobAddress: string]: number;
  }>;

  /**
   * Stores the number of consecutive workable blocks for each job in the specified network.
   *
   * @param {string} network - The network identifier for which to store the data.
   * @param {{ [jobAddress: string]: number }} consequentWorkableBlocks - An object mapping job
   * addresses to their respective count of consecutive workable blocks.
   * @returns {Promise<void>} - A promise that resolves when the data has been stored.
   */
  setConsequentWorkableBlocks(
    network: string,
    consequentWorkableBlocks: {
      [jobAddress: string]: number;
    }
  ): Promise<void>;
}

/**
 * A DynamoDB-based implementation of the `SequencerMonitorRepository` interface.
 */
export class DDBSequencerMonitorRepository
  implements SequencerMonitorRepository
{
  private readonly tableName = "consequent-workable-blocks";

  constructor(
    private readonly sequencerAddress: string,
    private readonly docClient: AWS.DynamoDB.DocumentClient
  ) {}

  async getConsequentWorkableBlocks(network: string): Promise<{
    [jobAddress: string]: number;
  }> {
    const params = {
      TableName: this.tableName,
      Key: { network },
    };
    const result = await this.docClient.get(params).promise();
    return result.Item?.consequent_workable_blocks ?? {};
  }

  async setConsequentWorkableBlocks(
    network: string,
    consequentWorkableBlocks: {
      [jobAddress: string]: number;
    }
  ): Promise<void> {
    const params = {
      TableName: this.tableName,
      Item: {
        network,
        consequent_workable_blocks: consequentWorkableBlocks,
      },
    };
    await this.docClient.put(params).promise();
  }
}
