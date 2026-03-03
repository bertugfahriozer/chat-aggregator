<template>
  <div class="chat-display" ref="chatContainer" @scroll="handleScroll">
    <div class="feed-inner">
      <transition-group name="list" tag="div" class="message-list">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message clickable"
          :class="message.platform"
          @click="$emit('pin-message', message)"
        >
          <span class="platform-icon" :class="message.platform">
            <i :class="`ri-${getIcon(message.platform)}`"></i>
          </span>
          <div class="content">
            <span class="username">{{ message.username || 'Unknown' }}</span>
            <span class="text">{{ message.text || 'No content' }}</span>
          </div>
        </div>
      </transition-group>
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
  },
  data() {
    return {
      isScrolledUp: false
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
        default:
          return 'chat-3-fill';
      }
    },
    handleScroll(e) {
      const { scrollTop, scrollHeight, clientHeight } = e.target;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
      this.isScrolledUp = !isAtBottom;
    },
    debounce(func, wait) {
      let timeout;
      return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    },
    scrollToBottom() {
      if(!this.isScrolledUp) {
        const container = this.$refs.chatContainer;
        if(container) {
          container.scrollTop = container.scrollHeight;
        }
      }
    },
  },
  watch: {
    messages: {
      handler() {
        this.$nextTick(this.debounce(this.scrollToBottom, 50));
      },
      deep: true,
      immediate: true,
    },
  },
};
</script>

<style scoped>
.chat-display {
  height: 100vh;
  overflow-y: hidden; /* Changed to hidden to match the smooth up scroll from React */
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.chat-display:hover {
  overflow-y: overlay; /* Allow scroll on hover if they want to pause */
}

.chat-display::-webkit-scrollbar {
  width: 6px;
}
.chat-display::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}
.chat-display::-webkit-scrollbar-track {
  background: transparent;
}

.feed-inner {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 100%;
  padding: 24px;
}

.message-list {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.message {
  display: flex;
  align-items: flex-start;
  padding: 12px 18px;
  background: rgba(40, 40, 50, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  margin-top: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;
  will-change: transform, opacity;
  transform-style: preserve-3d;
  color: #fff;
}

.message::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  border-radius: 4px 0 0 4px;
}
.message.twitch::before { background: var(--twitch, #9146FF); }
.message.youtube::before { background: var(--yt, #FF0000); }
.message.kick::before { background: var(--kick, #53FC18); }

.platform-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 14px;
  flex-shrink: 0;
  background: rgba(0,0,0,0.3);
}

.platform-icon i {
  font-size: 1.2em;
}
.platform-icon.twitch i { color: var(--twitch, #9146FF); }
.platform-icon.youtube i { color: var(--yt, #FF0000); }
.platform-icon.kick i { color: var(--kick, #53FC18); }

.content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  word-wrap: break-word;
  min-width: 0;
}

.username {
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
}
.username::after {
  content: ":";
  margin-left: 2px;
  opacity: 0.5;
}

.text {
  font-size: 16px;
  line-height: 1.4;
  font-weight: 500;
  color: #e2e8f0;
}

/* Clickable / Hover fx */
.msg.clickable, .message.clickable {
  cursor: pointer;
  transition: transform 0.2s, background 0.2s, box-shadow 0.2s;
}
.message.clickable:hover {
  transform: translateY(-2px) scale(1.02);
  background: rgba(30, 30, 38, 0.85);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
  z-index: 10;
}

/* Vue native transition-group animations */
.list-enter-active,
.list-leave-active,
.list-move {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.list-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.9);
}
.list-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
