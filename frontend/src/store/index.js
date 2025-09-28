import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { createStore } from "vuex";
import KickService from "../services/kickService";
import TwitchService from "../services/twitchService";
import YoutubeService from "../services/youtubeService";

// YouTube API fonksiyonları
async function getLiveChatId(videoId, apiKey) {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos`,
      {
        params: {
          id: videoId,
          part: "liveStreamingDetails",
          key: apiKey,
        },
      }
    );
    return (
      response.data.items[0]?.liveStreamingDetails?.activeLiveChatId || null
    );
  } catch (error) {
    console.error(
      "YouTube liveChatId hatası:",
      error.response?.data || error.message
    );
    return null;
  }
}

// Kick API fonksiyonları
async function getKickChannelId(channelName) {
  try {
    const response = await axios.get(
      `https://kick.com/api/v2/channels/${channelName}`
    );
    return response.data.id;
  } catch (error) {
    console.error(
      "Kick kanal ID hatası:",
      error.response?.data || error.message
    );
    return null;
  }
}

export default createStore({
  state: {
    messages: [],
    settings: {
      twitchChannel: "",
      youtubeLiveId: "",
      kickChannel: "",
    },
    services: {
      twitch: null,
      youtube: null,
      kick: null,
    },
    messageIds: new Set(),
    maxMessages: 200, // Mesaj limiti artırıldı
    connectionStatus: {
      twitch: false,
      youtube: false,
      kick: false,
    },
  },
  mutations: {
    addMessage(state, message) {
      const messageId = message.id || uuidv4();
      const timestamp = message.timestamp || new Date().toISOString();
      
      if (!state.messageIds.has(messageId)) {
        state.messageIds.add(messageId);
        state.messages.push({ 
          ...message, 
          id: messageId,
          timestamp: timestamp
        });
        
        // Mesaj limitini kontrol et
        if (state.messages.length > state.maxMessages) {
          const removed = state.messages.shift();
          state.messageIds.delete(removed.id);
        }
      }
    },
    setSettings(state, settings) {
      state.settings = { ...settings };
    },
    setService(state, { platform, service }) {
      state.services[platform] = service;
    },
    setConnectionStatus(state, { platform, status }) {
      state.connectionStatus[platform] = status;
    },
    clearMessages(state) {
      state.messages = [];
      state.messageIds.clear();
    },
  },
  actions: {
    async updateSettings({ commit, state }, settings) {
      console.log('Servisler güncelleniyor:', settings);
      
      // Mevcut servisleri durdur
      Object.values(state.services).forEach((service) => {
        if (service && service.stop) {
          service.stop();
        }
      });
      
      // Mesajları temizle
      commit("clearMessages");
      
      // Bağlantı durumlarını sıfırla
      commit("setConnectionStatus", { platform: "twitch", status: false });
      commit("setConnectionStatus", { platform: "youtube", status: false });
      commit("setConnectionStatus", { platform: "kick", status: false });

      // Twitch servisi
      let twitchService = null;
      if (settings.twitchChannel) {
        try {
          twitchService = new TwitchService(
            settings.twitchChannel.toLowerCase().trim(),
            (message) => {
              commit("addMessage", { ...message, platform: "twitch" });
            }
          );
          await twitchService.start();
          commit("setConnectionStatus", { platform: "twitch", status: true });
          console.log('Twitch servisi başlatıldı:', settings.twitchChannel);
        } catch (error) {
          console.error('Twitch servisi hatası:', error);
        }
      }

      // YouTube servisi
      let youtubeService = null;
      if (settings.youtubeLiveId) {
        try {
          const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || 'demo_key';
          if (apiKey === 'demo_key') {
            console.warn('YouTube API key eksik. Demo modu aktif.');
            // Demo mesajlar için basit servis
            youtubeService = {
              start: () => {
                setInterval(() => {
                  commit("addMessage", {
                    platform: "youtube",
                    username: "Demo User",
                    text: "Bu demo YouTube mesajıdır. API key ekleyerek gerçek mesajları görebilirsiniz."
                  });
                }, 10000);
              },
              stop: () => {}
            };
          } else {
            const liveChatId = await getLiveChatId(settings.youtubeLiveId, apiKey);
            if (liveChatId) {
              youtubeService = new YoutubeService(liveChatId, (message) =>
                commit("addMessage", { ...message, platform: "youtube" })
              );
            } else {
              console.error("YouTube liveChatId alınamadı.");
            }
          }
          
          if (youtubeService) {
            youtubeService.start();
            commit("setConnectionStatus", { platform: "youtube", status: true });
            console.log('YouTube servisi başlatıldı:', settings.youtubeLiveId);
          }
        } catch (error) {
          console.error('YouTube servisi hatası:', error);
        }
      }

      // Kick servisi
      let kickService = null;
      if (settings.kickChannel) {
        try {
          const channelId = await getKickChannelId(settings.kickChannel.toLowerCase().trim());
          if (channelId) {
            kickService = new KickService(channelId, (message) =>
              commit("addMessage", { ...message, platform: "kick" })
            );
            kickService.start();
            commit("setConnectionStatus", { platform: "kick", status: true });
            console.log('Kick servisi başlatıldı:', settings.kickChannel);
          } else {
            console.error("Kick kanal ID alınamadı:", settings.kickChannel);
          }
        } catch (error) {
          console.error('Kick servisi hatası:', error);
        }
      }

      // Ayarları ve servisleri kaydet
      commit("setSettings", settings);
      commit("setService", { platform: "twitch", service: twitchService });
      commit("setService", { platform: "youtube", service: youtubeService });
      commit("setService", { platform: "kick", service: kickService });
    },
  },
  getters: {
    messagesByPlatform: (state) => (platform) => {
      return state.messages.filter(msg => msg.platform === platform);
    },
    isAnyServiceActive: (state) => {
      return Object.values(state.connectionStatus).some(status => status);
    },
    activeServices: (state) => {
      return Object.entries(state.connectionStatus)
        .filter(([platform, status]) => status)
        .map(([platform]) => platform);
    },
  },
});