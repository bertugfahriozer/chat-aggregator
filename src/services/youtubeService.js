export default class YoutubeService {
  constructor(channelIdOrHandle, onMessage) {
    this.channelId = channelIdOrHandle;
    this.onMessage = onMessage;
    this.ws = null;
    this.isStopped = false;
  }

  start() {
    this.isStopped = false;
    if (!this.channelId) {
      console.warn("YoutubeService: No channel ID or handle provided.");
      return;
    }

    this.connect();
  }

  connect() {
    if (this.isStopped) return;

    this.ws = new WebSocket("ws://localhost:3101");

    this.ws.onopen = () => {
      console.log(
        "[YoutubeService] Connected to local proxy for:",
        this.channelId,
      );
      this.ws.send(
        JSON.stringify({ type: "START", channelId: this.channelId }),
      );
    };

    this.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "CHAT" && payload.data) {
          this.onMessage(payload.data);
        }
      } catch (err) {
        console.error("[YoutubeService] Proxy Parse Error:", err);
      }
    };

    this.ws.onerror = (err) => {
      console.error("[YoutubeService] WebSocket Proxy Error.", err);
    };

    this.ws.onclose = () => {
      console.log("[YoutubeService] Proxy connection closed.");
      if (!this.isStopped) {
        setTimeout(() => this.connect(), 5000); // Reconnect loop
      }
    };
  }

  stop() {
    this.isStopped = true;
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: "STOP" }));
      this.ws.close();
      this.ws = null;
    }
  }
}
