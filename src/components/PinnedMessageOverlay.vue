<template>
  <transition name="pop">
    <div v-if="message" class="pinned-overlay" @click.self="$emit('close')">
      <div class="pinned-card" :class="message.platform">
        <button class="pinned-close" @click="$emit('close')">&times;</button>
        <div class="platform-icon large" :class="message.platform">
          <i :class="`ri-${getIcon(message.platform)}`"></i>
        </div>
        <div class="pinned-content">
          <div class="pinned-user">{{ message.username || 'Unknown' }}</div>
          <div class="pinned-text">{{ message.text || 'No content' }}</div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'PinnedMessageOverlay',
  props: {
    message: {
      type: Object,
      default: null
    }
  },
  methods: {
    getIcon(platform) {
      switch (platform) {
        case 'twitch': return 'twitch-fill';
        case 'youtube': return 'youtube-fill';
        case 'kick': return 'kick-fill';
        default: return 'chat-3-fill';
      }
    }
  }
}
</script>

<style scoped>
/* Scoped styles are handled globally via style.css for pop animation and card visuals
   so they can be shared easily with other components if needed. */
</style>
