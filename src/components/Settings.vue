<template>
  <div class="settings">
    <h2><i class="ri-settings-3-fill"></i> Settings</h2>
    <p class="hint">
      Enter one or more platforms and click <b>Start</b>. For YouTube without an API key, run the proxy with
      <code>npm run server</code> (or <code>npm run dev:yt</code>).
    </p>
    <div class="input-group">
      <label><i class="ri-twitch-fill"></i> Twitch Channel</label>
      <input v-model="twitchChannel" placeholder="Enter Twitch channel" />
    </div>
    <div class="twitch-events">
      <div class="section-title">
        <div class="section-title-left">
          <i class="ri-flashlight-fill"></i>
          <span>Twitch Events</span>
        </div>
        <label class="toggle">
          <input type="checkbox" v-model="twitchEventsEnabled" />
          <span class="toggle-pill" />
        </label>
      </div>
      <p class="hint subtle">
        Captures channel points via Twitch EventSub (requires one-time login). Raid alerts also appear via Twitch chat.
      </p>
      <div v-if="twitchEventsEnabled" class="events-grid">
        <div class="input-group">
          <label>System Name</label>
          <input v-model="twitchSystemName" placeholder="e.g. CHAOSFOUNDRY // SYS" />
        </div>
        <div class="input-group">
          <label>Twitch Client ID</label>
          <input v-model="twitchClientId" placeholder="From dev.twitch.tv → your app" />
        </div>
        <div class="input-group">
          <label>Twitch Client Secret (if required)</label>
          <input v-model="twitchClientSecret" type="password" placeholder="Optional (kept only for this auth)" />
        </div>
        <div class="input-group">
          <label>Requested OAuth Scopes</label>
          <input
            v-model="twitchRequestedScopes"
            placeholder="channel:read:redemptions"
          />
        </div>
        <div class="events-actions">
          <button class="secondary" @click="startTwitchAuth" :disabled="!twitchClientId.trim()">
            <i class="ri-login-circle-line"></i> Authenticate
          </button>
          <button class="secondary" @click="logoutTwitch" :disabled="!twitchStatus?.hasAuth">
            <i class="ri-logout-circle-line"></i> Logout
          </button>
          <button class="secondary" @click="refreshTwitchStatus">
            <i class="ri-refresh-line"></i> Status
          </button>
        </div>
        <div class="events-status" v-if="twitchStatus">
          <div class="status-row">
            <span class="status-label">Auth</span>
            <span class="status-value" :class="{ good: twitchStatus.hasAuth, bad: !twitchStatus.hasAuth }">
              {{ twitchStatus.hasAuth ? 'OK' : 'Missing' }}
            </span>
          </div>
          <div class="status-row">
            <span class="status-label">Connected</span>
            <span class="status-value" :class="{ good: twitchStatus.connected, bad: !twitchStatus.connected }">
              {{ twitchStatus.connected ? 'Yes' : 'No' }}
            </span>
          </div>
          <div class="status-row" v-if="twitchStatus.login">
            <span class="status-label">User</span>
            <span class="status-value">{{ twitchStatus.login }}</span>
          </div>
        </div>
        <p class="hint subtle warn" v-if="twitchAuthWarning">
          {{ twitchAuthWarning }}
        </p>
        <p class="hint subtle">
          Twitch app redirect URL: <code>{{ twitchRedirectUrl }}</code>
        </p>
      </div>
    </div>
    <div class="input-group">
      <label><i class="ri-youtube-fill"></i> YouTube Live Video ID</label>
      <input v-model="youtubeLiveId" placeholder="e.g. dQw4w9WgXcQ" />
    </div>
    <div class="input-group">
      <label><i class="ri-kick-fill"></i> Kick Channel</label>
      <input v-model="kickChannel" placeholder="Enter Kick channel" />
    </div>
    <button @click="saveSettings" class="save-button" :disabled="!hasAnyValue">
      <i class="ri-play-fill"></i> Start
    </button>
  </div>
</template>

<script>
export default {
  name: 'Settings',
  props: {
    initialSettings: {
      type: Object,
      default: () => ({
        twitchChannel: '',
        youtubeLiveId: '',
        kickChannel: '',
        twitchEventsEnabled: false,
        twitchClientId: '',
        twitchSystemName: 'CHAOSFOUNDRY // SYS',
        twitchRequestedScopes: 'channel:read:redemptions',
      }),
    },
  },
  data() {
    return {
      twitchChannel: this.initialSettings.twitchChannel,
      youtubeLiveId: this.initialSettings.youtubeLiveId,
      kickChannel: this.initialSettings.kickChannel,
      twitchEventsEnabled: Boolean(this.initialSettings.twitchEventsEnabled),
      twitchClientId: this.initialSettings.twitchClientId || '',
      twitchSystemName: this.initialSettings.twitchSystemName || 'CHAOSFOUNDRY // SYS',
      twitchRequestedScopes:
        this.initialSettings.twitchRequestedScopes || 'channel:read:redemptions',
      twitchStatus: null,
      twitchAuthWarning: '',
      twitchClientSecret: '',
    };
  },
  computed: {
    twitchRedirectUrl() {
      try {
        if (window.location.protocol === 'https:') {
          return new URL('/auth/twitch', window.location.origin).toString();
        }
        return 'https://localhost:5173/auth/twitch';
      } catch {
        return 'https://localhost:5173/auth/twitch';
      }
    },
    hasAnyValue() {
      return Boolean(
        (this.twitchChannel || '').trim() ||
          (this.youtubeLiveId || '').trim() ||
          (this.kickChannel || '').trim() ||
          this.twitchEventsEnabled
      );
    },
  },
  watch: {
    initialSettings: {
      handler(newSettings) {
        console.log('Settings.vue: Updated initialSettings:', newSettings);
        this.twitchChannel = newSettings.twitchChannel || '';
        this.youtubeLiveId = newSettings.youtubeLiveId || '';
        this.kickChannel = newSettings.kickChannel || '';
        this.twitchEventsEnabled = Boolean(newSettings.twitchEventsEnabled);
        this.twitchClientId = newSettings.twitchClientId || '';
        this.twitchSystemName = newSettings.twitchSystemName || 'CHAOSFOUNDRY // SYS';
        this.twitchRequestedScopes =
          newSettings.twitchRequestedScopes || 'channel:read:redemptions';
      },
      deep: true,
    },
  },
  methods: {
    saveSettings() {
      const settings = {
        twitchChannel: this.twitchChannel,
        youtubeLiveId: this.youtubeLiveId,
        kickChannel: this.kickChannel,
        twitchEventsEnabled: this.twitchEventsEnabled,
        twitchClientId: this.twitchClientId,
        twitchSystemName: this.twitchSystemName,
        twitchRequestedScopes: this.twitchRequestedScopes,
      };
      this.$emit('update-settings', settings);
    },
    async refreshTwitchStatus() {
      try {
        const res = await fetch('/api/twitch/status');
        if (!res.ok) return;
        this.twitchStatus = await res.json();
      } catch {
        // ignore
      }
    },
    base64UrlFromBytes(bytes) {
      let binary = '';
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    },
    randomBase64Url(byteLength = 32) {
      const bytes = new Uint8Array(byteLength);
      crypto.getRandomValues(bytes);
      return this.base64UrlFromBytes(bytes);
    },
    async sha256Base64Url(input) {
      const data = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return this.base64UrlFromBytes(new Uint8Array(digest));
    },
    async startTwitchAuth() {
      this.twitchAuthWarning = '';
      const clientId = (this.twitchClientId || '').trim();
      if (!clientId) return;

      if (window.location.protocol !== 'https:') {
        this.twitchAuthWarning = 'Twitch requires an HTTPS redirect URL. Start the app with `npm run dev:all:https`.';
        return;
      }

      if ((this.twitchClientSecret || '').trim()) {
        this.twitchAuthWarning =
          'Client Secret is only used locally (sent to your local server) and is not saved in Settings (the local server may keep it to refresh tokens).';
      }

      const state = this.randomBase64Url(18);
      const codeVerifier = this.randomBase64Url(48);
      const codeChallenge = await this.sha256Base64Url(codeVerifier);
      const redirectUri = new URL('/auth/twitch', window.location.origin).toString();

      localStorage.setItem(
        'chat-aggregator:twitch-oauth',
        JSON.stringify({
          state,
          codeVerifier,
          clientId,
          clientSecret: (this.twitchClientSecret || '').trim() || null,
          redirectUri,
        })
      );

      const scopesRaw = (this.twitchRequestedScopes || '').trim();
      const scopes = scopesRaw ? scopesRaw.split(/\s+/g).filter(Boolean) : ['channel:read:redemptions'];
      const authorize = new URL('https://id.twitch.tv/oauth2/authorize');
      authorize.searchParams.set('response_type', 'code');
      authorize.searchParams.set('client_id', clientId);
      authorize.searchParams.set('redirect_uri', redirectUri);
      authorize.searchParams.set('scope', scopes.join(' '));
      authorize.searchParams.set('state', state);
      authorize.searchParams.set('code_challenge', codeChallenge);
      authorize.searchParams.set('code_challenge_method', 'S256');

      window.open(authorize.toString(), 'twitch-auth', 'width=520,height=720');
    },
    async logoutTwitch() {
      try {
        await fetch('/api/twitch/logout', { method: 'POST' });
      } catch {
        // ignore
      } finally {
        await this.refreshTwitchStatus();
      }
    },
  },
  mounted() {
    this.refreshTwitchStatus();
    this._onAuthMessage = (event) => {
      if (!event?.data || event.data.type !== 'twitch-auth') return;
      this.refreshTwitchStatus();
    };
    window.addEventListener('message', this._onAuthMessage);
  },
  beforeUnmount() {
    window.removeEventListener('message', this._onAuthMessage);
  },
};
</script>


<style scoped>
.settings {
  background: rgba(255, 255, 255, 0.04);
  padding: 16px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(14px) saturate(1.1);
  -webkit-backdrop-filter: blur(14px) saturate(1.1);
}
.hint {
  margin: 8px 0 16px;
  color: var(--text-secondary);
  font-size: 0.9em;
  line-height: 1.4;
}
.hint.subtle {
  opacity: 0.9;
  margin-top: 10px;
}
.hint.subtle.warn {
  color: var(--accent-color);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.88em;
}
.hint code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.9em;
  padding: 2px 6px;
  border-radius: 8px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.04);
}
h2 {
  font-size: 1.4em;
  color: var(--text-primary);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  letter-spacing: -0.02em;
}
h2 i {
  font-size: 1.5em;
  background: linear-gradient(135deg, var(--accent-color), var(--neon-purple));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.input-group {
  margin-bottom: 16px;
}
label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
label i {
  font-size: 1.2em;
}
label i.ri-twitch-fill { color: #9146ff; }
label i.ri-youtube-fill { color: var(--accent-color); }
label i.ri-kick-fill { color: var(--neon-cyan); }
input {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font-size: 0.9em;
}
input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-shadow);
}

.twitch-events {
  margin: 2px 0 16px;
  padding: 12px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.02);
}
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}
.section-title-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-display);
  letter-spacing: -0.01em;
}
.section-title-left i {
  color: var(--neon-purple);
}
.events-grid {
  margin-top: 10px;
}
.events-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.events-actions .secondary {
  border-radius: var(--radius-lg);
  padding: 10px 12px;
  cursor: pointer;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
  backdrop-filter: blur(10px) saturate(1.08);
  -webkit-backdrop-filter: blur(10px) saturate(1.08);
}
.events-actions .secondary:hover {
  border-color: rgba(177, 0, 255, 0.55);
}
.events-actions .secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.events-status {
  margin-top: 10px;
  padding: 10px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.14);
}
.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 2px;
}
.status-label {
  color: var(--text-secondary);
  font-size: 0.9em;
}
.status-value {
  color: var(--text-primary);
  font-weight: 600;
}
.status-value.good {
  color: var(--neon-cyan);
}
.status-value.bad {
  color: var(--accent-color);
}
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}
.toggle input {
  display: none;
}
.toggle-pill {
  width: 44px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.18);
  position: relative;
  transition: background 0.18s ease, border-color 0.18s ease;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.08);
}
.toggle-pill::after {
  content: "";
  width: 18px;
  height: 18px;
  border-radius: 999px;
  position: absolute;
  top: 50%;
  left: 3px;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.86);
  transition: left 0.18s ease;
}
.toggle input:checked + .toggle-pill {
  border-color: rgba(255, 122, 24, 0.55);
  background: rgba(177, 0, 255, 0.20);
}
.toggle input:checked + .toggle-pill::after {
  left: 23px;
  background: rgba(255, 122, 24, 0.92);
}
.save-button {
  background: linear-gradient(90deg, rgba(255, 122, 24, 0.92), rgba(177, 0, 255, 0.92));
  color: rgba(255, 255, 255, 0.96);
  border: none;
  padding: 10px 16px;
  border-radius: var(--radius-lg);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  transition: background 0.2s ease;
  box-shadow:
    0 0 0 1px rgba(255, 122, 24, 0.18),
    0 10px 22px rgba(0, 0, 0, 0.22);
}
.save-button:hover {
  filter: brightness(1.08);
}
.save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  filter: none;
}
.save-button i {
  font-size: 1.2em;
}
</style>
