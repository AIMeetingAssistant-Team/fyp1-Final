import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import livekitConfig from '../config/livekit.js';

class LiveKitTokenService {
  getRoomServiceClient() {
    return new RoomServiceClient(
      livekitConfig.httpUrl,
      livekitConfig.apiKey,
      livekitConfig.apiSecret
    );
  }

  buildRoomName(meetingId) {
    return `meeting-${meetingId}`;
  }

  async generateToken({ roomName, identity, name, isHost = false, metadata = {} }) {
    if (!livekitConfig.isValid()) {
      throw new Error('LiveKit is not configured');
    }

    const token = new AccessToken(livekitConfig.apiKey, livekitConfig.apiSecret, {
      identity: String(identity),
      name: name || String(identity),
      metadata: JSON.stringify(metadata),
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isHost,
      roomRecord: isHost,
    });

    return token.toJwt();
  }

  async ensureRoom(roomName, options = {}) {
  // LiveKit auto-creates rooms when the first participant joins.
  // Pre-creation is optional; failures must not block token issuance.
    const client = this.getRoomServiceClient();
    try {
      await client.createRoom({
        name: roomName,
        emptyTimeout: options.emptyTimeout ?? 300,
        maxParticipants: options.maxParticipants ?? 50,
      });
    } catch (error) {
      const message = `${error?.message || ''} ${error?.status || ''}`.toLowerCase();
      const isBenign = message.includes('already exists') || message.includes('409');
      if (isBenign) {
        return roomName;
      }
      console.warn(`LiveKit ensureRoom skipped for ${roomName}:`, error?.message || error);
    }
    return roomName;
  }

  async deleteRoom(roomName) {
    const client = this.getRoomServiceClient();
    try {
      await client.deleteRoom(roomName);
    } catch (error) {
      console.warn(`LiveKit deleteRoom warning for ${roomName}:`, error.message);
    }
  }

  async listParticipants(roomName) {
    const client = this.getRoomServiceClient();
    return client.listParticipants(roomName);
  }
}

export default new LiveKitTokenService();
