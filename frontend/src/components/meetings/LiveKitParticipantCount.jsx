import { useEffect } from 'react';
import { useParticipants } from '@livekit/components-react';

export default function LiveKitParticipantCount({ onChange }) {
  const participants = useParticipants();

  useEffect(() => {
    onChange?.(participants.length);
  }, [participants.length, onChange]);

  return null;
}
