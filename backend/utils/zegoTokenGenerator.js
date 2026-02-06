import crypto from 'crypto';
import zegoCloudConfig from '../config/zegoCloud.js';

class ZegoTokenGenerator {
  constructor() {
    this.appId = zegoCloudConfig.appId;
    this.serverSecret = zegoCloudConfig.serverSecret;
    
    if (!this.isConfigured()) {
      console.warn('❌ ZEGOCLOUD not configured - video features will fail');
    }
  }

  isConfigured() {
    return this.appId && this.serverSecret;
  }

  /**
   * Generate ZEGOCLOUD token for video meeting access
   */
  generateToken(userId, roomId, privilege = {}) {
    if (!this.isConfigured()) {
      throw new Error('ZEGOCLOUD credentials not configured');
    }

    console.log("🎫 [ZEGO] Generating token:", { 
      userId, 
      roomId, 
      appId: this.appId 
    });

    // Default privileges (1: enable, 0: disable)
    const defaultPrivilege = {
      login: 1,        // Can login to room
      publish: 1,      // Can publish stream (video/audio)
      ...privilege
    };

    // Token expiration (24 hours in seconds)
    const tokenExpiration = 3600 * 24;

    const { nonce, timestamp, signature } = zegoCloudConfig.generateSignature(tokenExpiration);

    // ✅ CORRECT: Include ALL required fields in payload
    const payload = {
      app_id: this.appId,
      user_id: userId.toString(),
      room_id: roomId.toString(),
      privilege: defaultPrivilege,
      nonce: nonce,
      timestamp: timestamp,
      expiration: tokenExpiration,
      signature: signature
    };

    // Encode payload to base64
    const payloadStr = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadStr).toString('base64');

    // Generate token
    const token = `${payloadBase64}.${signature}`;

    return {
      success: true,
      token: token,
      appID: this.appId,
      roomID: roomId,
      userID: userId,
      userName: 'User', // Will be overridden by controller
      privilege: defaultPrivilege,
      tokenExpiration: tokenExpiration,
      generatedAt: new Date()
    };
  }

  /**
   * Generate host token (full privileges)
   */
  generateHostToken(userId, roomId) {
    return this.generateToken(userId, roomId, {
      login: 1,
      publish: 1,
      publish_stream: 1,
      invite: 1,
      kick: 1,
      mute: 1,
      close_room: 1
    });
  }

  /**
   * Generate participant token (basic privileges)
   */
  generateParticipantToken(userId, roomId) {
    return this.generateToken(userId, roomId, {
      login: 1,
      publish: 1,
      publish_stream: 1,
      invite: 0,
      kick: 0,
      mute: 0,
      close_room: 0
    });
  }

  /**
   * Verify token validity
   */
  verifyToken(token) {
    try {
      const [payloadBase64, signature] = token.split('.');
      const payloadStr = Buffer.from(payloadBase64, 'base64').toString();
      const payload = JSON.parse(payloadStr);

      // Check expiration
      if (Date.now() > (payload.timestamp + payload.expiration * 1000)) {
        return { valid: false, reason: 'Token expired' };
      }

      // Verify signature
      const data = `${payload.app_id}${payload.nonce}${payload.timestamp}${payload.expiration}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.serverSecret)
        .update(data)
        .digest('hex');

      if (signature !== expectedSignature) {
        return { valid: false, reason: 'Invalid signature' };
      }

      return { valid: true, payload };
    } catch (error) {
      console.error('Token verification error:', error);
      return { valid: false, reason: 'Invalid token format' };
    }
  }
}

export default new ZegoTokenGenerator();