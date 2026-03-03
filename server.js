import { WebSocketServer } from "ws";
import { LiveChat } from "youtube-chat";

const port = 3101;
const wss = new WebSocketServer({ port });

console.log(`[YouTube Proxy] Server running on ws://localhost:${port}`);

wss.on("connection", (ws) => {
  let liveChat = null;
  let currentChannel = null;

  console.log("[YouTube Proxy] Client connected");

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "START") {
        const { channelId } = data;

        if (liveChat) {
          liveChat.stop();
          liveChat = null;
        }

        currentChannel = channelId;
        console.log(`[YouTube Proxy] Starting scrape for: ${channelId}`);

        const opts = channelId.startsWith("@")
          ? { handle: channelId }
          : { channelId };
        liveChat = new LiveChat(opts);

        liveChat.on("start", (liveId) => {
          console.log(`[YouTube Proxy] Stream started: ${liveId}`);
        });

        liveChat.on("chat", (chatItem) => {
          const textMessage = chatItem.message
            .map((m) => (m.text ? m.text : m.emojiText || ""))
            .join("");

          ws.send(
            JSON.stringify({
              type: "CHAT",
              data: {
                username: chatItem.author.name,
                text: textMessage,
                id: chatItem.id || Date.now().toString(),
                isModerator: chatItem.author.isChatModerator,
              },
            }),
          );
        });

        liveChat.on("error", (err) => {
          console.error("[YouTube Proxy] Error:", err.message);
        });

        const ok = await liveChat.start();
        if (!ok) {
          console.log(
            "[YouTube Proxy] No active stream found right now for",
            channelId,
          );
        }
      }

      if (data.type === "STOP") {
        if (liveChat) {
          console.log(`[YouTube Proxy] Stopping scrape for: ${currentChannel}`);
          liveChat.stop();
          liveChat = null;
        }
      }
    } catch (e) {
      console.error("[YouTube Proxy] Message Parse Error:", e.message);
    }
  });

  ws.on("close", () => {
    console.log("[YouTube Proxy] Client disconnected");
    if (liveChat) {
      liveChat.stop();
      liveChat = null;
    }
  });
});
