import { useEffect } from 'react';
import { useLocalParticipant } from '@livekit/components-react';

/**
 * Exposes the LiveKit local microphone MediaStream so transcription
 * does not open a second getUserMedia session (which causes device conflicts).
 */
export default function LiveKitMicStreamBridge({ onStreamChange }) {
  const { microphoneTrack, isMicrophoneEnabled } = useLocalParticipant();

  useEffect(() => {
    const mediaTrack = microphoneTrack?.track?.mediaStreamTrack;
    if (mediaTrack && isMicrophoneEnabled) {
      onStreamChange(new MediaStream([mediaTrack]));
      return;
    }
    onStreamChange(null);
  }, [microphoneTrack, isMicrophoneEnabled, onStreamChange]);

  return null;
}
