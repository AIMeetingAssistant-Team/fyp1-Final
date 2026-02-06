import crypto from 'crypto';

class ZegoCloudConfig {
  constructor() {
    this.appId = parseInt(process.env.ZEGOCLOUD_APP_ID);
    this.serverSecret = process.env.ZEGOCLOUD_SERVER_SECRET;
    
    if (!this.appId || !this.serverSecret) {
      console.warn('⚠️  ZEGOCLOUD credentials not found. Video features will be disabled.');
    } else {
      console.log('✅ ZEGOCLOUD configured with App ID:', this.appId);
    }
  }

  // Validate configuration
  isValid() {
    return this.appId && this.serverSecret;
  }

  // Generate ZEGOCLOUD signature
  generateSignature(tokenExpiration) {
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    
    const data = `${this.appId}${nonce}${timestamp}${tokenExpiration}`;
    const signature = crypto
      .createHmac('sha256', this.serverSecret)
      .update(data)
      .digest('hex');

    return {
      nonce,
      timestamp,
      signature,
      tokenExpiration
    };
  }
}

// Create singleton instance
const zegoCloudConfig = new ZegoCloudConfig();

export default zegoCloudConfig;