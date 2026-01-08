function joinUrl(base, path) {
  if (!base) return path;
  const trimmedBase = base.replace(/\/+$/, "");
  const trimmedPath = path.replace(/^\/+/, "");
  return `${trimmedBase}/${trimmedPath}`;
}

export default class YoutubeProxyService {
  constructor(liveId, onMessage) {
    this.liveId = liveId;
    this.onMessage = onMessage;
    this.eventSource = null;
    this.seenMessageIds = new Set();
  }

  start() {
    if (this.eventSource) return;

    const baseUrl = import.meta.env.VITE_YOUTUBE_PROXY_URL || "";
    const url = joinUrl(
      baseUrl,
      `/api/youtube/sse?liveId=${encodeURIComponent(this.liveId)}`
    );

    this.eventSource = new EventSource(url);
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type) return; // ignore status/error messages
        if (data?.id && this.seenMessageIds.has(data.id)) return;
        if (data?.id) this.seenMessageIds.add(data.id);

        this.onMessage({
          id: data?.id,
          username: data?.username,
          text: data?.text,
          timestamp: data?.timestamp || null,
        });

        if (this.seenMessageIds.size > 2000) {
          const ids = Array.from(this.seenMessageIds);
          this.seenMessageIds = new Set(ids.slice(-2000));
        }
      } catch (err) {
        console.error("YouTube Proxy Parse Error:", err);
      }
    };
    this.eventSource.onerror = (err) => {
      console.error("YouTube Proxy Error:", err);
    };
  }

  stop() {
    this.eventSource?.close?.();
    this.eventSource = null;
    this.seenMessageIds.clear();
  }
}
