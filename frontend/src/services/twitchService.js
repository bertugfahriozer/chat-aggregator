import tmi from 'tmi.js';

export default class TwitchService {
  constructor(channel, onMessage) {
    this.channel = channel.toLowerCase().replace('#', '');
    this.onMessage = onMessage;
    this.client = null;
    this.isConnected = false;
  }

  async start() {
    try {
      this.client = new tmi.Client({
        channels: [`#${this.channel}`],
        connection: {
          secure: true,
          reconnect: true,
        },
        options: {
          debug: false,
        },
      });

      this.client.on('message', (channel, tags, message, self) => {
        if (self) return; // Kendi mesajlarını yoksay
        
        this.onMessage({
          id: tags.id || `twitch_${Date.now()}_${Math.random()}`,
          username: tags['display-name'] || tags.username || 'Bilinmeyen',
          text: message,
          timestamp: new Date().toISOString(),
          badges: tags.badges || {},
          color: tags.color || '#9146FF',
        });
      });

      this.client.on('connected', () => {
        console.log(`Twitch ${this.channel} kanalına bağlandı`);
        this.isConnected = true;
      });

      this.client.on('disconnected', () => {
        console.log(`Twitch ${this.channel} kanalından bağlantı kesildi`);
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Twitch bağlantı hatası:', error);
      throw error;
    }
  }

  stop() {
    if (this.client && this.isConnected) {
      this.client.disconnect();
      this.isConnected = false;
      console.log(`Twitch ${this.channel} servisi durduruldu`);
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}