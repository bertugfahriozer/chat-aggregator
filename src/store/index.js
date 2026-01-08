import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { createStore } from "vuex";
import KickService from "../services/kickService";
import TwitchService from "../services/twitchService";
import TwitchEventProxyService from "../services/twitchEventProxyService";
import YoutubeService from "../services/youtubeService";
import YoutubeProxyService from "../services/youtubeProxyService";

function timestampMs(value) {
  if (!value) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

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
      "Error fetching liveChatId:",
      error.response?.data || error.message
    );
    return null;
  }
}

async function getKickChannelId(channelName) {
  try {
    const response = await axios.get(
      `https://kick.com/api/v2/channels/${channelName}`
    );
    const data = await response.data;
    return data.id;
  } catch (error) {
    console.error(
      "Error fetching Kick channel ID:",
      error.response?.data || error.message
    );
    return null;
  }
}

async function fetchTwitchViewerCount(channel) {
  try {
    const response = await axios.get(`/api/viewers/twitch/${channel}`);
    return response.data?.viewers ?? null;
  } catch {
    return null;
  }
}

async function fetchKickViewerCount(channel) {
  try {
    const response = await axios.get(`/api/viewers/kick/${channel}`);
    return response.data?.viewers ?? null;
  } catch {
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
      twitchEventsEnabled: false,
      twitchClientId: "",
      twitchSystemName: "CHAOSFOUNDRY // SYS",
      twitchRequestedScopes: "channel:read:redemptions",
    },
    services: {
      twitch: null,
      youtube: null,
      kick: null,
      twitchEvents: null,
    },
    viewerCounts: {
      twitch: null,
      youtube: null,
      kick: null,
    },
    viewerCountPoller: null,
    messageIds: new Set(),
    maxMessages: 100,
    clearCutoffMs: 0,
  },
  mutations: {
    addMessage(state, message) {
      const cutoff = Number(state.clearCutoffMs || 0);
      if (cutoff) {
        const msgTime =
          timestampMs(message?.timestamp) ??
          timestampMs(message?.meta?.timestamp) ??
          timestampMs(message?.meta?.timestampMs);
        if (msgTime !== null && msgTime < cutoff) return;
      }

      const messageId = message.id || uuidv4();
      if (!state.messageIds.has(messageId)) {
        state.messageIds.add(messageId);
        state.messages.push({ ...message, id: messageId });
        if (state.messages.length > state.maxMessages) {
          const removed = state.messages.shift();
          state.messageIds.delete(removed.id);
        }
        const endTime = performance.now();
      }
    },
    setSettings(state, settings) {
      state.settings = { ...settings };
    },
    setService(state, { platform, service }) {
      state.services[platform] = service;
    },
    clearMessages(state) {
      state.messages = [];
      state.messageIds.clear();
      state.clearCutoffMs = Date.now();
    },
    setViewerCount(state, { platform, count }) {
      state.viewerCounts[platform] = count;
    },
    clearViewerCounts(state) {
      state.viewerCounts = { twitch: null, youtube: null, kick: null };
    },
    setViewerCountPoller(state, poller) {
      if (state.viewerCountPoller) {
        clearInterval(state.viewerCountPoller);
      }
      state.viewerCountPoller = poller;
    },
  },
  actions: {
    async updateSettings({ commit, state }, settings) {
      Object.values(state.services).forEach((service) => service?.stop?.());
      commit("clearMessages");
      commit("clearViewerCounts");
      commit("setViewerCountPoller", null);

      const twitch = settings.twitchChannel
        ? new TwitchService(settings.twitchChannel, (message) => {
            const isAlert = message?.meta?.eventType === "raid" || message?.meta?.eventType === "host";
            if (isAlert) {
              commit("addMessage", {
                ...message,
                username: settings.twitchSystemName || "CHAOSFOUNDRY // SYS",
                platform: "system",
              });
              return;
            }
            commit("addMessage", { ...message, platform: "twitch" });
          })
        : null;

      const twitchEvents = settings.twitchEventsEnabled
        ? new TwitchEventProxyService(
            { systemName: settings.twitchSystemName },
            (message) => commit("addMessage", { ...message, platform: "system" })
          )
        : null;

      let youtube = null;
      if (settings.youtubeLiveId) {
        const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
        if (apiKey) {
          const liveChatId = await getLiveChatId(settings.youtubeLiveId, apiKey);
          if (liveChatId) {
            youtube = new YoutubeService(liveChatId, (message) =>
              commit("addMessage", { ...message, platform: "youtube" })
            );
          } else {
            console.error("Failed to retrieve valid liveChatId.");
          }
        } else {
          youtube = new YoutubeProxyService(settings.youtubeLiveId, (message) =>
            commit("addMessage", { ...message, platform: "youtube" })
          );
        }
      }

      let kick = null;
      if (settings.kickChannel) {
        const channelId = await getKickChannelId(settings.kickChannel);
        if (channelId) {
          kick = new KickService(channelId, (message) =>
            commit("addMessage", { ...message, platform: "kick" })
          );
        } else {
          console.error("Failed to retrieve Kick channel ID.");
        }
      }

      twitch?.start();
      twitchEvents?.start();
      youtube?.start();
      kick?.start();

      commit("setSettings", settings);
      commit("setService", { platform: "twitch", service: twitch });
      commit("setService", { platform: "youtube", service: youtube });
      commit("setService", { platform: "kick", service: kick });
      commit("setService", { platform: "twitchEvents", service: twitchEvents });

      // Start viewer count polling if any platform is enabled (YouTube excluded - no ToS-compliant free API)
      const hasAnyPlatform = settings.twitchChannel || settings.kickChannel;
      if (hasAnyPlatform) {
        const fetchViewerCounts = async () => {
          if (settings.twitchChannel) {
            const count = await fetchTwitchViewerCount(settings.twitchChannel);
            commit("setViewerCount", { platform: "twitch", count });
          }
          if (settings.kickChannel) {
            const count = await fetchKickViewerCount(settings.kickChannel);
            commit("setViewerCount", { platform: "kick", count });
          }
        };
        // Fetch immediately, then poll every 30 seconds
        fetchViewerCounts();
        const poller = setInterval(fetchViewerCounts, 30000);
        commit("setViewerCountPoller", poller);
      }
    },
  },
});
