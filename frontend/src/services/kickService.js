import axios from "axios";
import { v4 as uuidv4 } from "uuid";

export default class KickService {
  constructor(channelId, onMessage) {
    this.channelId = channelId;
    this.onMessage = onMessage;
    this.pollingInterval = null;
    this.seenMessageIds = new Set();
    this.isRunning = false;
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      console.log('Kick servisi başlatıldı, kanal ID:', this.channelId);
      this.pollingInterval = setInterval(() => {
        this.fetchMessages();
      }, 2000); // 2 saniyede bir kontrol et
    }
  }

  async fetchMessages() {
    if (!this.isRunning) return;

    try {
      const response = await axios.get(
        `https://kick.com/api/v2/channels/${this.channelId}/messages`,
        {
          timeout: 5000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      // API response yapısını kontrol et
      const messages = Array.isArray(response.data?.data?.messages)
        ? response.data.data.messages
        : Array.isArray(response.data?.messages)
        ? response.data.messages
        : [];

      if (messages.length === 0) {
        // Sessizce devam et, log spam'i önlemek için
        return;
      }

      messages.forEach((msg) => {
        const messageId = msg.id || msg.uuid || uuidv4();
        
        if (!this.seenMessageIds.has(messageId)) {
          this.seenMessageIds.add(messageId);
          
          const message = {
            id: messageId,
            username: msg.sender?.username || msg.user?.username || msg.author?.name || "Kick User",
            text: msg.content || msg.message || msg.text || "Mesaj içeriği yok",
            timestamp: msg.created_at || new Date().toISOString(),
          };
          
          this.onMessage(message);
        }
      });

      // Memory optimization - eski ID'leri temizle
      if (this.seenMessageIds.size > 1000) {
        const ids = Array.from(this.seenMessageIds);
        this.seenMessageIds = new Set(ids.slice(-500));
      }

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.warn('Kick API timeout - tekrar denenecek');
      } else if (error.response?.status === 429) {
        console.warn('Kick API rate limit - yavaşlatılıyor');
        // Rate limit durumunda biraz bekle
        setTimeout(() => {}, 5000);
      } else {
        console.error(
          "Kick API hatası:",
          error.response?.status || error.code,
          error.response?.statusText || error.message
        );
      }
    }
  }

  stop() {
    this.isRunning = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.seenMessageIds.clear();
    console.log('Kick servisi durduruldu');
  }

  getConnectionStatus() {
    return this.isRunning;
  }
}