<template>
  <div v-if="isAuthCallback" class="auth-callback">
    <div class="auth-card">
      <div class="auth-title">Connecting Twitch…</div>
      <div class="auth-subtitle" v-if="authMessage">{{ authMessage }}</div>
      <div class="auth-subtitle error" v-if="authError">{{ authError }}</div>
    </div>
  </div>

  <div v-else class="app-container" :class="{ 'dark-theme': isDarkTheme }">
    <header class="app-header">
      <div class="header-left">
        <i class="ri-chat-heart-fill"></i>
        <h1>Chat Aggregator</h1>
      </div>
      <div class="header-right">
        <button @click="showSettings = true" class="settings-toggle">
          <i class="ri-settings-3-fill"></i>
          Settings
        </button>
        <button @click="toggleTheme" class="theme-toggle">
          <i :class="isDarkTheme ? 'ri-sun-fill' : 'ri-moon-fill'"></i>
          {{ isDarkTheme ? 'Light' : 'Dark' }}
        </button>
      </div>
    </header>
    <div class="main-content">
      <main class="chat-main">
        <ChatDisplay :messages="messages" @send-local="handleLocalSend" />
      </main>
    </div>

    <div v-if="showSettings" class="modal-backdrop" @click.self="closeSettings">
      <div class="modal">
        <Settings
          @update-settings="onSaveSettings"
          :initial-settings="initialSettings"
        />
        <div class="modal-actions">
          <button class="secondary" @click="stopAll">Stop</button>
          <button class="secondary" @click="clearSaved">Clear Saved</button>
          <button class="primary" @click="closeSettings">Close</button>
        </div>
        <p class="modal-hint">
          Tip: You can also configure via URL, e.g.
          <code>?twitch=channel&kick=channel&youtube_vid=VIDEO_ID</code>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import ChatDisplay from './components/ChatDisplay.vue';
import Settings from './components/Settings.vue';

const SETTINGS_STORAGE_KEY = 'chat-aggregator:settings';
const THEME_STORAGE_KEY = 'chat-aggregator:theme';
const TWITCH_OAUTH_STORAGE_KEY = 'chat-aggregator:twitch-oauth';

export default {
  name: 'App',
  components: { ChatDisplay, Settings },
  data() {
    return {
      isDarkTheme: false,
      showSettings: false,
      isAuthCallback: false,
      authMessage: '',
      authError: '',
      initialSettings: {
        twitchChannel: '',
        youtubeLiveId: '',
        kickChannel: '',
        twitchEventsEnabled: false,
        twitchClientId: '',
        twitchSystemName: 'CHAOSFOUNDRY // SYS',
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
    async handleTwitchAuthCallback() {
      this.isAuthCallback = true;
      this.authMessage = 'Finishing OAuth handshake…';
      this.authError = '';

      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      if (error) {
        this.authError = `${error}${errorDescription ? `: ${errorDescription}` : ''}`;
        try {
          window.opener && window.opener.postMessage({ type: 'twitch-auth', ok: false, error: this.authError }, '*');
        } catch {
          // ignore
        }
        return;
      }

      if (!code || !state) {
        this.authError = 'Missing OAuth parameters.';
        return;
      }

      let stored = null;
      try {
        stored = JSON.parse(localStorage.getItem(TWITCH_OAUTH_STORAGE_KEY) || 'null');
      } catch {
        stored = null;
      }

      if (!stored || stored.state !== state || !stored.codeVerifier || !stored.clientId || !stored.redirectUri) {
        localStorage.removeItem(TWITCH_OAUTH_STORAGE_KEY);
        this.authError = 'OAuth state mismatch (try Authenticate again).';
        return;
      }

      this.authMessage = 'Exchanging code…';
      try {
        const res = await fetch('/api/twitch/pkce/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: stored.clientId,
            clientSecret: stored.clientSecret || null,
            code,
            codeVerifier: stored.codeVerifier,
            redirectUri: stored.redirectUri,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }

        localStorage.removeItem(TWITCH_OAUTH_STORAGE_KEY);
        this.authMessage = 'Connected. You can close this tab.';

        try {
          window.opener && window.opener.postMessage({ type: 'twitch-auth', ok: true }, '*');
        } catch {
          // ignore
        }

        try {
          window.close();
        } catch {
          // ignore
        }
      } catch (err) {
        localStorage.removeItem(TWITCH_OAUTH_STORAGE_KEY);
        this.authError = String(err?.message || err);
        try {
          window.opener && window.opener.postMessage({ type: 'twitch-auth', ok: false, error: this.authError }, '*');
        } catch {
          // ignore
        }
      }
    },
    loadSavedSettings() {
      try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return {
          twitchChannel: parsed.twitchChannel || '',
          youtubeLiveId: parsed.youtubeLiveId || '',
          kickChannel: parsed.kickChannel || '',
          twitchEventsEnabled: Boolean(parsed.twitchEventsEnabled),
          twitchClientId: parsed.twitchClientId || '',
          twitchSystemName: parsed.twitchSystemName || 'CHAOSFOUNDRY // SYS',
        };
      } catch {
        return null;
      }
    },
    saveSettingsToStorage(settings) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    },
    updateSettings(settings) {
      console.log('App.vue: Updating settings:', settings);
      this.$store.dispatch('updateSettings', settings);
    },
    onSaveSettings(settings) {
      const normalized = {
        twitchChannel: settings.twitchChannel?.trim?.() || '',
        youtubeLiveId: settings.youtubeLiveId?.trim?.() || '',
        kickChannel: settings.kickChannel?.trim?.() || '',
        twitchEventsEnabled: Boolean(settings.twitchEventsEnabled),
        twitchClientId: settings.twitchClientId?.trim?.() || '',
        twitchSystemName: settings.twitchSystemName?.trim?.() || 'CHAOSFOUNDRY // SYS',
      };
      this.initialSettings = normalized;
      this.saveSettingsToStorage(normalized);
      this.updateSettings(normalized);
      this.showSettings = false;
    },
    handleLocalSend(text) {
      const command = (text || '').trim();
      if (!command) return;
      if (command === '/settings') {
        this.showSettings = true;
        return;
      }
      if (command === '/clear') {
        this.$store.commit('clearMessages');
        return;
      }
      this.$store.commit('addMessage', {
        username: 'You',
        text: command,
        platform: 'local',
      });
    },
    stopAll() {
      const empty = {
        twitchChannel: '',
        youtubeLiveId: '',
        kickChannel: '',
        twitchEventsEnabled: false,
        twitchClientId: '',
        twitchSystemName: 'CHAOSFOUNDRY // SYS',
      };
      this.initialSettings = empty;
      this.updateSettings(empty);
    },
    clearSaved() {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    },
    closeSettings() {
      this.showSettings = false;
    },
    toggleTheme() {
      this.isDarkTheme = !this.isDarkTheme;
      document.documentElement.setAttribute('data-theme', this.isDarkTheme ? 'dark' : 'light');
      localStorage.setItem(THEME_STORAGE_KEY, this.isDarkTheme ? 'dark' : 'light');
    },
    parseQueryParams() {
      const params = new URLSearchParams(window.location.search);
      return {
        twitchChannel: params.get('twitch') || '',
        youtubeLiveId: params.get('youtube_vid') || '',
        kickChannel: params.get('kick') || '',
        twitchEventsEnabled: params.get('twitch_events') === '1' || params.get('twitch_events') === 'true',
        twitchClientId: params.get('twitch_client') || '',
        twitchSystemName: params.get('twitch_system') || '',
        theme: params.get('theme') || '',
      };
    },
  },
  mounted() {
    if (window.location.pathname === '/auth/twitch') {
      this.handleTwitchAuthCallback();
      return;
    }

    const queryParams = this.parseQueryParams();
    const saved = this.loadSavedSettings();
    const merged = {
      twitchChannel: queryParams.twitchChannel || saved?.twitchChannel || '',
      youtubeLiveId: queryParams.youtubeLiveId || saved?.youtubeLiveId || '',
      kickChannel: queryParams.kickChannel || saved?.kickChannel || '',
      twitchEventsEnabled:
        queryParams.twitchEventsEnabled ||
        Boolean(saved?.twitchEventsEnabled) ||
        false,
      twitchClientId: queryParams.twitchClientId || saved?.twitchClientId || '',
      twitchSystemName:
        queryParams.twitchSystemName ||
        saved?.twitchSystemName ||
        'CHAOSFOUNDRY // SYS',
    };
    this.initialSettings = merged;

    // Set theme from query parameter or system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const theme =
      queryParams.theme ||
      savedTheme ||
      (prefersDark ? 'dark' : 'light');
    this.isDarkTheme = theme === 'dark';
    document.documentElement.setAttribute('data-theme', this.isDarkTheme ? 'dark' : 'light');
    console.log('App.vue: Applied theme:', this.isDarkTheme ? 'dark' : 'light');

    // Auto-start services if any settings are provided
    if (
      this.initialSettings.twitchChannel ||
      this.initialSettings.youtubeLiveId ||
      this.initialSettings.kickChannel ||
      this.initialSettings.twitchEventsEnabled
    ) {
      console.log('App.vue: Applying settings from URL:', this.initialSettings);
      this.updateSettings(this.initialSettings);
      this.saveSettingsToStorage(this.initialSettings);
    } else {
      console.log('App.vue: No query parameters provided; waiting for settings.');
      this.showSettings = true;
    }
  },
};
</script>

<style scoped>
.auth-callback {
  height: 100%;
  display: grid;
  place-items: center;
}
.auth-card {
  width: min(560px, 92vw);
  border-radius: var(--radius-xl);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg-strong);
  box-shadow: var(--shadow-strong);
  padding: 18px;
  backdrop-filter: blur(18px) saturate(1.15);
  -webkit-backdrop-filter: blur(18px) saturate(1.15);
}
.auth-title {
  font-family: var(--font-display);
  color: var(--text-primary);
  letter-spacing: -0.02em;
  font-size: 1.2em;
  margin-bottom: 8px;
}
.auth-subtitle {
  color: var(--text-secondary);
  line-height: 1.4;
  font-size: 0.95em;
}
.auth-subtitle.error {
  margin-top: 10px;
  color: var(--accent-color);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.88em;
  white-space: pre-wrap;
}

.app-container {
  max-width: 1200px;
  height: 100%;
  margin: 0 auto;
  font-family: var(--font-ui);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-strong);
  backdrop-filter: blur(18px) saturate(1.16);
  -webkit-backdrop-filter: blur(18px) saturate(1.16);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: clamp(8px, 1.4vw, 14px);
}
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg-strong);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(14px) saturate(1.18);
  -webkit-backdrop-filter: blur(14px) saturate(1.18);
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.header-left i {
  font-size: 2em;
  background: linear-gradient(135deg, var(--accent-color), var(--neon-purple));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
h1 {
  font-size: 1.8em;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
  font-family: var(--font-display);
  letter-spacing: -0.02em;
}
.header-right {
  display: flex;
  gap: 12px;
}
.theme-toggle {
  background: linear-gradient(90deg, rgba(255, 122, 24, 0.92), rgba(177, 0, 255, 0.92));
  color: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.10);
  padding: 8px 14px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  transition: background 0.2s ease;
  box-shadow:
    0 0 0 1px rgba(255, 122, 24, 0.18),
    0 10px 26px rgba(0, 0, 0, 0.24),
    0 0 28px rgba(177, 0, 255, 0.22);
}
.theme-toggle:hover {
  filter: brightness(1.08);
}
.theme-toggle i {
  font-size: 1.2em;
}
.settings-toggle {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  padding: 8px 14px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  backdrop-filter: blur(12px) saturate(1.1);
  -webkit-backdrop-filter: blur(12px) saturate(1.1);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.16);
}
.settings-toggle:hover {
  border-color: rgba(177, 0, 255, 0.55);
  box-shadow:
    0 10px 26px rgba(0, 0, 0, 0.20),
    0 0 24px rgba(255, 122, 24, 0.16);
}
.main-content {
  display: flex;
  flex: 1;
  min-height: 0;
}
.chat-main {
  flex: 1;
  min-height: 0;
}
@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.52);
  backdrop-filter: blur(10px) saturate(1.1);
  -webkit-backdrop-filter: blur(10px) saturate(1.1);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 16px;
  z-index: 1000;
}
.modal {
  width: min(560px, 100%);
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: 16px;
  box-shadow:
    0 0 0 1px rgba(177, 0, 255, 0.22),
    0 25px 70px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(18px) saturate(1.15);
  -webkit-backdrop-filter: blur(18px) saturate(1.15);
}
.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 12px;
}
.modal-actions button {
  border-radius: 12px;
  padding: 8px 12px;
  cursor: pointer;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
  backdrop-filter: blur(10px) saturate(1.08);
  -webkit-backdrop-filter: blur(10px) saturate(1.08);
}
.modal-actions button.primary {
  background: linear-gradient(90deg, var(--accent-color), var(--neon-purple));
  color: rgba(255, 255, 255, 0.96);
  border-color: transparent;
}
.modal-actions button.primary:hover {
  filter: brightness(1.08);
}
.modal-actions button.secondary:hover {
  border-color: var(--accent-color);
}
.modal-hint {
  margin-top: 12px;
  font-size: 0.85em;
  color: var(--text-secondary);
  line-height: 1.4;
}
.modal-hint code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.9em;
  padding: 2px 6px;
  border-radius: 8px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.04);
}
</style>
