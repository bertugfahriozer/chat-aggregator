import axios from "axios";
import { v4 as uuidv4 } from "uuid";

export default class KickService {
  constructor(channelId, onMessage) {
    this.channelId = channelId;
    this.onMessage = onMessage;
    this.pollingInterval = null;
    this.seenMessageIds = new Set();
    this.seenQueue = [];
  }

  start() {
    this.pollingInterval = setInterval(() => {
      this.fetchMessages();
    }, 1000); // Poll every 1 seconds
  }

  async fetchMessages() {
    try {
      const response = await axios.get(
        `https://kick.com/api/v2/channels/${this.channelId}/messages`
      );

      // Extract messages array
      const messages = Array.isArray(response.data?.data?.messages)
        ? response.data.data.messages
        : [];
      if (messages.length === 0) {
        console.log("No new messages from Kick API");
        return;
      }

      messages.forEach((msg) => {
        const rawId = msg?.id ?? null;
        const id = rawId === null || rawId === undefined ? null : String(rawId);
        if (id && this.seenMessageIds.has(id)) return;
        if (id) {
          this.seenMessageIds.add(id);
          this.seenQueue.push(id);
          if (this.seenQueue.length > 2000) {
            const oldest = this.seenQueue.shift();
            if (oldest) this.seenMessageIds.delete(oldest);
          }
        }

        const createdAt = msg?.created_at || msg?.createdAt || msg?.timestamp || null;
        const message = {
          id: id || uuidv4(),
          username: msg.sender?.username || msg.sender?.name || "Unknown",
          text: msg.content || msg.message || "No content",
          platform: "kick",
          timestamp: createdAt,
        };
        this.onMessage(message);
      });
    } catch (error) {
      console.error(
        "Kick Polling Error:",
        error.response?.data || error.message
      );
    }
  }

  stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.seenMessageIds.clear();
    this.seenQueue = [];
  }
}
