import AWS from "aws-sdk";
import { DDBSequencerMonitorRepository } from "../../sequencer-monitor/repositories/sequencer-monitor";

jest.mock("aws-sdk");

describe("DDBSequencerMonitorRepository", () => {
  const sequencerAddress = "0x123";
  let mockDocClient: jest.Mocked<AWS.DynamoDB.DocumentClient>;
  let repository: DDBSequencerMonitorRepository;

  beforeAll(() => {
    mockDocClient = jest.mocked(new AWS.DynamoDB.DocumentClient());
    repository = new DDBSequencerMonitorRepository(
      sequencerAddress,
      mockDocClient
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getConsequentWorkableBlocks", () => {
    it("should retrieve consequent workable blocks from DynamoDB", async () => {
      // Given
      const network = "0x123";
      const consequentWorkableBlocks = {
        "0x1": 5,
        "0x2": 3,
      };

      mockDocClient.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Item: {
            consequent_workable_blocks: consequentWorkableBlocks,
          },
        }),
      } as unknown as AWS.Request<AWS.DynamoDB.GetItemOutput, AWS.AWSError>);

      // When
      const result = await repository.getConsequentWorkableBlocks(network);

      // Then
      expect(mockDocClient.get).toHaveBeenCalledWith({
        TableName: "consequent-workable-blocks",
        Key: { network },
      });
      expect(result).toEqual(consequentWorkableBlocks);
    });

    it("should return an empty object if no data is found in DynamoDB", async () => {
      // Given
      const network = "0x123";

      mockDocClient.get.mockReturnValueOnce({
        promise: jest.fn().mockResolvedValue({
          Item: null,
        }),
      } as unknown as AWS.Request<AWS.DynamoDB.GetItemOutput, AWS.AWSError>);

      // When
      const result = await repository.getConsequentWorkableBlocks(network);

      // Then
      expect(mockDocClient.get).toHaveBeenCalledWith({
        TableName: "consequent-workable-blocks",
        Key: { network },
      });
      expect(result).toEqual({});
    });
  });

  describe("setConsequentWorkableBlocks", () => {
    it("should store consequent workable blocks in DynamoDB", async () => {
      // Given
      const network = "0x123";
      const consequentWorkableBlocks = {
        "0x1": 5,
        "0x2": 3,
      };

      mockDocClient.put.mockReturnValueOnce({
        promise: jest.fn().mockResolvedValue({}),
      } as unknown as AWS.Request<AWS.DynamoDB.GetItemOutput, AWS.AWSError>);

      // When
      await repository.setConsequentWorkableBlocks(
        network,
        consequentWorkableBlocks
      );

      // Then
      expect(mockDocClient.put).toHaveBeenCalledWith({
        TableName: "consequent-workable-blocks",
        Item: {
          network,
          consequent_workable_blocks: consequentWorkableBlocks,
        },
      });
    });
  });
});
