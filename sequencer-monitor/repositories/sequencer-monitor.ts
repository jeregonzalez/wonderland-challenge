import AWS from "aws-sdk";

export interface SequencerMonitorRepository {
  getConsequentWorkableBlocks(network: string): Promise<{
    [jobAddress: string]: number;
  }>;
  setConsequentWorkableBlocks(
    network: string,
    consequentWorkableBlocks: {
      [jobAddress: string]: number;
    }
  ): Promise<void>;
}

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
