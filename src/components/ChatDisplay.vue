<template>
  <div class="chat-shell">
    <div class="chat-messages" ref="chatContainer">
      <div v-if="!messages.length" class="empty-state">
        <div class="empty-title">No messages yet</div>
        <div class="empty-subtitle">Open Settings and click Start to connect chats.</div>
      </div>
      <div v-for="message in messages" :key="message.id" class="message" :class="message.platform">
        <div class="message-icon" aria-hidden="true">
          <i :class="`ri-${getIcon(message.platform)}`"></i>
        </div>
        <div class="message-body">
          <div class="message-top">
            <span class="username">{{ message.username || 'Unknown' }}</span>
            <span class="badge">{{ getLabel(message.platform) }}</span>
          </div>
          <div class="text">{{ message.text || 'No content' }}</div>
        </div>
      </div>
    </div>

    <form class="chat-composer" @submit.prevent="submitLocalMessage">
      <input
        v-model="draft"
        class="composer-input"
        placeholder="Type a local message… (/settings, /clear)"
        autocomplete="off"
        aria-label="Local test message"
      />
      <button class="composer-send" type="submit" :disabled="!draft.trim()">
        Send
      </button>
    </form>
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
  },
  emits: ['send-local'],
  data() {
    return {
      draft: '',
    };
  },
  methods: {
    getIcon(platform) {
      switch (platform) {
        case 'twitch':
          return 'twitch-fill';
        case 'youtube':
          return 'youtube-fill';
        case 'kick':
          return 'kick-fill';
        case 'system':
          return 'cpu-fill';
        case 'local':
          return 'chat-1-fill';
        default:
          return 'chat-3-fill';
      }
    },
    getLabel(platform) {
      switch (platform) {
        case 'twitch':
          return 'Twitch';
        case 'youtube':
          return 'YouTube';
        case 'kick':
          return 'Kick';
        case 'system':
          return 'System';
        case 'local':
          return 'Local';
        default:
          return 'Chat';
      }
    },
    debounce(func, wait) {
      let timeout;
      return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    },
    scrollToBottom() {
      const startTime = performance.now();
      const container = this.$refs.chatContainer;
      container.scrollTop = container.scrollHeight;
      const endTime = performance.now();
    },
    submitLocalMessage() {
      const text = (this.draft || '').trim();
      if (!text) return;
      this.$emit('send-local', text);
      this.draft = '';
      this.$nextTick(this.debounce(this.scrollToBottom, 50));
    },
  },
  watch: {
    messages: {
      handler(newMessages) {
        this.$nextTick(this.debounce(this.scrollToBottom, 100));
      },
      deep: true,
      immediate: true,
    },
  },
  mounted() {
    console.log('ChatDisplay Mounted, Initial Messages:', this.messages);
  },
};
</script>

<style scoped>
.chat-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  background: var(--glass-bg);
  border-radius: var(--radius-xl);
  padding: 14px;
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(16px) saturate(1.1);
  -webkit-backdrop-filter: blur(16px) saturate(1.1);
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 122, 24, 0.85) transparent;
  min-height: 0;
  box-shadow:
    inset 0 1px rgba(255, 255, 255, 0.05),
    inset 0 -14px 38px rgba(0, 0, 0, 0.22),
    var(--shadow-soft);
}
.chat-composer {
  display: flex;
  gap: 10px;
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: 10px;
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(16px) saturate(1.1);
  -webkit-backdrop-filter: blur(16px) saturate(1.1);
}
.composer-input {
  flex: 1;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  font-size: 0.95em;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
}
.composer-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-shadow);
}
.composer-send {
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: linear-gradient(90deg, rgba(255, 122, 24, 0.92), rgba(177, 0, 255, 0.92));
  color: rgba(255, 255, 255, 0.96);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 600;
  box-shadow:
    0 0 0 1px rgba(255, 122, 24, 0.18),
    0 10px 24px rgba(0, 0, 0, 0.24),
    0 0 26px rgba(177, 0, 255, 0.20);
}
.composer-send:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.composer-send:not(:disabled):hover {
  filter: brightness(1.08);
}
.empty-state {
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-xl);
  padding: 16px;
  border: 1px solid var(--glass-border);
  margin-bottom: 12px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.empty-title {
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.empty-subtitle {
  color: var(--text-secondary);
  font-size: 0.95em;
}
.chat-messages::-webkit-scrollbar {
  width: 8px;
}
.chat-messages::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(255, 122, 24, 0.95), rgba(177, 0, 255, 0.95));
  border-radius: 4px;
}
.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}
.message {
  --platform-color: rgba(255, 122, 24, 0.95);
  position: relative;
  display: grid;
  grid-template-columns: 38px 1fr;
  gap: 10px;
  padding: 12px 12px 12px 14px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(12px) saturate(1.05);
  -webkit-backdrop-filter: blur(12px) saturate(1.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.message::before {
  content: "";
  position: absolute;
  left: 8px;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 999px;
  background: var(--platform-color);
  box-shadow: 0 0 18px rgba(255, 122, 24, 0.22);
  opacity: 0.9;
}
.message:hover {
  transform: translateY(-2px);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.09),
    0 12px 30px rgba(0, 0, 0, 0.32),
    0 0 28px rgba(177, 0, 255, 0.20);
}
.message-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.18);
  box-shadow:
    inset 0 1px rgba(255, 255, 255, 0.06),
    0 10px 20px rgba(0, 0, 0, 0.22);
}
.message-icon i {
  font-size: 1.25em;
  color: var(--platform-color);
}
.message.twitch { --platform-color: #9146ff; }
.message.youtube { --platform-color: var(--accent-color); }
.message.kick { --platform-color: var(--neon-cyan); }
.message.local { --platform-color: rgba(255, 122, 24, 0.95); }
.message.system { --platform-color: var(--neon-purple); }
.message-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.message-top {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}
.username {
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.text {
  color: var(--text-secondary);
  line-height: 1.35;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.badge {
  flex: 0 0 auto;
  font-size: 0.72em;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-family: var(--font-display);
  color: var(--platform-color);
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.04);
  padding: 3px 8px;
  border-radius: 999px;
  opacity: 0.95;
}

@supports (color: color-mix(in srgb, white 50%, black)) {
  .message::before {
    box-shadow: 0 0 18px color-mix(in srgb, var(--platform-color) 40%, transparent);
  }
  .message:hover {
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.09),
      0 12px 30px rgba(0, 0, 0, 0.32),
      0 0 28px color-mix(in srgb, var(--platform-color) 26%, transparent);
  }
  .badge {
    color: color-mix(in srgb, var(--platform-color) 85%, white);
    border: 1px solid color-mix(in srgb, var(--platform-color) 42%, rgba(255, 255, 255, 0.10));
    background: color-mix(in srgb, var(--platform-color) 14%, transparent);
  }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.message {
  animation: fadeIn 0.3s ease-in;
}
</style>
