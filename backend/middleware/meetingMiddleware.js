import Meeting from '../models/Meeting.js';

// Check if user can access meeting
export const canAccessMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('host', 'name email')
      .populate('participants.user', 'name email');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if user is host or participant
    const isHost = meeting.host._id.toString() === req.user.id;
    const isParticipant = meeting.participants.some(
      participant => participant.user._id.toString() === req.user.id
    );

    if (!isHost && !isParticipant && meeting.isPrivate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this meeting'
      });
    }

    req.meeting = meeting;
    req.isHost = isHost;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking meeting access'
    });
  }
};

// Check if user is meeting host
export const isMeetingHost = async (req, res, next) => {
  try {
    if (!req.isHost) {
      return res.status(403).json({
        success: false,
        message: 'Only meeting host can perform this action'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying host status'
    });
  }
};

// Validate meeting time conflicts
export const checkTimeConflict = async (req, res, next) => {
  try {
    const { startTime, endTime } = req.body;
    const userId = req.user.id;

    if (!startTime || !endTime) {
      return next();
    }

    const conflict = await Meeting.findOne({
      $or: [
        { host: userId },
        { 'participants.user': userId }
      ],
      $and: [
        {
          $or: [
            { startTime: { $lt: new Date(endTime) }, endTime: { $gt: new Date(startTime) } }
          ]
        }
      ],
      status: { $in: ['scheduled', 'in-progress'] }
    });

    if (conflict) {
      return res.status(400).json({
        success: false,
        message: 'Time conflict with existing meeting',
        conflictingMeeting: {
          id: conflict._id,
          title: conflict.title,
          startTime: conflict.startTime,
          endTime: conflict.endTime
        }
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking time conflict'
    });
  }
};