<template>
  <div class="app-container">
    <div class="main-content">
      <template v-if="isSettingsRoute">
        <aside class="settings-sidebar">
          <Settings @update-settings="updateSettings" :initial-settings="initialSettings" />
        </aside>
      </template>

      <template v-else>
        <main class="chat-main">
          <ChatDisplay :messages="messages" @pin-message="handlePin" />
        </main>
      </template>
    </div>

    <!-- Pinned Message Overlay -->
    <PinnedMessageOverlay v-if="pinnedMessage" :message="pinnedMessage" @close="handlePin(null)" />
  </div>
</template>

<script>
import { mapState } from 'vuex';
import ChatDisplay from './components/ChatDisplay.vue';
import PinnedMessageOverlay from './components/PinnedMessageOverlay.vue';
import Settings from './components/Settings.vue';

export default {
  name: 'App',
  components: { ChatDisplay, Settings, PinnedMessageOverlay },
  data() {
    return {
      isSettingsRoute: false,
      pinnedMessage: null,
      initialSettings: {
        twitchChannel: '',
        youtubeLiveId: '',
        kickChannel: '',
      },
    };
  },
  computed: {
    ...mapState(['messages']),
  },
  watch: {
    messages: {
      handler(newMessages) {
        console.log('App.vue Messages:', newMessages.length);
      },
      deep: true,
      immediate: true,
    },
  },
  methods: {
    handlePin(msg) {
      this.pinnedMessage = msg;
    },
    updateSettings(settings) {
      console.log('App.vue: Updating settings:', settings);
      this.$store.dispatch('updateSettings', settings);

      // Save locally to persist between unmounts of Settings
      localStorage.setItem('chat_agg_settings', JSON.stringify(settings));
    },
    parseQueryParams() {
      const params = new URLSearchParams(window.location.search);
      return {
        twitchChannel: params.get('twitch') || '',
        youtubeLiveId: params.get('youtube_vid') || '',
        kickChannel: params.get('kick') || '',
      };
    },
  },
  mounted() {
    this.isSettingsRoute = window.location.pathname === '/settings';

    const queryParams = this.parseQueryParams();
    let savedSettings = null;
    try {
      savedSettings = JSON.parse(localStorage.getItem('chat_agg_settings'));
    } catch (e) { }

    this.initialSettings = {
      twitchChannel: queryParams.twitchChannel || savedSettings?.twitchChannel || '',
      youtubeLiveId: queryParams.youtubeLiveId || savedSettings?.youtubeLiveId || '',
      kickChannel: queryParams.kickChannel || savedSettings?.kickChannel || '',
    };

    // Auto-start services if any channel settings are provided
    if (this.initialSettings.twitchChannel || this.initialSettings.youtubeLiveId || this.initialSettings.kickChannel) {
      console.log('App.vue: Applying initial settings:', this.initialSettings);
      this.updateSettings(this.initialSettings);
    } else {
      console.log('App.vue: No settings found; waiting for user input.');
    }
  },
};
</script>

<style scoped>
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  font-family: "Inter", system-ui, sans-serif;
  background: var(--bg-primary);
  min-height: 100vh;
  transition: background 0.3s ease;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.app-header i {
  font-size: 2em;
  color: var(--accent-color);
  margin-right: 12px;
}

h1 {
  font-size: 1.8em;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
}

.theme-toggle {
  background: var(--accent-color);
  color: var(--bg-primary);
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  transition: background 0.2s ease;
}

.theme-toggle:hover {
  background: var(--accent-hover);
}

.theme-toggle i {
  font-size: 1.2em;
}

.main-content {
  display: flex;
}

.settings-sidebar {
  width: 0;
  /* Hidden settings UI */
  flex-shrink: 0;
}

.chat-main {
  flex: 1;
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }

  .settings-sidebar {
    width: 0;
  }
}
</style>
