import Meeting from '../models/Meeting.js';
import livekitConfig from '../config/livekit.js';
import livekitTokenService from '../utils/livekitTokenService.js';

class LiveKitController {
  testSetup = async (req, res) => {
    res.json({
      success: true,
      configured: livekitConfig.isValid(),
      publicConfig: livekitConfig.getPublicConfig(),
    });
  };

  generateMeetingToken = async (req, res) => {
    try {
      const { meetingId } = req.params;
      const { role = 'participant' } = req.body;

      if (!livekitConfig.isValid()) {
        return res.status(503).json({
          success: false,
          message: 'LiveKit video conferencing is not configured',
          code: 'LIVEKIT_NOT_CONFIGURED',
        });
      }

      const meeting = await Meeting.findById(meetingId)
        .populate('host', 'name email')
        .populate('participants.user', 'name email');

      if (!meeting) {
        return res.status(404).json({ success: false, message: 'Meeting not found' });
      }

      if (meeting.status === 'cancelled') {
        return res.status(410).json({
          success: false,
          message: 'This meeting has been cancelled',
          code: 'MEETING_CANCELLED',
        });
      }

      if (meeting.status === 'completed') {
        return res.status(410).json({
          success: false,
          message: 'This meeting has already ended',
          code: 'MEETING_COMPLETED',
        });
      }

      const isHost = meeting.host._id.toString() === req.user.id;
      const isParticipant = meeting.participants.some(
        (p) => p.user._id.toString() === req.user.id
      );

      if (!isHost && !isParticipant && meeting.isPrivate) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to join this meeting',
        });
      }

      const roomName = livekitTokenService.buildRoomName(meeting._id.toString());
      await livekitTokenService.ensureRoom(roomName, {
        maxParticipants: meeting.maxParticipants || 50,
      });

      const userIsHost = role === 'host' || isHost;
      const token = await livekitTokenService.generateToken({
        roomName,
        identity: req.user.id.toString(),
        name: req.user.name || 'User',
        isHost: userIsHost,
        metadata: { meetingId: meeting._id.toString(), role: userIsHost ? 'host' : 'participant' },
      });

      meeting.liveKit = meeting.liveKit || {};
      meeting.liveKit.roomName = roomName;
      meeting.liveKit.lastJoinedAt = new Date();
      await meeting.save();

      return res.json({
        success: true,
        token,
        roomName,
        wsUrl: livekitConfig.wsUrl,
        identity: req.user.id.toString(),
        name: req.user.name,
        role: userIsHost ? 'host' : 'participant',
        meeting: {
          id: meeting._id,
          title: meeting.title,
          host: { id: meeting.host._id, name: meeting.host.name },
        },
      });
    } catch (error) {
      console.error('LiveKit token error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate LiveKit token',
        error: error.message,
      });
    }
  };

  startVideoMeeting = async (req, res) => {
    try {
      const { meetingId } = req.params;
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({ success: false, message: 'Meeting not found' });
      }

      if (meeting.host.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Only host can start meeting' });
      }

      if (meeting.status === 'cancelled') {
        return res.status(410).json({
          success: false,
          message: 'This meeting has been cancelled',
          code: 'MEETING_CANCELLED',
        });
      }

      if (meeting.status === 'completed') {
        return res.status(410).json({
          success: false,
          message: 'This meeting has already ended',
          code: 'MEETING_COMPLETED',
        });
      }

      meeting.status = 'in-progress';
      meeting.videoStartedAt = new Date();
      meeting.liveKit = meeting.liveKit || {};
      meeting.liveKit.roomName = livekitTokenService.buildRoomName(meeting._id.toString());
      await meeting.save();

      return res.json({ success: true, meeting });
    } catch (error) {
      console.error('Start video meeting error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  endVideoMeeting = async (req, res) => {
    try {
      const { meetingId } = req.params;
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({ success: false, message: 'Meeting not found' });
      }

      if (meeting.host.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Only host can end meeting' });
      }


      const roomName = meeting.liveKit?.roomName || livekitTokenService.buildRoomName(meeting._id.toString());
      try {
        await livekitTokenService.deleteRoom(roomName);
      } catch (deleteError) {
        console.warn('LiveKit deleteRoom warning:', deleteError.message);
      }

      meeting.status = 'completed';
      meeting.videoEndedAt = new Date();
      if (meeting.videoStartedAt) {
        meeting.actualDuration = Math.round(
          (new Date() - new Date(meeting.videoStartedAt)) / 60000
        );
      }
      meeting.liveKit = meeting.liveKit || {};
      meeting.liveKit.recordingActive = false;
      await meeting.save();

      return res.json({ success: true, meeting });
    } catch (error) {
      console.error('End video meeting error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  /** Host-only: mark meeting as actively recording (client captures room A/V). */
  startRecording = async (req, res) => {
    try {
      const { meetingId } = req.params;
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({ success: false, message: 'Meeting not found' });
      }

      if (meeting.host.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Only the host can record the meeting' });
      }

      if (meeting.liveKit?.recordingActive) {
        return res.status(400).json({ success: false, message: 'Recording is already in progress' });
      }

      meeting.liveKit = meeting.liveKit || {};
      meeting.liveKit.recordingActive = true;
      meeting.liveKit.recordingStartedAt = new Date();
      meeting.liveKit.recordingEndedAt = null;
      await meeting.save();

      return res.json({
        success: true,
        recordingActive: true,
        recordingStartedAt: meeting.liveKit.recordingStartedAt,
      });
    } catch (error) {
      console.error('Start recording error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  /** Host-only: end recording session (client uploads file to /api/recordings). */
  stopRecording = async (req, res) => {
    try {
      const { meetingId } = req.params;
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({ success: false, message: 'Meeting not found' });
      }

      if (meeting.host.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Only the host can stop recording' });
      }

      meeting.liveKit = meeting.liveKit || {};
      meeting.liveKit.recordingActive = false;
      meeting.liveKit.recordingEndedAt = new Date();
      await meeting.save();

      return res.json({
        success: true,
        recordingActive: false,
        recordingEndedAt: meeting.liveKit.recordingEndedAt,
      });
    } catch (error) {
      console.error('Stop recording error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  getRecordingStatus = async (req, res) => {
    try {
      const { meetingId } = req.params;
      const meeting = await Meeting.findById(meetingId).select('liveKit host');
      if (!meeting) {
        return res.status(404).json({ success: false, message: 'Meeting not found' });
      }

      const isHost = meeting.host.toString() === req.user.id;
      return res.json({
        success: true,
        recordingActive: Boolean(meeting.liveKit?.recordingActive),
        recordingStartedAt: meeting.liveKit?.recordingStartedAt || null,
        recordingEndedAt: meeting.liveKit?.recordingEndedAt || null,
        isHost,
      });
    } catch (error) {
      console.error('Recording status error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };
}

export default new LiveKitController();
