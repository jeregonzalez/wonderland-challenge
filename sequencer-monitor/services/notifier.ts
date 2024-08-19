import axios from "axios";

/**
 * Interface representing a notifier that sends notifications.
 */
export interface Notifier {
  notify(message: string): Promise<void>;
}

/**
 * A class that implements the `Notifier` interface and sends notifications
 * to a Discord channel using a webhook URL.
 */
export class DiscordNotifier implements Notifier {
  constructor(private readonly webhookUrl: string) {}

  /**
   * Sends a notification to the Discord channel using the configured webhook URL.
   * If the message exceeds 2000 characters (Discord's limit), it truncates the message.
   *
   * @param {string} message - The message to send as a notification.
   * @returns {Promise<void>} - A promise that resolves when the notification is sent.
   */
  public async notify(message: string): Promise<void> {
    if (message.length > 2000) {
      message = message.slice(0, 2000);
    }

    try {
      await axios.post(this.webhookUrl, { content: message });
    } catch (error) {
      console.error("Error notifying discord", error);
    }
  }
}
