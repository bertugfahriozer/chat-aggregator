import tmi from 'tmi.js';

export default class TwitchService {
  constructor(channel, onMessage) {
    this.client = new tmi.Client({
      channels: [channel],
    });
    this.onMessage = onMessage;
    this.client.on('message', (channel, tags, message, self) => {
      const sentTs = tags?.['tmi-sent-ts'] ? Number(tags['tmi-sent-ts']) : null;
      this.onMessage({
        username: tags?.['display-name'] || tags?.username || 'Unknown',
        text: message,
        timestamp: Number.isFinite(sentTs) ? sentTs : null,
      });
    });

    this.client.on('raided', (channel, username, viewers) => {
      const raider = username || 'Someone';
      const count = Number(viewers || 0);
      this.onMessage({
        username: raider,
        text: `RAID — ${count} viewers`,
        timestamp: Date.now(),
        meta: { eventType: 'raid', viewers: count },
      });
    });

    this.client.on('hosted', (channel, username, viewers, autohost) => {
      const host = username || 'Someone';
      const count = Number(viewers || 0);
      const mode = autohost ? 'AUTOHOST' : 'HOST';
      this.onMessage({
        username: host,
        text: `${mode} — ${count} viewers`,
        timestamp: Date.now(),
        meta: { eventType: 'host', viewers: count, autohost: Boolean(autohost) },
      });
    });
  }

  start() {
    this.client.connect().catch(console.error);
  }

  stop() {
    this.client.disconnect().catch(console.error);
  }
}
