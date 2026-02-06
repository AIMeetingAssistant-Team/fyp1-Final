import Meeting from '../models/Meeting.js';
import User from '../models/User.js';
import { createLoginHistory } from './authController.js';

// @desc    Create instant meeting
// @route   POST /api/meetings/instant
// @access  Private
export const createInstantMeeting = async (req, res) => {
  try {
    const { title } = req.body;
    const userId = req.user.id;

    console.log('🎯 Creating instant meeting for user:', userId);

    // Create instant meeting
    const meeting = await Meeting.createInstantMeeting(userId, title || "Instant Meeting");
    
    // Generate ZEGO token immediately
    const roomId = meeting._id.toString();
    const zegoTokenData = {
      roomId,
      userId: req.user.id,
      userName: req.user.name,
      isHost: true
    };

    // Populate meeting data
    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate('host', 'name email profilePicture')
      .populate('participants.user', 'name email profilePicture');

    // Create login history
    await createLoginHistory(userId, "instant_meeting_created", req);

    res.status(201).json({
      success: true,
      message: 'Instant meeting created successfully',
      meeting: {
        ...populatedMeeting.toObject(),
        meetingCode: meeting.meetingCode,
        shareableLink: meeting.getShareableLink(),
        zegoTokenData
      }
    });

  } catch (error) {
    console.error('Create instant meeting error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Join meeting by code
// @route   GET /api/meetings/code/:code
// @access  Private
export const joinMeetingByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Meeting code is required'
      });
    }

    console.log('🔍 Joining meeting by code:', code, 'User:', userId);

    // Find meeting by code
    const meeting = await Meeting.joinByCode(code, userId);

    // Generate ZEGO token for participant
    const roomId = meeting._id.toString();
    const zegoTokenData = {
      roomId,
      userId: req.user.id,
      userName: req.user.name,
      isHost: meeting.host._id.toString() === userId
    };

    // Create login history
    await createLoginHistory(userId, "joined_by_code", req);

    res.status(200).json({
      success: true,
      message: 'Meeting found successfully',
      meeting: {
        ...meeting.toObject(),
        meetingCode: meeting.meetingCode,
        shareableLink: meeting.getShareableLink(),
        zegoTokenData
      },
      isHost: meeting.host._id.toString() === userId
    });

  } catch (error) {
    console.error('Join by code error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found. Check the code and try again.'
      });
    }

    if (error.message.includes('cancelled')) {
      return res.status(400).json({
        success: false,
        message: 'This meeting has been cancelled by the host.'
      });
    }

    if (error.message.includes('ended')) {
      return res.status(400).json({
        success: false,
        message: 'This meeting has already ended.'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get meeting share info
// @route   GET /api/meetings/:id/share
// @access  Private
export const getMeetingShareInfo = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('host', 'name email profilePicture');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if user has access
    const isHost = meeting.host._id.toString() === req.user.id;
    const isParticipant = meeting.participants.some(
      p => p.user.toString() === req.user.id
    );

    if (!isHost && !isParticipant && meeting.isPrivate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this meeting'
      });
    }

    const shareInfo = meeting.getShareInfo();

    res.status(200).json({
      success: true,
      shareInfo
    });

  } catch (error) {
    console.error('Get share info error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Copy meeting to clipboard (for QR code generation)
// @route   POST /api/meetings/:id/copy-link
// @access  Private
export const copyMeetingLink = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    const shareableLink = meeting.getShareableLink();

    // Log the copy action
    await createLoginHistory(req.user.id, "copied_meeting_link", req);

    res.status(200).json({
      success: true,
      message: 'Meeting link ready to copy',
      shareableLink,
      meetingCode: meeting.meetingCode
    });

  } catch (error) {
    console.error('Copy link error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Validate meeting code
// @route   GET /api/meetings/validate-code/:code
// @access  Private
export const validateMeetingCode = async (req, res) => {
  try {
    const { code } = req.params;

    const meeting = await Meeting.findOne({ meetingCode: code })
      .select('title status host meetingType isPrivate startTime endTime');

    if (!meeting) {
      return res.status(200).json({
        success: true,
        valid: false,
        message: 'Invalid meeting code'
      });
    }

    const now = new Date();
    const isActive = meeting.status === 'in-progress' || 
                     (meeting.status === 'scheduled' && meeting.startTime <= now && meeting.endTime >= now);

    res.status(200).json({
      success: true,
      valid: true,
      isActive,
      meeting: {
        id: meeting._id,
        title: meeting.title,
        status: meeting.status,
        meetingType: meeting.meetingType,
        startTime: meeting.startTime,
        endTime: meeting.endTime
      }
    });

  } catch (error) {
    console.error('Validate code error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};