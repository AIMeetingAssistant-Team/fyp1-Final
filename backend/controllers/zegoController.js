import Meeting from '../models/Meeting.js';
import zegoTokenGenerator from '../utils/zegoTokenGenerator.js';
import zegoCloudConfig from '../config/zegoCloud.js';

class ZegoController {
  /**
   * Generate meeting token (MAIN ENDPOINT)
   */
  generateMeetingToken = async (req, res) => {
    try {
      const { meetingId } = req.params;
      const { role = 'participant' } = req.body;

      console.log('\n🎯 [ZEGO] Token request for meeting:', meetingId);
      console.log('📱 User:', req.user.name, 'ID:', req.user.id);

      // Check if ZEGOCLOUD is configured
      if (!zegoCloudConfig.isValid()) {
        return res.status(503).json({
          success: false,
          message: 'Video conferencing is not configured',
          code: 'ZEGOCLOUD_NOT_CONFIGURED'
        });
      }

      const meeting = await Meeting.findById(meetingId)
        .populate('host', 'name email')
        .populate('participants.user', 'name email');

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      // Check authorization
      const isHost = meeting.host._id.toString() === req.user.id;
      const isParticipant = meeting.participants.some(
        p => p.user._id.toString() === req.user.id
      );

      if (!isHost && !isParticipant && meeting.isPrivate) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to join this meeting'
        });
      }

      // Ensure meeting has videoRoomId
      const roomId = meeting._id.toString();

      const userId = req.user.id.toString();
      const userName = req.user.name || "User";
      const userIsHost = role === 'host' || isHost;

      console.log('📋 Token params:', {
        roomId,
        userId,
        userName,
        isHost: userIsHost,
        meetingTitle: meeting.title
      });

      // Generate token
      let tokenData;
      if (userIsHost) {
        tokenData = zegoTokenGenerator.generateHostToken(userId, roomId);
      } else {
        tokenData = zegoTokenGenerator.generateParticipantToken(userId, roomId);
      }

      // Update token with user name
      tokenData.userName = userName;

      const response = {
        success: true,
        token: tokenData.token,
        appID: tokenData.appID,
        userID: tokenData.userID,
        roomID: tokenData.roomID,
        userName: tokenData.userName,
        role: userIsHost ? 'host' : 'participant',
        privilege: tokenData.privilege,
        meeting: {
          id: meeting._id,
          title: meeting.title,
          host: {
            id: meeting.host._id,
            name: meeting.host.name
          }
        },
        zegoConfig: {
          appID: zegoCloudConfig.appId,
          serverSecretConfigured: !!zegoCloudConfig.serverSecret
        }
      };

      console.log('✅ Token generated successfully, length:', response.token.length);
      console.log('🔑 App ID:', response.appID);
      console.log('🏠 Room ID:', response.roomID);

      res.status(200).json(response);

    } catch (error) {
      console.error('❌ Token generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate meeting token',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  /**
   * Start video meeting (host only)
   */
  startVideoMeeting = async (req, res) => {
    try {
      const { meetingId } = req.params;

      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      // Check if user is host
      if (meeting.host.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Only meeting host can start the video meeting'
        });
      }

      // Update meeting status
      meeting.status = 'in-progress';
      meeting.videoStartedAt = new Date();
      await meeting.save();

      // Generate token for host
      const roomId = meeting._id.toString();
      const tokenData = zegoTokenGenerator.generateHostToken(
        req.user.id.toString(),
        roomId
      );

      res.status(200).json({
        success: true,
        message: 'Video meeting started successfully',
        token: tokenData.token,
        appID: tokenData.appID,
        roomID: tokenData.roomID,
        userID: tokenData.userID,
        userName: req.user.name,
        meeting: {
          id: meeting._id,
          title: meeting.title,
          status: meeting.status
        }
      });

    } catch (error) {
      console.error('Start meeting error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };
  // Add these methods to your existing zegoController.js

/**
 * Generate instant meeting token
 */
generateInstantMeetingToken = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { role = 'participant' } = req.body;

    console.log('\n🎯 [ZEGO] Instant meeting token for:', meetingId);
    console.log('👤 User:', req.user.name, 'Role:', role);

    // Check ZEGOCLOUD config
    if (!zegoCloudConfig.isValid()) {
      return res.status(503).json({
        success: false,
        message: 'Video conferencing is not configured',
        code: 'ZEGOCLOUD_NOT_CONFIGURED'
      });
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // For instant meetings, allow anyone with the code to join
    // We still check if meeting is active
    if (meeting.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This meeting has been cancelled'
      });
    }

    if (meeting.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'This meeting has already ended'
      });
    }

    const roomId = meeting._id.toString();
    const userId = req.user.id.toString();
    const userName = req.user.name || "User";
    const userIsHost = role === 'host' || meeting.host.toString() === userId;

    console.log('📋 Instant meeting token params:', {
      roomId,
      userId,
      userName,
      isHost: userIsHost,
      meetingTitle: meeting.title
    });

    // Generate token
    let tokenData;
    if (userIsHost) {
      tokenData = zegoTokenGenerator.generateHostToken(userId, roomId);
    } else {
      tokenData = zegoTokenGenerator.generateParticipantToken(userId, roomId);
    }

    // Update token with user info
    tokenData.userName = userName;

    const response = {
      success: true,
      token: tokenData.token,
      appID: tokenData.appID,
      userID: tokenData.userID,
      roomID: tokenData.roomID,
      userName: tokenData.userName,
      role: userIsHost ? 'host' : 'participant',
      privilege: tokenData.privilege,
      meeting: {
        id: meeting._id,
        title: meeting.title,
        meetingCode: meeting.meetingCode,
        status: meeting.status
      },
      zegoConfig: {
        appID: zegoCloudConfig.appId,
        serverSecretConfigured: !!zegoCloudConfig.serverSecret
      }
    };

    console.log('✅ Instant meeting token generated');
    
    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Instant meeting token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate meeting token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get meeting info by code (public endpoint)
 */
getMeetingByCode = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Meeting code is required'
      });
    }

    const meeting = await Meeting.findOne({ meetingCode: code })
      .populate('host', 'name email profilePicture')
      .select('-participants'); // Don't expose all participants publicly

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Return basic meeting info
    const response = {
      success: true,
      meeting: {
        id: meeting._id,
        title: meeting.title,
        meetingCode: meeting.meetingCode,
        status: meeting.status,
        meetingType: meeting.meetingType,
        host: meeting.host,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        isPrivate: meeting.isPrivate,
        isActive: meeting.status === 'in-progress' || 
                 (meeting.status === 'scheduled' && 
                  meeting.startTime <= new Date() && 
                  meeting.endTime >= new Date())
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Get meeting by code error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

  /**
   * End video meeting (host only)
   */
  endVideoMeeting = async (req, res) => {
    try {
      const { meetingId } = req.params;

      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      if (meeting.host.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Only meeting host can end the video meeting'
        });
      }

      // Update meeting
      meeting.status = 'completed';
      meeting.videoEndedAt = new Date();

      if (meeting.videoStartedAt) {
        meeting.actualDuration = Math.round(
          (meeting.videoEndedAt - meeting.videoStartedAt) / (1000 * 60)
        );
      }

      await meeting.save();

      res.status(200).json({
        success: true,
        message: 'Video meeting ended successfully',
        meeting: {
          id: meeting._id,
          title: meeting.title,
          duration: meeting.actualDuration,
          status: meeting.status
        }
      });

    } catch (error) {
      console.error('End meeting error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Test ZEGOCLOUD configuration
   */
  testSetup = async (req, res) => {
    try {
      if (!zegoCloudConfig.isValid()) {
        return res.status(400).json({
          success: false,
          message: 'ZEGOCLOUD credentials not configured',
          config: {
            appId: process.env.ZEGOCLOUD_APP_ID,
            secretLength: process.env.ZEGOCLOUD_SERVER_SECRET?.length
          }
        });
      }

      const testUserId = `test_${Date.now()}`;
      const testRoomId = `test_room_${Date.now()}`;

      const tokenData = zegoTokenGenerator.generateHostToken(testUserId, testRoomId);

      // Verify the token
      const verification = zegoTokenGenerator.verifyToken(tokenData.token);

      res.status(200).json({
        success: true,
        message: '✅ ZEGOCLOUD is working correctly!',
        config: {
          appId: process.env.ZEGOCLOUD_APP_ID,
          secretLength: process.env.ZEGOCLOUD_SERVER_SECRET?.length,
          configured: zegoCloudConfig.isValid()
        },
        testToken: {
          token: tokenData.token,
          length: tokenData.token.length,
          appID: tokenData.appID,
          roomID: tokenData.roomID,
          userID: tokenData.userID,
          verified: verification.valid
        }
      });

    } catch (error) {
      console.error('Test error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };

  /**
   * Get meeting recordings (if any)
   */
  getMeetingRecordings = async (req, res) => {
    try {
      const { meetingId } = req.params;

      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      // Check authorization
      const isHost = meeting.host.toString() === req.user.id;
      const isParticipant = meeting.participants.some(
        p => p.user.toString() === req.user.id
      );

      if (!isHost && !isParticipant && meeting.isPrivate) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view recordings'
        });
      }

      res.status(200).json({
        success: true,
        recordings: meeting.recordings || [],
        count: meeting.recordings?.length || 0
      });

    } catch (error) {
      console.error('Get recordings error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };
}


export default new ZegoController();