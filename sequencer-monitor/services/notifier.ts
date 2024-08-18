import axios from "axios";

export interface Notifier {
  notify(message: string): Promise<void>;
}

export class DiscordNotifier implements Notifier {
  constructor(private readonly webhookUrl: string) {}

  public async notify(message: string): Promise<void> {
    if (message.length > 2000) {
      message = message.slice(0, 2000);
    }

    try {
      axios.post(this.webhookUrl, { content: message });
    } catch (error) {
      console.error("Error notifying discord", error);
    }
  }
}
