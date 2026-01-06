<template>
  <div class="viewer-counts" v-if="hasAnyCount">
    <div
      v-for="platform in activePlatforms"
      :key="platform.key"
      class="viewer-item"
      :class="platform.key"
    >
      <i :class="`ri-${platform.icon}`"></i>
      <span class="count">{{ formatCount(platform.count) }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ViewerCount',
  props: {
    viewerCounts: {
      type: Object,
      required: true,
    },
  },
  computed: {
    activePlatforms() {
      const platforms = [];
      if (this.viewerCounts.twitch !== null) {
        platforms.push({
          key: 'twitch',
          icon: 'twitch-fill',
          count: this.viewerCounts.twitch,
        });
      }
      if (this.viewerCounts.youtube !== null) {
        platforms.push({
          key: 'youtube',
          icon: 'youtube-fill',
          count: this.viewerCounts.youtube,
        });
      }
      if (this.viewerCounts.kick !== null) {
        platforms.push({
          key: 'kick',
          icon: 'eye-fill',
          count: this.viewerCounts.kick,
        });
      }
      return platforms;
    },
    hasAnyCount() {
      return this.activePlatforms.length > 0;
    },
  },
  methods: {
    formatCount(count) {
      if (count === null || count === undefined) return '--';
      if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
      }
      if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
      }
      return count.toLocaleString();
    },
  },
};
</script>

<style scoped>
.viewer-counts {
  display: flex;
  gap: 8px;
  align-items: center;
}

.viewer-item {
  --platform-color: var(--accent-color);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  font-size: 0.85em;
  font-weight: 600;
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.viewer-item:hover {
  border-color: var(--platform-color);
  box-shadow: 0 0 12px color-mix(in srgb, var(--platform-color) 30%, transparent);
}

.viewer-item i {
  font-size: 1.1em;
  color: var(--platform-color);
}

.viewer-item.twitch {
  --platform-color: #9146ff;
}

.viewer-item.youtube {
  --platform-color: #ff0000;
}

.viewer-item.kick {
  --platform-color: #53fc18;
}

.count {
  font-family: var(--font-display);
  letter-spacing: -0.02em;
}

@media (max-width: 480px) {
  .viewer-counts {
    gap: 4px;
  }
  .viewer-item {
    padding: 4px 8px;
    font-size: 0.8em;
  }
}
</style>
