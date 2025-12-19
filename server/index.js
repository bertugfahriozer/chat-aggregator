import http from "node:http";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { LiveChat } from "youtube-chat";

const port = Number(process.env.YOUTUBE_PROXY_PORT || process.env.PORT || 4174);
const twitchAuthFileUrl = new URL("./.twitch-auth.json", import.meta.url);

function json(data) {
  return JSON.stringify(data);
}

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    ...headers,
  });
  res.end(body);
}

function sendJson(res, statusCode, data, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  res.end(json(data));
}

async function readJsonBody(req, maxBytes = 200_000) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > maxBytes) {
      throw new Error("body_too_large");
    }
    chunks.push(buf);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return null;
  return JSON.parse(raw);
}

async function readJsonFile(url) {
  try {
    const raw = await fs.readFile(url, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeJsonFile(url, data) {
  await fs.writeFile(url, json(data), "utf8");
}

async function deleteFile(url) {
  try {
    await fs.unlink(url);
  } catch {
    // ignore
  }
}

function textFromChatItem(chatItem) {
  if (!Array.isArray(chatItem?.message)) return "";
  return chatItem.message
    .map((part) => {
      if (typeof part?.text === "string") return part.text;
      if (typeof part?.emojiText === "string") return part.emojiText;
      if (typeof part?.alt === "string") return part.alt;
      return "";
    })
    .join("");
}

function stableId({ liveId, username, text, timestamp }) {
  const payload = `${liveId}\n${username}\n${timestamp}\n${text}`;
  return createHash("sha1").update(payload).digest("hex");
}

class TwitchEventSub {
  constructor({ broadcastStatus, broadcastEvent, onAuthUpdate }) {
    this.broadcastStatus = broadcastStatus;
    this.broadcastEvent = broadcastEvent;
    this.onAuthUpdate = onAuthUpdate;
    this.ws = null;
    this.sessionId = null;
    this.connected = false;
    this.auth = null;
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
  }

  getStatus() {
    return {
      connected: Boolean(this.connected && this.ws && this.ws.readyState === WebSocket.OPEN),
      login: this.auth?.login || null,
      userId: this.auth?.userId || null,
      scopes: this.auth?.scope || [],
      expiresAt: this.auth?.expiresAt || null,
      hasAuth: Boolean(this.auth?.accessToken),
    };
  }

  async setAuth(auth) {
    this.auth = auth;
    await this.ensureValidToken();
  }

  stop() {
    this.connected = false;
    this.sessionId = null;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
    this.closeWs();
  }

  closeWs() {
    try {
      this.ws?.close?.();
    } catch {
      // ignore
    }
    this.ws = null;
  }

  scheduleReconnect(reason) {
    if (this.reconnectTimer) return;
    const backoffMs = Math.min(30000, 1000 * 2 ** this.reconnectAttempt);
    this.reconnectAttempt += 1;
    this.broadcastStatus({
      status: "reconnecting",
      reason: reason || "ws_closed",
      backoffMs,
    });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((err) => {
        this.broadcastStatus({ status: "error", error: String(err?.message || err) });
        this.scheduleReconnect("connect_failed");
      });
    }, backoffMs);
  }

  async ensureValidToken() {
    if (!this.auth?.accessToken || !this.auth?.clientId) return;

    const now = Date.now();
    if (this.auth.expiresAt && this.auth.expiresAt - now < 60_000 && this.auth.refreshToken) {
      await this.refreshToken();
    }

    const validateRes = await fetch("https://id.twitch.tv/oauth2/validate", {
      headers: {
        Authorization: `OAuth ${this.auth.accessToken}`,
      },
    });

    if (!validateRes.ok) {
      this.broadcastStatus({
        status: "auth_invalid",
        error: `validate_failed:${validateRes.status}`,
      });
      return;
    }

    const validated = await validateRes.json();
    const updated = {
      ...this.auth,
      userId: validated.user_id,
      login: validated.login,
      scope: Array.isArray(validated.scopes) ? validated.scopes : [],
    };
    this.auth = updated;
    await this.onAuthUpdate(updated);
  }

  async refreshToken() {
    if (!this.auth?.refreshToken || !this.auth?.clientId) return;

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.auth.refreshToken,
      client_id: this.auth.clientId,
    });

    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      this.broadcastStatus({ status: "auth_refresh_failed", error: `refresh_failed:${res.status}` });
      return;
    }

    const token = await res.json();
    const updated = {
      ...this.auth,
      accessToken: token.access_token,
      refreshToken: token.refresh_token || this.auth.refreshToken,
      tokenType: token.token_type,
      scope: token.scope || this.auth.scope || [],
      obtainedAt: Date.now(),
      expiresAt: Date.now() + (Number(token.expires_in) || 0) * 1000,
    };

    this.auth = updated;
    await this.onAuthUpdate(updated);
    this.broadcastStatus({ status: "auth_refreshed" });
  }

  async connect() {
    if (!this.auth?.accessToken || !this.auth?.clientId) {
      this.broadcastStatus({ status: "auth_required" });
      return;
    }

    await this.ensureValidToken();
    if (!this.auth?.userId) {
      this.broadcastStatus({ status: "auth_required" });
      return;
    }

    this.closeWs();
    this.broadcastStatus({ status: "connecting" });

    const ws = new WebSocket("wss://eventsub.wss.twitch.tv/ws");
    this.ws = ws;

    ws.addEventListener("open", () => {
      this.connected = true;
      this.reconnectAttempt = 0;
      this.broadcastStatus({ status: "ws_open" });
    });

    ws.addEventListener("close", () => {
      this.connected = false;
      this.sessionId = null;
      this.broadcastStatus({ status: "ws_closed" });
      this.scheduleReconnect("ws_closed");
    });

    ws.addEventListener("error", (err) => {
      this.broadcastStatus({ status: "ws_error", error: String(err?.message || err) });
    });

    ws.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(String(event.data || "{}"));
        this.handleWsMessage(payload).catch((err) => {
          this.broadcastStatus({ status: "error", error: String(err?.message || err) });
        });
      } catch (err) {
        this.broadcastStatus({ status: "error", error: String(err?.message || err) });
      }
    });
  }

  async handleWsMessage(message) {
    const messageType = message?.metadata?.message_type;

    if (messageType === "session_welcome") {
      this.sessionId = message?.payload?.session?.id || null;
      this.broadcastStatus({ status: "session_welcome", sessionId: this.sessionId });
      await this.createSubscriptions();
      return;
    }

    if (messageType === "session_keepalive") return;

    if (messageType === "notification") {
      const messageId = message?.metadata?.message_id || null;
      const subscriptionType = message?.metadata?.subscription_type || "unknown";
      const timestamp = message?.metadata?.message_timestamp || new Date().toISOString();
      const event = message?.payload?.event || {};

      this.broadcastEvent({
        type: "event",
        id: messageId || createHash("sha1").update(json(message)).digest("hex"),
        eventType: subscriptionType,
        timestamp,
        event,
      });
      return;
    }

    if (messageType === "revocation") {
      this.broadcastStatus({
        status: "revoked",
        subscriptionType: message?.metadata?.subscription_type,
        reason: message?.payload?.subscription?.status,
      });
      return;
    }
  }

  async createSubscriptions() {
    if (!this.sessionId) return;

    const broadcasterUserId = this.auth?.userId;
    if (!broadcasterUserId) return;

    const subscriptions = [
      {
        type: "channel.channel_points_custom_reward_redemption.add",
        version: "1",
        condition: { broadcaster_user_id: broadcasterUserId },
      },
      {
        type: "channel.raid",
        version: "1",
        condition: { to_broadcaster_user_id: broadcasterUserId },
      },
      {
        type: "channel.raid",
        version: "1",
        condition: { from_broadcaster_user_id: broadcasterUserId },
      },
    ];

    for (const sub of subscriptions) {
      await this.createSubscription(sub).catch((err) => {
        this.broadcastStatus({
          status: "subscription_error",
          subscriptionType: sub.type,
          error: String(err?.message || err),
        });
      });
    }
  }

  async createSubscription({ type, version, condition }) {
    await this.ensureValidToken();

    const res = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
      method: "POST",
      headers: {
        "Client-Id": this.auth.clientId,
        Authorization: `Bearer ${this.auth.accessToken}`,
        "Content-Type": "application/json",
      },
      body: json({
        type,
        version,
        condition,
        transport: {
          method: "websocket",
          session_id: this.sessionId,
        },
      }),
    });

    if (res.status === 409) {
      this.broadcastStatus({ status: "subscribed", subscriptionType: type, deduped: true });
      return;
    }

    if (!res.ok) {
      const errText = await res.text();
      this.broadcastStatus({
        status: "subscription_failed",
        subscriptionType: type,
        httpStatus: res.status,
        error: errText?.slice?.(0, 500) || String(errText),
      });
      return;
    }

    this.broadcastStatus({ status: "subscribed", subscriptionType: type });
  }
}

class TwitchManager {
  constructor() {
    this.clients = new Set();
    this.eventSub = new TwitchEventSub({
      broadcastStatus: (data) => this.broadcast({ type: "status", ...data }),
      broadcastEvent: (data) => this.broadcast(data),
      onAuthUpdate: async (auth) => {
        await writeJsonFile(twitchAuthFileUrl, auth);
      },
    });
  }

  async load() {
    const auth = await readJsonFile(twitchAuthFileUrl);
    if (auth?.accessToken && auth?.clientId) {
      await this.eventSub.setAuth(auth);
      await this.eventSub.connect();
    }
  }

  addClient(res) {
    this.clients.add(res);
    this.sendTo(res, { type: "status", ...this.eventSub.getStatus() });
  }

  removeClient(res) {
    this.clients.delete(res);
  }

  sendTo(res, data) {
    try {
      res.write(`data: ${json(data)}\n\n`);
    } catch {
      this.clients.delete(res);
    }
  }

  broadcast(data) {
    for (const client of this.clients) {
      this.sendTo(client, data);
    }
  }

  getStatus() {
    return this.eventSub.getStatus();
  }

  async logout() {
    this.eventSub.stop();
    await deleteFile(twitchAuthFileUrl);
    this.broadcast({ type: "status", status: "logged_out" });
  }

  async exchangePkce({ clientId, code, codeVerifier, redirectUri }) {
    return this.exchangePkceWithSecret({ clientId, clientSecret: null, code, codeVerifier, redirectUri });
  }

  async exchangePkceWithSecret({ clientId, clientSecret, code, codeVerifier, redirectUri }) {
    if (!clientId || !code || !codeVerifier || !redirectUri) {
      throw new Error("missing_required_fields");
    }

    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    if (clientSecret) {
      body.set("client_secret", clientSecret);
    }

    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      const errText = await res.text();
      if (errText?.includes?.("missing client secret")) {
        throw new Error(
          "token_exchange_failed:missing_client_secret (Twitch requires a client secret for this app; paste it in Settings or switch the app to a public/PKCE client if available)."
        );
      }
      throw new Error(`token_exchange_failed:${res.status}:${errText?.slice?.(0, 250) || ""}`);
    }

    const token = await res.json();
    const auth = {
      clientId,
      accessToken: token.access_token,
      refreshToken: token.refresh_token || null,
      tokenType: token.token_type,
      scope: token.scope || [],
      obtainedAt: Date.now(),
      expiresAt: Date.now() + (Number(token.expires_in) || 0) * 1000,
      userId: null,
      login: null,
    };

    await writeJsonFile(twitchAuthFileUrl, auth);
    await this.eventSub.setAuth(auth);
    await this.eventSub.connect();
    this.broadcast({ type: "status", status: "auth_ok" });
    return this.eventSub.getStatus();
  }
}

class LiveRoom {
  constructor(liveId) {
    this.liveId = liveId;
    this.clients = new Set();
    this.started = false;
    this.liveChat = new LiveChat({ liveId });

    this.liveChat.on("chat", (chatItem) => {
      const messageText = textFromChatItem(chatItem);
      const username = chatItem?.author?.name || "Unknown";
      const timestamp = chatItem?.timestamp
        ? new Date(chatItem.timestamp).toISOString()
        : new Date().toISOString();

      const payload = {
        id: stableId({
          liveId: this.liveId,
          username,
          text: messageText,
          timestamp,
        }),
        username,
        text: messageText,
        timestamp,
      };

      this.broadcast(payload);
    });

    this.liveChat.on("error", (err) => {
      this.broadcast({ type: "error", error: String(err?.message || err) });
    });

    this.liveChat.on("end", (reason) => {
      this.broadcast({ type: "end", reason: reason || "ended" });
    });
  }

  async ensureStarted() {
    if (this.started) return;
    this.started = true;
    const ok = await this.liveChat.start();
    if (!ok) {
      this.broadcast({ type: "error", error: "Failed to start YouTube chat." });
    }
  }

  addClient(res) {
    this.clients.add(res);
  }

  removeClient(res) {
    this.clients.delete(res);
    if (this.clients.size === 0) {
      this.liveChat.stop();
    }
  }

  broadcast(data) {
    const line = `data: ${json(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(line);
      } catch {
        this.clients.delete(client);
      }
    }
  }
}

const rooms = new Map();

function getRoom(liveId) {
  const existing = rooms.get(liveId);
  if (existing) return existing;
  const room = new LiveRoom(liveId);
  rooms.set(liveId, room);
  return room;
}

const twitch = new TwitchManager();
await twitch.load();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/api/health") {
    return send(res, 200, "ok\n", {
      "Access-Control-Allow-Origin": "*",
    });
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  if (req.method === "GET" && url.pathname === "/api/twitch/status") {
    return sendJson(res, 200, twitch.getStatus(), {
      "Access-Control-Allow-Origin": "*",
    });
  }

  if (req.method === "POST" && url.pathname === "/api/twitch/pkce/exchange") {
    try {
      const payload = await readJsonBody(req);
      const clientId = String(payload?.clientId || "");
      const clientSecret = payload?.clientSecret ? String(payload.clientSecret) : "";
      const code = String(payload?.code || "");
      const codeVerifier = String(payload?.codeVerifier || "");
      const redirectUri = String(payload?.redirectUri || "");

      const status = await twitch.exchangePkceWithSecret({
        clientId,
        clientSecret: clientSecret ? clientSecret : null,
        code,
        codeVerifier,
        redirectUri,
      });
      return sendJson(res, 200, status, { "Access-Control-Allow-Origin": "*" });
    } catch (err) {
      return send(res, 400, `${String(err?.message || err)}\n`, { "Access-Control-Allow-Origin": "*" });
    }
  }

  if ((req.method === "POST" || req.method === "GET") && url.pathname === "/api/twitch/logout") {
    await twitch.logout();
    return send(res, 200, "ok\n", { "Access-Control-Allow-Origin": "*" });
  }

  if (req.method === "GET" && (url.pathname === "/api/twitch/auth/start" || url.pathname === "/api/twitch/auth/callback")) {
    return send(
      res,
      410,
      "Deprecated: use the HTTPS frontend auth flow at https://localhost:5173/auth/twitch\n",
      { "Access-Control-Allow-Origin": "*" },
    );
  }

  if (req.method === "GET" && url.pathname === "/api/twitch/sse") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write("retry: 3000\n\n");

    twitch.addClient(res);

    const keepAlive = setInterval(() => {
      try {
        res.write(": ping\n\n");
      } catch {
        clearInterval(keepAlive);
      }
    }, 15000);

    req.on("close", () => {
      clearInterval(keepAlive);
      twitch.removeClient(res);
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/youtube/sse") {
    const liveId = url.searchParams.get("liveId");
    if (!liveId) {
      return send(res, 400, "Missing required query param: liveId\n", {
        "Access-Control-Allow-Origin": "*",
      });
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write("retry: 3000\n\n");

    const room = getRoom(liveId);
    room.addClient(res);
    await room.ensureStarted();

    const keepAlive = setInterval(() => {
      try {
        res.write(": ping\n\n");
      } catch {
        clearInterval(keepAlive);
      }
    }, 15000);

    req.on("close", () => {
      clearInterval(keepAlive);
      room.removeClient(res);
      if (room.clients.size === 0) {
        rooms.delete(liveId);
      }
    });
    return;
  }

  send(res, 404, "Not found\n", {
    "Access-Control-Allow-Origin": "*",
  });
});

server.listen(port, () => {
  console.log(`Proxy server listening on http://localhost:${port}`);
});
