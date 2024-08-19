import { DiscordNotifier } from "../../sequencer-monitor/services/notifier";
import axios from "axios";

jest.mock("axios");

describe("DiscordNotifier", () => {
  const webhookUrl = "https://test.com/api/webhooks/test-webhook";
  let notifier: DiscordNotifier;

  beforeEach(() => {
    notifier = new DiscordNotifier(webhookUrl);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should send a notification with the correct message", async () => {
    // Given
    const message = "Test message";

    // When
    await notifier.notify(message);

    // Then
    expect(axios.post).toHaveBeenCalledWith(webhookUrl, { content: message });
  });

  it("should truncate the message if it exceeds 2000 characters", async () => {
    // Given
    const longMessage = "a".repeat(2500);
    const truncatedMessage = longMessage.slice(0, 2000);

    // When
    await notifier.notify(longMessage);

    // Then
    expect(axios.post).toHaveBeenCalledWith(webhookUrl, {
      content: truncatedMessage,
    });
  });

  it("should handle errors during notification", async () => {
    // Given
    const message = "Test message";
    const error = new Error("Network error");
    (axios.post as jest.Mock).mockRejectedValue(error);
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // When
    await notifier.notify(message);

    // Then
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error notifying discord",
      error
    );
    consoleErrorSpy.mockRestore();
  });
});
