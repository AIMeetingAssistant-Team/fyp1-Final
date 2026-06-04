import dotenv from 'dotenv';

dotenv.config();

function normalizeWsUrl(url) {
  return (url || 'ws://localhost:7880').replace(/\/$/, '');
}

function normalizeHttpUrl(wsUrl, httpUrl) {
  let trimmedHttp = (httpUrl || '').replace(/\/$/, '');

  // Fix common misconfiguration: wss/ws used for the REST API URL
  if (trimmedHttp.startsWith('wss://')) {
    trimmedHttp = trimmedHttp.replace('wss://', 'https://');
  } else if (trimmedHttp.startsWith('ws://')) {
    trimmedHttp = trimmedHttp.replace('ws://', 'http://');
  }

  if (trimmedHttp.startsWith('http://') && trimmedHttp.includes('livekit.cloud')) {
    return trimmedHttp.replace('http://', 'https://');
  }
  if (trimmedHttp.startsWith('https://')) {
    return trimmedHttp;
  }
  if (trimmedHttp.startsWith('http://')) {
    return trimmedHttp;
  }

  const normalizedWs = normalizeWsUrl(wsUrl);
  if (normalizedWs.startsWith('wss://')) {
    return normalizedWs.replace('wss://', 'https://');
  }
  if (normalizedWs.startsWith('ws://')) {
    return normalizedWs.replace('ws://', 'http://');
  }

  return 'http://localhost:7880';
}

const wsUrl = normalizeWsUrl(process.env.LIVEKIT_URL || process.env.LIVEKIT_WS_URL);
const httpUrl = normalizeHttpUrl(wsUrl, process.env.LIVEKIT_HTTP_URL);

const livekitConfig = {
  apiKey: process.env.LIVEKIT_API_KEY || '',
  apiSecret: process.env.LIVEKIT_API_SECRET || '',
  wsUrl,
  httpUrl,

  isValid() {
    return Boolean(this.apiKey && this.apiSecret);
  },


  getPublicConfig() {
    return {
      wsUrl: this.wsUrl,
      configured: this.isValid(),
    };
  },
};

export default livekitConfig;
