import { Notifier } from "../../sequencer-monitor/services/notifier";
import { SequencerMonitor } from "../../sequencer-monitor/services/sequencer-monitor";
import { SequencerMonitorRepository } from "../../sequencer-monitor/repositories/sequencer-monitor";
import { ethers } from "ethers";

jest.mock("ethers");

describe("SequencerMonitor", () => {
  let sequencerMonitor: SequencerMonitor;

  let mockEthersProvider: jest.Mocked<ethers.AbstractProvider>;
  let mockSequencerContract: jest.Mocked<ethers.Contract>;
  let mockJobContract: jest.Mocked<ethers.Contract>;
  let mockSequencerMonitorRepository: jest.Mocked<SequencerMonitorRepository>;
  let mockNotifier: jest.Mocked<Notifier>;

  const sequencerAddress = "0xSequencerAddress";
  const mockJobAddresses = ["0xJobAddress1", "0xJobAddress2"];
  const mockNetwork = "0x123";
  const mockBlockNumber = 1234;
  const consequentBlocksLimit = 3;

  beforeEach(() => {
    mockEthersProvider = jest.mocked(new ethers.JsonRpcProvider());
    mockSequencerMonitorRepository = {
      getConsequentWorkableBlocks: jest.fn(),
      setConsequentWorkableBlocks: jest.fn(),
    } as unknown as jest.Mocked<SequencerMonitorRepository>;
    mockNotifier = {
      notify: jest.fn(),
    } as unknown as jest.Mocked<Notifier>;

    mockSequencerContract = {
      numJobs: jest.fn(),
      jobAt: jest.fn(),
      getMaster: jest.fn(),
    } as unknown as jest.Mocked<ethers.Contract>;
    mockJobContract = {
      workable: jest.fn(),
    } as unknown as jest.Mocked<ethers.Contract>;

    (ethers.Contract as jest.Mock).mockImplementation((address: string) => {
      if (address === sequencerAddress) {
        return mockSequencerContract;
      } else {
        return mockJobContract;
      }
    });

    sequencerMonitor = new SequencerMonitor(
      mockEthersProvider,
      sequencerAddress,
      mockSequencerMonitorRepository,
      mockNotifier
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("monitorUnworkableJobs", () => {
    it("should retrieve job addresses, statuses, and notify unworked jobs", async () => {
      // Given
      mockSequencerContract.numJobs.mockResolvedValue(BigInt(2));
      mockSequencerContract.jobAt
        .mockResolvedValueOnce(mockJobAddresses[0])
        .mockResolvedValueOnce(mockJobAddresses[1]);
      mockSequencerContract.getMaster.mockResolvedValue(mockNetwork);

      mockJobContract.workable
        .mockResolvedValueOnce([true])
        .mockResolvedValueOnce([false]);

      mockSequencerMonitorRepository.getConsequentWorkableBlocks.mockResolvedValue(
        {
          "0xJobAddress1": 2,
          "0xJobAddress2": 0,
        }
      );

      // When
      await sequencerMonitor.monitorUnworkableJobs(
        mockBlockNumber,
        consequentBlocksLimit
      );

      // Then
      expect(
        mockSequencerMonitorRepository.getConsequentWorkableBlocks
      ).toHaveBeenCalledWith(mockNetwork);
      expect(
        mockSequencerMonitorRepository.setConsequentWorkableBlocks
      ).toHaveBeenCalledWith(mockNetwork, {
        "0xJobAddress1": 3,
        "0xJobAddress2": 0,
      });

      expect(mockNotifier.notify).toHaveBeenCalledWith(
        expect.stringContaining("Unworked jobs detected")
      );
    });

    it("should not notify if no unworked jobs exceed the limit", async () => {
      // Given
      mockSequencerContract.numJobs.mockResolvedValue(BigInt(2));
      mockSequencerContract.jobAt
        .mockResolvedValueOnce(mockJobAddresses[0])
        .mockResolvedValueOnce(mockJobAddresses[1]);
      mockSequencerContract.getMaster.mockResolvedValue(mockNetwork);

      mockJobContract.workable
        .mockResolvedValueOnce([true])
        .mockResolvedValueOnce([false]);

      mockSequencerMonitorRepository.getConsequentWorkableBlocks.mockResolvedValue(
        {
          "0xJobAddress1": 1,
          "0xJobAddress2": 0,
        }
      );

      // When
      await sequencerMonitor.monitorUnworkableJobs(
        mockBlockNumber,
        consequentBlocksLimit
      );

      // Then
      expect(mockNotifier.notify).not.toHaveBeenCalled();
    });

    it("should reset consequent workable blocks if a job becomes unworkable", async () => {
      // Given
      mockSequencerContract.numJobs.mockResolvedValue(BigInt(1));
      mockSequencerContract.jobAt.mockResolvedValueOnce(mockJobAddresses[0]);
      mockSequencerContract.getMaster.mockResolvedValue(mockNetwork);

      mockJobContract.workable.mockResolvedValueOnce([false]);

      mockSequencerMonitorRepository.getConsequentWorkableBlocks.mockResolvedValue(
        {
          "0xJobAddress1": 2,
        }
      );

      // When
      await sequencerMonitor.monitorUnworkableJobs(
        mockBlockNumber,
        consequentBlocksLimit
      );

      // Then
      expect(
        mockSequencerMonitorRepository.setConsequentWorkableBlocks
      ).toHaveBeenCalledWith(mockNetwork, {
        "0xJobAddress1": 0,
      });
    });
  });

  describe("getJobAddresses", () => {
    it("should retrieve job addresses from the sequencer contract", async () => {
      // Given
      mockSequencerContract.numJobs.mockResolvedValue(BigInt(2));
      mockSequencerContract.jobAt
        .mockResolvedValueOnce(mockJobAddresses[0])
        .mockResolvedValueOnce(mockJobAddresses[1]);

      // When
      const jobAddresses = await sequencerMonitor["getJobAddresses"](
        mockBlockNumber
      );

      // Then
      expect(mockSequencerContract.numJobs).toHaveBeenCalledWith({
        blockTag: mockBlockNumber,
      });
      expect(mockSequencerContract.jobAt).toHaveBeenCalledTimes(2);
      expect(jobAddresses).toEqual(mockJobAddresses);
    });
  });

  describe("getMasterNetwork", () => {
    it("should retrieve the master network from the sequencer contract", async () => {
      // Given
      mockSequencerContract.getMaster.mockResolvedValue(mockNetwork);

      // When
      const network = await sequencerMonitor["getMasterNetwork"](
        mockBlockNumber
      );

      // Then
      expect(mockSequencerContract.getMaster).toHaveBeenCalledWith({
        blockTag: mockBlockNumber,
      });
      expect(network).toEqual(mockNetwork);
    });
  });
});
