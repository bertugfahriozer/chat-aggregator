<template>
  <div class="chat-display" ref="chatContainer">
    <div v-if="messages.length === 0" class="empty-state">
      <i class="ri-chat-3-line"></i>
      <h3>Chat Mesajları Burada Görünecek</h3>
      <p v-if="!isConnected">Platformlara bağlanmak için yukarıdaki alanları doldurun ve "Bağlan" butonuna tıklayın.</p>
      <p v-else>Mesajlar yükleniyor...</p>
    </div>
    
    <div v-for="message in visibleMessages" :key="message.id" class="message" :class="message.platform">
      <div class="message-avatar">
        <i :class="`ri-${getIcon(message.platform)}`"></i>
      </div>
      <div class="message-content">
        <div class="message-header">
          <span class="username" :class="message.platform">{{ message.username || 'Bilinmeyen' }}</span>
          <span class="platform-badge" :class="message.platform">{{ getPlatformName(message.platform) }}</span>
          <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
        </div>
        <div class="message-text">{{ message.text || 'İçerik yok' }}</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChatDisplay',
  props: {
    messages: {
      type: Array,
      required: true,
    },
    isConnected: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    visibleMessages() {
      return this.messages.slice(-50); // Son 50 mesajı göster
    },
  },
  methods: {
    getIcon(platform) {
      const icons = {
        twitch: 'twitch-fill',
        youtube: 'youtube-fill', 
        kick: 'kick-fill',
      };
      return icons[platform] || 'chat-3-fill';
    },
    getPlatformName(platform) {
      const names = {
        twitch: 'Twitch',
        youtube: 'YouTube',
        kick: 'Kick',
      };
      return names[platform] || platform;
    },
    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    },
    scrollToBottom() {
      const container = this.$refs.chatContainer;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    },
    debounce(func, wait) {
      let timeout;
      return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    },
  },
  watch: {
    messages: {
      handler() {
        this.$nextTick(() => {
          this.debounce(this.scrollToBottom, 100)();
        });
      },
      deep: true,
    },
  },
  mounted() {
    console.log('ChatDisplay yüklendi, mesaj sayısı:', this.messages.length);
  },
};
</script>

<style scoped>
.chat-display {
  height: calc(100vh - 180px);
  overflow-y: auto;
  background: var(--bg-primary);
  padding: 16px 20px;
  scrollbar-width: thin;
  scrollbar-color: var(--accent-color) transparent;
}

.chat-display::-webkit-scrollbar {
  width: 6px;
}

.chat-display::-webkit-scrollbar-thumb {
  background: var(--accent-color);
  border-radius: 3px;
}

.chat-display::-webkit-scrollbar-track {
  background: transparent;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: var(--text-muted);
}

.empty-state i {
  font-size: 4em;
  color: var(--accent-color);
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 1.5em;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.empty-state p {
  font-size: 1em;
  line-height: 1.5;
  max-width: 400px;
}

.message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 8px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border-left: 4px solid var(--accent-color);
  transition: all 0.2s ease;
  animation: slideIn 0.3s ease-out;
}

.message:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.message-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2em;
  color: white;
}

.message.twitch .message-avatar {
  background: #9146FF;
}

.message.youtube .message-avatar {
  background: #FF0000;
}

.message.kick .message-avatar {
  background: #53FC18;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.username {
  font-weight: 600;
  font-size: 0.95em;
}

.username.twitch { color: #9146FF; }
.username.youtube { color: #FF0000; }
.username.kick { color: #53FC18; }

.platform-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75em;
  font-weight: 500;
  text-transform: uppercase;
  color: white;
}

.platform-badge.twitch { background: #9146FF; }
.platform-badge.youtube { background: #FF0000; }
.platform-badge.kick { background: #53FC18; }

.timestamp {
  font-size: 0.75em;
  color: var(--text-muted);
  margin-left: auto;
}

.message-text {
  color: var(--text-primary);
  line-height: 1.4;
  word-wrap: break-word;
  font-size: 0.95em;
}

.message.twitch {
  border-left-color: #9146FF;
}

.message.youtube {
  border-left-color: #FF0000;
}

.message.kick {
  border-left-color: #53FC18;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .chat-display {
    padding: 12px;
    height: calc(100vh - 220px);
  }
  
  .message {
    padding: 10px 12px;
  }
  
  .message-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .timestamp {
    margin-left: 0;
  }
}
</style>