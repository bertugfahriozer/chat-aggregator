export default class TwitchEventProxyService {
  constructor(options, onMessage) {
    const { systemName = "CHAOSFOUNDRY // SYS" } = options || {};
    this.systemName = systemName;
    this.onMessage = onMessage;
    this.eventSource = null;
    this.sentConnectError = false;
  }

  start() {
    this.sentConnectError = false;
    this.eventSource = new EventSource("/api/twitch/sse");

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handlePayload(data);
      } catch (err) {
        // ignore
      }
    };

    this.eventSource.onerror = () => {
      if (this.sentConnectError) return;
      this.sentConnectError = true;
      this.onMessage({
        id: `twitch-events:connect-error:${Date.now()}`,
        username: this.systemName,
        text: "Twitch Events: can't reach the local server. Start it with `npm run server` (or `npm run dev:yt`).",
      });
    };
  }

  stop() {
    try {
      this.eventSource?.close?.();
    } catch {
      // ignore
    }
    this.eventSource = null;
  }

  handlePayload(payload) {
    if (!payload || typeof payload !== "object") return;

    if (payload.type === "event") {
      const { id, eventType, event, timestamp } = payload;
      const text = this.formatEvent(eventType, event);
      if (!text) return;

      this.onMessage({
        id: id || `twitch-event:${eventType}:${timestamp || Date.now()}`,
        username: this.systemName,
        text,
        timestamp,
        meta: { eventType },
      });
      return;
    }

    if (payload.type === "status") {
      const maybeText = this.formatStatus(payload);
      if (!maybeText) return;
      this.onMessage({
        id: `twitch-status:${payload.status || "unknown"}:${Date.now()}`,
        username: this.systemName,
        text: maybeText,
      });
    }
  }

  formatEvent(eventType, event) {
    if (!eventType) return null;

    if (eventType === "channel.channel_points_custom_reward_redemption.add") {
      const user = event?.user_name || "Someone";
      const title = event?.reward?.title || "Channel Points";
      const input = (event?.user_input || "").trim();
      if (input) return `REWARD REDEEMED — ${user}: “${title}” — ${input}`;
      return `REWARD REDEEMED — ${user}: “${title}”`;
    }

    if (eventType === "channel.raid") {
      const from = event?.from_broadcaster_user_name;
      const to = event?.to_broadcaster_user_name;
      const viewers = Number(event?.viewers || 0);
      if (from && to) {
        return `RAID — ${from} → ${to} (${viewers} viewers)`;
      }
      if (from) return `RAID INBOUND — ${from} (${viewers} viewers)`;
      if (to) return `RAID OUTBOUND — → ${to} (${viewers} viewers)`;
      return `RAID (${viewers} viewers)`;
    }

    return `TWITCH EVENT — ${eventType}`;
  }

  formatStatus(status) {
    const s = status?.status;
    if (!s) return null;

    if (s === "auth_required") return "Twitch Events: not authenticated yet. Open Settings → Authenticate.";
    if (s === "auth_invalid") return "Twitch Events: auth expired/invalid. Re-authenticate in Settings.";
    if (s === "auth_refresh_failed") return "Twitch Events: token refresh failed. Re-authenticate in Settings.";
    if (s === "auth_ok") return "Twitch Events: authenticated.";
    if (s === "ws_open") {
      const login = status?.login ? ` as ${status.login}` : "";
      return `Twitch Events connected${login}.`;
    }
    if (s === "subscription_failed") {
      const type = status?.subscriptionType || "unknown";
      return `Twitch Events: failed to subscribe to ${type}.`;
    }
    if (s === "revoked") return "Twitch Events: subscription revoked.";
    if (s === "logged_out") return "Twitch Events: logged out.";

    return null;
  }
}

