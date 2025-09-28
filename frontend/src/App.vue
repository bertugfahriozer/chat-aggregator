<template>
  <div class="app-container" :class="{ 'dark-theme': isDarkTheme }">
    <header class="app-header">
      <div class="header-left">
        <i class="ri-chat-heart-fill"></i>
        <h1>Multi-Platform Chat Aggregator</h1>
      </div>
      <div class="header-right">
        <div class="connection-status" :class="{ active: isConnected }">
          <i :class="isConnected ? 'ri-wifi-line' : 'ri-wifi-off-line'"></i>
          <span>{{ isConnected ? 'Bağlı' : 'Bağlantı Yok' }}</span>
        </div>
        <button @click="toggleTheme" class="theme-toggle" title="Tema Değiştir">
          <i :class="isDarkTheme ? 'ri-sun-fill' : 'ri-moon-fill'"></i>
        </button>
        <button @click="clearAllMessages" class="clear-btn" title="Mesajları Temizle">
          <i class="ri-delete-bin-line"></i>
        </button>
      </div>
    </header>
    
    <div class="controls-bar">
      <div class="platform-settings">
        <div class="input-group">
          <i class="ri-twitch-fill twitch-icon"></i>
          <input 
            v-model="tempSettings.twitchChannel" 
            placeholder="Twitch kanal adı"
            @keyup.enter="updateSettings"
            class="platform-input twitch"
          />
        </div>
        <div class="input-group">
          <i class="ri-youtube-fill youtube-icon"></i>
          <input 
            v-model="tempSettings.youtubeLiveId" 
            placeholder="YouTube video ID"
            @keyup.enter="updateSettings"
            class="platform-input youtube"
          />
        </div>
        <div class="input-group">
          <i class="ri-kick-fill kick-icon"></i>
          <input 
            v-model="tempSettings.kickChannel" 
            placeholder="Kick kanal adı"
            @keyup.enter="updateSettings"
            class="platform-input kick"
          />
        </div>
        <button @click="updateSettings" class="connect-btn">
          <i class="ri-play-fill"></i>
          Bağlan
        </button>
      </div>
    </div>

    <div class="main-content">
      <ChatDisplay :messages="messages" :isConnected="isConnected" />
    </div>
    
    <div class="status-bar">
      <span class="message-count">{{ messages.length }} mesaj</span>
      <span class="platform-status" v-if="activeServices.length > 0">
        Aktif: {{ activeServices.join(', ') }}
      </span>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import ChatDisplay from './components/ChatDisplay.vue';

export default {
  name: 'App',
  components: { ChatDisplay },
  data() {
    return {
      isDarkTheme: false,
      isConnected: false,
      tempSettings: {
        twitchChannel: '',
        youtubeLiveId: '',
        kickChannel: '',
      },
    };
  },
  computed: {
    ...mapState(['messages', 'settings', 'services']),
    activeServices() {
      const active = [];
      if (this.services.twitch) active.push('Twitch');
      if (this.services.youtube) active.push('YouTube');
      if (this.services.kick) active.push('Kick');
      return active;
    },
  },
  watch: {
    messages: {
      handler(newMessages) {
        this.isConnected = this.activeServices.length > 0;
        console.log('Toplam mesaj sayısı:', newMessages.length);
      },
      immediate: true,
    },
  },
  methods: {
    updateSettings() {
      console.log('Ayarlar güncelleniyor:', this.tempSettings);
      this.$store.dispatch('updateSettings', { ...this.tempSettings });
    },
    clearAllMessages() {
      this.$store.commit('clearMessages');
    },
    toggleTheme() {
      this.isDarkTheme = !this.isDarkTheme;
      document.documentElement.setAttribute('data-theme', this.isDarkTheme ? 'dark' : 'light');
      localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
    },
    parseQueryParams() {
      const params = new URLSearchParams(window.location.search);
      return {
        twitchChannel: params.get('twitch') || '',
        youtubeLiveId: params.get('youtube_vid') || '',
        kickChannel: params.get('kick') || '',
        theme: params.get('theme') || '',
      };
    },
    loadTheme() {
      const savedTheme = localStorage.getItem('theme');
      const queryParams = this.parseQueryParams();
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      this.isDarkTheme = 
        queryParams.theme === 'dark' || 
        savedTheme === 'dark' || 
        (queryParams.theme !== 'light' && savedTheme !== 'light' && prefersDark);
      
      document.documentElement.setAttribute('data-theme', this.isDarkTheme ? 'dark' : 'light');
    },
  },
  mounted() {
    this.loadTheme();
    
    const queryParams = this.parseQueryParams();
    
    // URL parametrelerini input'lara yükle
    this.tempSettings = {
      twitchChannel: queryParams.twitchChannel,
      youtubeLiveId: queryParams.youtubeLiveId,  
      kickChannel: queryParams.kickChannel,
    };

    // Eğer URL'de parametreler varsa otomatik başlat
    if (queryParams.twitchChannel || queryParams.youtubeLiveId || queryParams.kickChannel) {
      console.log('URL parametreleri ile otomatik başlatılıyor:', this.tempSettings);
      this.updateSettings();
    }
  },
};
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: var(--bg-secondary);
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid var(--accent-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left i {
  font-size: 2em;
  color: var(--accent-color);
}

.header-left h1 {
  font-size: 1.5em;
  font-weight: 600;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 0.9em;
  transition: all 0.3s ease;
}

.connection-status.active {
  background: var(--accent-color);
  color: white;
}

.theme-toggle, .clear-btn {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle:hover, .clear-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.controls-bar {
  background: var(--bg-primary);
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.platform-settings {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.input-group {
  display: flex;
  align-items: center;
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 8px 12px;
  gap: 8px;
  min-width: 200px;
}

.input-group i {
  font-size: 1.2em;
}

.twitch-icon { color: #9146FF; }
.youtube-icon { color: #FF0000; }
.kick-icon { color: #53FC18; }

.platform-input {
  border: none;
  background: transparent;
  color: var(--text-primary);
  flex: 1;
  padding: 4px;
  font-size: 0.9em;
}

.platform-input:focus {
  outline: none;
}

.platform-input::placeholder {
  color: var(--text-muted);
}

.connect-btn {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.connect-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.main-content {
  flex: 1;
  padding: 0;
}

.status-bar {
  background: var(--bg-secondary);
  padding: 8px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85em;
  color: var(--text-secondary);
  border-top: 1px solid var(--border-color);
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }
  
  .platform-settings {
    flex-direction: column;
    align-items: stretch;
  }
  
  .input-group {
    min-width: auto;
  }
  
  .status-bar {
    flex-direction: column;
    gap: 4px;
    text-align: center;
  }
}
</style>