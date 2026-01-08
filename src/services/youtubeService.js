import axios from "axios";

export default class YoutubeService {
  constructor(liveChatId, onMessage) {
    this.liveChatId = liveChatId;
    this.onMessage = onMessage;
    this.apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    this.pollingInterval = null;
    this.nextPageToken = "";
    this.seenMessageIds = new Set(); // Track seen message IDs for deduplication
    this.pollingIntervalMs = 1000; // Default polling interval (5 seconds)
  }

  async poll() {
    try {
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/liveChat/messages`,
        {
          params: {
            liveChatId: this.liveChatId,
            part: "id,snippet,authorDetails",
            key: this.apiKey,
            pageToken: this.nextPageToken || undefined,
          },
        }
      );
      const items = response.data.items || [];
      this.nextPageToken = response.data.nextPageToken;
      // Update polling interval based on API response
      this.pollingIntervalMs = response.data.pollingIntervalMillis || 5000;

      items.forEach((item) => {
        if (!this.seenMessageIds.has(item.id)) {
          this.seenMessageIds.add(item.id);
          this.onMessage({
            username: item.authorDetails.displayName,
            text: item.snippet.displayMessage,
            id: item.id, // Use YouTube's message ID for deduplication
            timestamp: item.snippet?.publishedAt || null,
          });
        }
      });

      // Clear old message IDs to prevent memory growth (keep last 1000)
      if (this.seenMessageIds.size > 1000) {
        const ids = Array.from(this.seenMessageIds);
        this.seenMessageIds = new Set(ids.slice(-1000));
      }

      // Schedule next poll
      this.scheduleNextPoll();
    } catch (error) {
      console.error(
        "YouTube API Polling Error:",
        error.response?.data || error.message
      );
      // Retry after a delay on error
      this.scheduleNextPoll();
    }
  }

  scheduleNextPoll() {
    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
    }
    this.pollingInterval = setTimeout(
      () => this.poll(),
      this.pollingIntervalMs
    );
  }

  start() {
    if (!this.pollingInterval) {
      this.poll(); // Start polling immediately
    }
  }

  stop() {
    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.seenMessageIds.clear();
  }
}
