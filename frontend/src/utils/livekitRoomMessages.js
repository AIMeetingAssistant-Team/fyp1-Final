/** LiveKit room data message types (JSON over publishData). */
export const ROOM_MSG = {
  RECORDING_STARTED: 'recording_started',
  RECORDING_STOPPED: 'recording_stopped',
  MEETING_ENDED: 'meeting_ended',
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeRoomMessage(payload) {
  return encoder.encode(JSON.stringify({ ...payload, ts: Date.now() }));
}

export function decodeRoomMessage(data) {
  try {
    const raw = typeof data === 'string' ? data : decoder.decode(data);
    const parsed = JSON.parse(raw);
    if (!parsed?.type) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const ROOM_MSG_COPY = {
  [ROOM_MSG.RECORDING_STARTED]: 'This meeting is being recorded by the host.',
  [ROOM_MSG.RECORDING_STOPPED]: 'Recording has stopped.',
  [ROOM_MSG.MEETING_ENDED]: 'The host has ended the meeting for everyone.',
};
