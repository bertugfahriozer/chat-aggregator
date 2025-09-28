import axios from "axios";

export default class YoutubeService {
  constructor(liveChatId, onMessage) {
    this.liveChatId = liveChatId;
    this.onMessage = onMessage;
    this.apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    this.pollingInterval = null;
    this.nextPageToken = "";
    this.seenMessageIds = new Set();
    this.pollingIntervalMs = 2000; // 2 saniye
    this.isRunning = false;
  }

  async poll() {
    if (!this.isRunning) return;

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
      
      // API'den gelen polling interval'ı kullan
      this.pollingIntervalMs = response.data.pollingIntervalMillis || 2000;

      items.forEach((item) => {
        if (!this.seenMessageIds.has(item.id)) {
          this.seenMessageIds.add(item.id);
          this.onMessage({
            id: item.id,
            username: item.authorDetails.displayName || 'YouTube User',
            text: item.snippet.displayMessage || '',
            timestamp: new Date().toISOString(),
            avatarUrl: item.authorDetails.profileImageUrl,
          });
        }
      });

      // Eski mesaj ID'lerini temizle (memory optimization)
      if (this.seenMessageIds.size > 1000) {
        const ids = Array.from(this.seenMessageIds);
        this.seenMessageIds = new Set(ids.slice(-500));
      }

      this.scheduleNextPoll();
    } catch (error) {
      console.error(
        "YouTube API hatası:",
        error.response?.data || error.message
      );
      // Hata durumunda biraz bekleyip tekrar dene
      this.scheduleNextPoll(5000);
    }
  }

  scheduleNextPoll(customInterval = null) {
    if (!this.isRunning) return;
    
    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
    }
    
    const interval = customInterval || this.pollingIntervalMs;
    this.pollingInterval = setTimeout(() => this.poll(), interval);
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      console.log('YouTube servisi başlatıldı');
      this.poll(); // Hemen başlat
    }
  }

  stop() {
    this.isRunning = false;
    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.seenMessageIds.clear();
    this.nextPageToken = "";
    console.log('YouTube servisi durduruldu');
  }

  getConnectionStatus() {
    return this.isRunning;
  }
}