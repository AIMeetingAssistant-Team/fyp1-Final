import { useParams } from 'react-router-dom';
import LiveKitMeetingRoom from '../components/meetings/LiveKitMeetingRoom';

export default function VideoMeeting() {
    const { meetingId } = useParams();
  return <LiveKitMeetingRoom meetingId={meetingId} />;
}
