import { Callback, Context } from "aws-lambda";

import { SequencerMonitor } from "../sequencer-monitor/services/sequencer-monitor";

jest.mock("../sequencer-monitor/services/sequencer-monitor");

describe("notify-unworked-jobs handler", () => {
  it("should call monitorUnworkableJobs with the correct arguments", async () => {
    // Given
    const mockMonitorUnworkableJobs = jest.fn();
    (SequencerMonitor as jest.Mock).mockImplementation(() => ({
      monitorUnworkableJobs: mockMonitorUnworkableJobs,
    }));
    const event = {
      blockNumber: 123456,
    };
    // Importing handler inside the test to avoid initializing resources before mocking
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { handler } = require("../sequencer-monitor/notify-unworked-jobs");

    // When
    await handler(event, {} as Context, {} as Callback);

    // Then
    expect(mockMonitorUnworkableJobs).toHaveBeenCalledWith(
      event.blockNumber,
      Number(process.env.CONSEQUENT_WORKABLE_JOBS_LIMIT!)
    );
  });
});
