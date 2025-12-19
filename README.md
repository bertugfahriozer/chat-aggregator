# Chat Aggregator

A cyberpunk-styled, lightweight chat “popout” for aggregating live chat messages from Twitch, YouTube, and Kick. It includes an in-app Settings modal (saved to `localStorage`) and an optional local server for YouTube (no API key) and Twitch EventSub (channel points / raids).

## Features

- **Multi-Platform Chat Integration**:
  - Twitch: Real-time messages via `tmi.js` (IRC WebSockets).
  - YouTube: Polling-based messages via YouTube Data API v3.
  - Kick: Real-time messages via Pusher WebSockets.
- **In-App Settings**:
  - Opens automatically when no configuration is saved.
  - Saved to `localStorage` and auto-starts on reload.
  - Still supports URL query params (optional).
- **Chat Composer**: Local “test messages” input (not sent to platforms), with `/settings` and `/clear`.
- **Responsive Design**: Full-width chat display, mobile-friendly.
- **Cyberpunk Theme**: Glassy dark purples + neon orange accents; optional local fonts (Pirulen/Vandav).
- **Remixicon Icons**: Platform-specific icons (Twitch, YouTube, Kick).
- **Twitch Events (optional)**: Channel points + raids via Twitch EventSub (requires OAuth login).

## Prerequisites

- **Node.js**: Version 18 or higher.
- **npm**: Version 8 or higher.
- **YouTube Chat (choose one)**:
  - **Recommended (official)**: YouTube Data API v3 key (requires a Google Cloud project).
  - **No-key (local proxy)**: Uses `youtube-chat` (unofficial) via a small local Node server.
- **Twitch Events (optional)**:
  - To capture channel points + raids, you need a Twitch Developer App **Client ID** and a one-time OAuth login.
- **Live Channels**: Access to live Twitch, YouTube, and Kick channels for testing.

## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/bertugfahriozer/chat-aggregator.git
   cd chat-aggregator
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Set Up YouTube (pick one)**:
   - **Option A: With a YouTube API key (official)**
     - Create a `.env` file in the project root:
       ```env
       VITE_YOUTUBE_API_KEY=your_youtube_api_key_here
       ```
   - **Option B: Without a YouTube API key (local proxy)**
     - No `.env` needed.
     - You will run the local proxy with `npm run dev:yt` (see below).

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   - Open the app at `http://localhost:5173` and use the Settings button.

### Getting a YouTube API Key (Official)

1. Open Google Cloud Console: `https://console.cloud.google.com/`
2. Create/select a project.
3. Enable **YouTube Data API v3** for the project.
4. Create an **API key** under **APIs & Services → Credentials**.
5. Put it into `.env` as `VITE_YOUTUBE_API_KEY=...`.

## Running YouTube Without an API Key (Local Proxy)

If you don’t want to set up a YouTube Data API key, you can run the included proxy server:

```bash
npm run dev:yt
```

- The local server listens on `http://localhost:4174` and the Vite dev server proxies `/api/*` requests to it.
- Configure YouTube via Settings (or `?youtube_vid=VIDEO_ID`).

If you deploy the frontend separately, set `VITE_YOUTUBE_PROXY_URL` to your proxy origin (example: `http://localhost:4174`).

## Twitch Events (Channel Points + Raids)

This project can also show Twitch “events” (not chat) like channel point redemptions and raids via EventSub (WebSocket).

1. Run the local server (required):
   ```bash
   npm run dev:all:https
   ```
   This runs the server + Vite on HTTPS (Twitch requires HTTPS redirect URLs). You may need to accept the browser’s local certificate warning once.
2. Create a Twitch Developer app and copy its **Client ID**.
   - If Twitch requires a **Client Secret** for your app type, you can paste it in Settings during authentication (it’s only used for the token exchange, then discarded from the browser storage).
   - Scopes used: `channel:read:redemptions` (channel points) and `channel:read:raids` (raids).
3. Add this redirect URL to the app:
   - `https://localhost:5173/auth/twitch`
4. In the app Settings, enable **Twitch Events**, paste Client ID, and click **Authenticate**.

### Optional Fonts (Pirulen / Vandav)

If you have local copies of Pirulen/Vandav, place them at:

- `chat-aggregator/public/fonts/PirulenRg.otf`
- `chat-aggregator/public/fonts/Vandav.ttf`

They are gitignored by default.

## Usage

1. **Configure in Settings**:
   - Click **Settings** → enter channels/video ID → **Start**.
   - Settings are saved and auto-start next load.

2. **View Chats**:
   - Messages from Twitch, YouTube, and Kick appear in real-time with platform-specific icons and colors (Twitch: purple, YouTube: red, Kick: green).

3. **Toggle Theme**:
   - Use the theme toggle button in the header to switch between light and dark modes manually.

4. **URL Params (optional)**:
   - `?twitch=channel&kick=channel&youtube_vid=VIDEO_ID&theme=dark`
   - Twitch events params (optional): `twitch_events=true&twitch_client=CLIENT_ID&twitch_system=NAME`

## Project Structure

```
chat-aggregator/
├── public/
│   ├── vite.svg
│   ├── fonts/                 # Optional local fonts (gitignored)
├── src/
│   ├── assets/
│   │   ├── vue.svg
│   ├── components/
│   │   ├── ChatDisplay.vue        # Chat message display with icons
│   │   ├── HelloWorld.vue        # Default Vite component (unused)
│   │   ├── Settings.vue          # Hidden settings logic
│   ├── services/
│   │   ├── kickService.js        # Kick chat via Pusher
│   │   ├── twitchService.js      # Twitch chat via tmi.js
│   │   ├── youtubeService.js     # YouTube chat via API polling
│   │   ├── youtubeProxyService.js # YouTube chat via local proxy (no API key)
│   │   ├── twitchEventProxyService.js # Twitch events via local proxy (EventSub)
│   ├── store/
│   │   ├── index.js              # Vuex store for state management
│   ├── App.vue                   # Main app with chat layout
│   ├── main.js                   # Entry point
│   ├── style.css                 # Global styles with color palette
├── server/
│   ├── index.js                  # Local proxy (YouTube + Twitch EventSub)
├── .env                          # Environment variables (not committed)
├── .gitignore                    # Git ignore file
├── index.html                    # HTML entry with Inter font and Remixicon
├── package.json                  # Dependencies and scripts
├── README.md                     # This file
├── vite.config.js                # Vite configuration
```

## Dependencies

- `vue`: ^3.5.18
- `vuex`: ^4.1.0
- `axios`: ^1.11.0
- `pusher-js`: ^8.4.0
- `tmi.js`: ^1.8.5
- `uuid`: ^10.0.0
- `remixicon`: ^4.4.0 (also loaded via CDN)
- Dev: `@vitejs/plugin-vue`, `vite`

## Optimization Notes

- **Memory Usage**: Capped at ~200-300 MB with 100 stored messages and 50 displayed.
- **YouTube Polling**: 2-second interval to balance performance and API quota (43,200 requests/day).
- **Security**: `.env` file secures the YouTube API key. Never commit `.env` to Git.

## Troubleshooting

- **YouTube Messages Not Appearing**:
  - Ensure `youtube_vid` is for a live stream.
  - If using an API key: check `.env` for a valid `VITE_YOUTUBE_API_KEY` and look for `YouTube API Polling Error` in the console.
  - If using the no-key proxy: run `npm run dev:yt` and check the terminal for proxy errors.
- **High RAM Usage**:
  - Use Chrome DevTools > Memory to take heap snapshots.
  - Reduce `maxMessages` in `store/index.js` to 50 if needed.
- **Kick Icon Missing**:
  - If `ri-kick-fill` is unavailable, replace with `ri-chat-3-fill` in `ChatDisplay.vue`.
- **No Messages Without Query Parameters**:
  - Use **Settings** (it opens automatically on first run).

## Contributing

Contributions are welcome! Please:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit changes (`git commit -m 'Add your feature'`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a pull request.

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with [Vue.js](https://vuejs.org/) and [Vite](https://vite.dev/).
- Icons by [Remixicon](https://remixicon.com/).
- Fonts by [Google Fonts](https://fonts.google.com/) (Inter).
- Inspired by the need for a unified live chat experience for streamers.
