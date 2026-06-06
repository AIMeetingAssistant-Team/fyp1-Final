import { useCallback, useEffect, useRef } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { ConnectionState, RoomEvent } from 'livekit-client';
import { ROOM_MSG, encodeRoomMessage, decodeRoomMessage } from '../../utils/livekitRoomMessages';

/**
 * Syncs recording / meeting-end events to all participants via LiveKit data channel.
 * Host publishes; everyone (including late joiners) receives notices.
 */
export default function LiveKitRoomSyncBridge({
  isHost,
  recordingActive,
  onRoomMessage,
  onReady,
}) {
  const room = useRoomContext();
  const prevRecordingRef = useRef(recordingActive);
  const hasAnnouncedRecordingRef = useRef(false);

  const publish = useCallback(async (payload) => {
    if (!room?.localParticipant || room.state !== ConnectionState.Connected) return;
    try {
      await room.localParticipant.publishData(encodeRoomMessage(payload), { reliable: true });
    } catch (err) {
      console.warn('LiveKit publishData failed:', err?.message || err);
    }
  }, [room]);

  useEffect(() => {
    onReady?.({ publish });
  }, [onReady, publish]);

  // Host: broadcast when recording toggles
  useEffect(() => {
    if (!isHost || !room) return;
    if (prevRecordingRef.current === recordingActive) return;
    prevRecordingRef.current = recordingActive;

    if (recordingActive) {
      publish({ type: ROOM_MSG.RECORDING_STARTED });
      hasAnnouncedRecordingRef.current = true;
    } else {
      publish({ type: ROOM_MSG.RECORDING_STOPPED });
      hasAnnouncedRecordingRef.current = false;
    }
  }, [recordingActive, isHost, room, publish]);

  // Host: when connected with recording already active (e.g. page refresh)
  useEffect(() => {
    if (!isHost || !room) return;

    const onConnected = () => {
      if (recordingActive && !hasAnnouncedRecordingRef.current) {
        publish({ type: ROOM_MSG.RECORDING_STARTED });
        hasAnnouncedRecordingRef.current = true;
      }
    };

    if (room.state === ConnectionState.Connected) {
      onConnected();
    }
    room.on(RoomEvent.Connected, onConnected);
    return () => room.off(RoomEvent.Connected, onConnected);
  }, [isHost, room, recordingActive, publish]);

  // Host: notify participants who join while recording is in progress
  useEffect(() => {
    if (!isHost || !room) return;

    const onParticipantConnected = () => {
      if (recordingActive) {
        publish({ type: ROOM_MSG.RECORDING_STARTED });
      }
    };

    room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
    return () => room.off(RoomEvent.ParticipantConnected, onParticipantConnected);
  }, [isHost, room, recordingActive, publish]);

  // All participants: listen for host/system messages
  useEffect(() => {
    if (!room) return;

    const onData = (payload, participant) => {
      const localId = room.localParticipant?.identity;
      if (participant?.identity && participant.identity === localId) return;

      const msg = decodeRoomMessage(payload);
      if (msg) onRoomMessage?.(msg);
    };

    room.on(RoomEvent.DataReceived, onData);
    return () => room.off(RoomEvent.DataReceived, onData);
  }, [room, onRoomMessage]);

  return null;
}
