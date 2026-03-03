import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { createStore } from "vuex";
import KickService from "../services/kickService";
import TwitchService from "../services/twitchService";
import YoutubeService from "../services/youtubeService";

async function getKickChannelId(channelName) {
  try {
    const response = await axios.get(
      `https://kick.com/api/v2/channels/${channelName}`,
    );
    const data = await response.data;
    return data.id;
  } catch (error) {
    console.error(
      "Error fetching Kick channel ID:",
      error.response?.data || error.message,
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
    maxMessages: 100,
  },
  mutations: {
    addMessage(state, message) {
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
    },
  },
  actions: {
    async updateSettings({ commit, state }, settings) {
      Object.values(state.services).forEach((service) => service?.stop?.());
      commit("clearMessages");

      const twitch = settings.twitchChannel
        ? new TwitchService(settings.twitchChannel, (message) =>
            commit("addMessage", { ...message, platform: "twitch" }),
          )
        : null;

      let youtube = null;
      if (settings.youtubeLiveId) {
        youtube = new YoutubeService(settings.youtubeLiveId, (message) =>
          commit("addMessage", { ...message, platform: "youtube" }),
        );
      }

      let kick = null;
      if (settings.kickChannel) {
        const channelId = await getKickChannelId(settings.kickChannel);
        if (channelId) {
          kick = new KickService(channelId, (message) =>
            commit("addMessage", { ...message, platform: "kick" }),
          );
        } else {
          console.error("Failed to retrieve Kick channel ID.");
        }
      }

      twitch?.start();
      youtube?.start();
      kick?.start();

      commit("setSettings", settings);
      commit("setService", { platform: "twitch", service: twitch });
      commit("setService", { platform: "youtube", service: youtube });
      commit("setService", { platform: "kick", service: kick });
    },
  },
});
