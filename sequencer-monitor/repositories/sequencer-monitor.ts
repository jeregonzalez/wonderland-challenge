import AWS from "aws-sdk";

export interface SequencerMonitorRepository {
  getConsequentWorkableBlocks(): Promise<{
    [networkJob: string]: number;
  }>;
  setConsequentWorkableBlocks(consequentWorkableBlocks: {
    [networkJob: string]: number;
  }): Promise<void>;
}

export class DDBSequencerMonitorRepository
  implements SequencerMonitorRepository
{
  private readonly tableName = "consequent-workable-blocks";

  constructor(
    private readonly sequencerAddress: string,
    private readonly docClient: AWS.DynamoDB.DocumentClient
  ) {}

  async getConsequentWorkableBlocks(): Promise<{
    [networkJob: string]: number;
  }> {
    const params = {
      TableName: this.tableName,
      Key: { sequencer_address: this.sequencerAddress },
    };
    const result = await this.docClient.get(params).promise();
    return result.Item?.consequent_workable_blocks ?? {};
  }

  async setConsequentWorkableBlocks(consequentWorkableBlocks: {
    [networkJob: string]: number;
  }): Promise<void> {
    const params = {
      TableName: this.tableName,
      Item: {
        sequencer_address: this.sequencerAddress,
        consequent_workable_blocks: consequentWorkableBlocks,
      },
    };
    await this.docClient.put(params).promise();
  }
}
