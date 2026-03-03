<template>
  <div class="settings">
    <h2><i class="ri-settings-3-fill"></i> Settings</h2>
    <div class="input-group">
      <label><i class="ri-twitch-fill"></i> Twitch Channel</label>
      <input v-model="twitchChannel" placeholder="Enter Twitch channel" />
    </div>
    <div class="input-group">
      <label><i class="ri-youtube-fill"></i> YouTube Channel Handle / ID</label>
      <input v-model="youtubeLiveId" placeholder="e.g. @MrBeast or UC..." />
    </div>
    <div class="input-group">
      <label><i class="ri-kick-fill"></i> Kick Channel</label>
      <input v-model="kickChannel" placeholder="Enter Kick channel" />
    </div>
    <button @click="saveSettings" class="save-button">
      <i class="ri-save-fill"></i> Save Settings
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
      }),
    },
  },
  data() {
    return {
      twitchChannel: this.initialSettings.twitchChannel,
      youtubeLiveId: this.initialSettings.youtubeLiveId,
      kickChannel: this.initialSettings.kickChannel,
    };
  },
  watch: {
    initialSettings: {
      handler(newSettings) {
        console.log('Settings.vue: Updated initialSettings:', newSettings);
        this.twitchChannel = newSettings.twitchChannel || this.twitchChannel;
        this.youtubeLiveId = newSettings.youtubeLiveId || this.youtubeLiveId;
        this.kickChannel = newSettings.kickChannel || this.kickChannel;
        // Auto-emit settings when initialSettings change
        this.saveSettings();
      },
      deep: true,
      immediate: true,
    },
  },
  methods: {
    saveSettings() {
      const settings = {
        twitchChannel: this.twitchChannel,
        youtubeLiveId: this.youtubeLiveId,
        kickChannel: this.kickChannel,
      };
      this.$emit('update-settings', settings);
    },
  },
};
</script>


<style scoped>
.settings {
  background: var(--bg-secondary);
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

h2 {
  font-size: 1.4em;
  color: var(--text-primary);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

h2 i {
  font-size: 1.5em;
  color: var(--accent-color);
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

label i.ri-twitch-fill {
  color: #7b55c7;
}

label i.ri-youtube-fill {
  color: #ff4d4d;
}

label i.ri-kick-fill {
  color: #2da592;
}

input {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9em;
}

input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-shadow);
}

.save-button {
  background: var(--accent-color);
  color: var(--bg-primary);
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  transition: background 0.2s ease;
}

.save-button:hover {
  background: var(--accent-hover);
}

.save-button i {
  font-size: 1.2em;
}
</style>
