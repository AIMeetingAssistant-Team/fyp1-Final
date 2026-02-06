import Meeting from '../models/Meeting.js';
import MeetingInvite from '../models/MeetingInvite.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/emailService.js';
import { 
  generateMeetingInviteEmail, 
  generateMeetingReminderEmail,
  generateMeetingUpdateEmail 
} from '../utils/emailService.js';
import crypto from 'crypto';

// -------------------------------------------------------------------
// SEND MEETING INVITES
// -------------------------------------------------------------------
export const sendMeetingInvites = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { participantEmails, customMessage } = req.body;

    if (!participantEmails || !Array.isArray(participantEmails) || participantEmails.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one participant email'
      });
    }

    // Check if meeting exists and user is host
    const meeting = await Meeting.findById(meetingId)
      .populate('host', 'name email');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Verify user is the meeting host
    if (meeting.host._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only meeting host can send invites'
      });
    }

    const results = {
      sent: [],
      failed: [],
      alreadyInvited: []
    };

    // Process each email
    for (const email of participantEmails) {
      try {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          results.failed.push({ email, error: 'Invalid email format' });
          continue;
        }

        // Find user by email
        let user = await User.findOne({ email: email.toLowerCase() });
        let userId = user?._id;

        // If user doesn't exist, we can still send to email (for external guests)
        if (!user) {
          console.log(`📧 External guest invitation: ${email}`);
        }

        // Check if already invited to this meeting
        const existingInvite = await MeetingInvite.findOne({
          meeting: meetingId,
          $or: [
            { invitedUser: userId },
            { email: email.toLowerCase() }
          ]
        });

        if (existingInvite) {
          results.alreadyInvited.push({ email, inviteId: existingInvite._id });
          continue;
        }

        // Generate unique token for this invite
        const token = crypto.randomBytes(32).toString('hex');

        // Create invite record
        const invite = await MeetingInvite.create({
          meeting: meetingId,
          invitedUser: userId,
          email: email.toLowerCase(),
          role: user ? 'participant' : 'guest',
          token: token
        });

        // Send email invitation
        try {
          await sendEmail(
            email,
            `Meeting Invitation: ${meeting.title}`,
            generateMeetingInviteEmail(meeting, invite, customMessage)
          );

          results.sent.push({ 
            email, 
            inviteId: invite._id,
            isExternal: !user 
          });

          console.log(`✅ Invite sent to: ${email}`);
        } catch (emailError) {
          // Delete the invite if email fails
          await MeetingInvite.findByIdAndDelete(invite._id);
          results.failed.push({ email, error: 'Email delivery failed' });
          console.error(`❌ Email failed for: ${email}`, emailError);
        }

      } catch (error) {
        results.failed.push({ email, error: error.message });
        console.error(`❌ Error processing invite for: ${email}`, error);
      }
    }

    // Update meeting invite status if any invites were sent
    if (results.sent.length > 0) {
      meeting.inviteStatus.sent = true;
      meeting.inviteStatus.sentAt = new Date();
      if (customMessage) {
        meeting.customMessage = customMessage;
      }
      await meeting.save();
    }

    res.status(200).json({
      success: true,
      message: `Invites processed: ${results.sent.length} sent, ${results.failed.length} failed, ${results.alreadyInvited.length} already invited`,
      results
    });

  } catch (error) {
    console.error('Send meeting invites error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// -------------------------------------------------------------------
// RESPOND TO INVITE
// -------------------------------------------------------------------
export const respondToInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const { action, note } = req.body;

    if (!['accept', 'decline', 'maybe'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be: accept, decline, or maybe'
      });
    }

    // Find invite by token
    const invite = await MeetingInvite.findByToken(token);
    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite not found or expired'
      });
    }

    // Check if already responded
    if (invite.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `You have already ${invite.status} this invitation`
      });
    }

    // Check if invite is expired (24 hours)
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (Date.now() - invite.createdAt > twentyFourHours) {
      return res.status(400).json({
        success: false,
        message: 'This invitation has expired'
      });
    }

    // Update invite status
    invite.status = action === 'accept' ? 'accepted' : 
                   action === 'decline' ? 'declined' : 'maybe';
    invite.respondedAt = new Date();
    if (note) {
      invite.responseNote = note;
    }
    await invite.save();

    // If accepted, add user to meeting participants
    if (action === 'accept' && invite.invitedUser) {
      const meeting = await Meeting.findById(invite.meeting);
      
      // Check if user is already a participant
      const isAlreadyParticipant = meeting.participants.some(
        p => p.user.toString() === invite.invitedUser._id.toString()
      );

      if (!isAlreadyParticipant) {
        meeting.participants.push({
          user: invite.invitedUser._id,
          role: invite.role,
          status: 'accepted'
        });
        await meeting.save();
      }
    }

    // Get updated meeting info for response
    const meeting = await Meeting.findById(invite.meeting)
      .populate('host', 'name email');

    res.status(200).json({
      success: true,
      message: `Invitation ${action}ed successfully`,
      response: {
        status: invite.status,
        respondedAt: invite.respondedAt,
        note: invite.responseNote
      },
      meeting: {
        id: meeting._id,
        title: meeting.title,
        startTime: meeting.startTime,
        host: meeting.host
      }
    });

  } catch (error) {
    console.error('Respond to invite error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// -------------------------------------------------------------------
// GET MEETING INVITES
// -------------------------------------------------------------------
export const getMeetingInvites = async (req, res) => {
  try {
    const { meetingId } = req.params;

    // Check if meeting exists and user has access
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if user is host or participant
    const isHost = meeting.host.toString() === req.user.id;
    const isParticipant = meeting.participants.some(
      p => p.user.toString() === req.user.id
    );

    if (!isHost && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view invites for this meeting'
      });
    }

    const invites = await MeetingInvite.find({ meeting: meetingId })
      .populate('invitedUser', 'name email profilePicture')
      .sort({ createdAt: -1 });

    // Summary statistics
    const summary = {
      total: invites.length,
      pending: invites.filter(i => i.status === 'pending').length,
      accepted: invites.filter(i => i.status === 'accepted').length,
      declined: invites.filter(i => i.status === 'declined').length,
      maybe: invites.filter(i => i.status === 'maybe').length
    };

    res.status(200).json({
      success: true,
      invites,
      summary
    });

  } catch (error) {
    console.error('Get meeting invites error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// -------------------------------------------------------------------
// RESEND INVITE
// -------------------------------------------------------------------
export const resendInvite = async (req, res) => {
  try {
    const { inviteId } = req.params;

    const invite = await MeetingInvite.findById(inviteId)
      .populate('meeting')
      .populate('invitedUser', 'email name');

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite not found'
      });
    }

    // Check if user is meeting host
    const meeting = await Meeting.findById(invite.meeting);
    if (meeting.host.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only meeting host can resend invites'
      });
    }

    // Generate new token (invalidate old one)
    const newToken = crypto.randomBytes(32).toString('hex');
    invite.token = newToken;
    await invite.save();

    // Resend email
    try {
      await sendEmail(
        invite.email,
        `Meeting Invitation: ${meeting.title}`,
        generateMeetingInviteEmail(meeting, invite, meeting.customMessage)
      );

      res.status(200).json({
        success: true,
        message: 'Invite resent successfully'
      });

    } catch (emailError) {
      res.status(500).json({
        success: false,
        message: 'Failed to send email'
      });
    }

  } catch (error) {
    console.error('Resend invite error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// -------------------------------------------------------------------
// SEND MEETING REMINDERS
// -------------------------------------------------------------------
export const sendMeetingReminders = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findById(meetingId)
      .populate('host', 'name email');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if user is meeting host
    if (meeting.host._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only meeting host can send reminders'
      });
    }

    // Check if meeting is in the future
    if (new Date(meeting.startTime) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send reminders for past meetings'
      });
    }

    // Get all accepted/pending invites
    const invites = await MeetingInvite.find({
      meeting: meetingId,
      status: { $in: ['accepted', 'pending', 'maybe'] }
    }).populate('invitedUser', 'email name');

    const results = {
      sent: [],
      failed: []
    };

    // Send reminders to each invitee
    for (const invite of invites) {
      try {
        await sendEmail(
          invite.email,
          `Reminder: ${meeting.title} starting soon`,
          generateMeetingReminderEmail(meeting, invite)
        );

        // Mark reminder as sent
        invite.reminderSent = true;
        invite.reminderSentAt = new Date();
        await invite.save();

        results.sent.push(invite.email);
        console.log(`✅ Reminder sent to: ${invite.email}`);

      } catch (emailError) {
        results.failed.push({ email: invite.email, error: emailError.message });
        console.error(`❌ Reminder failed for: ${invite.email}`, emailError);
      }
    }

    // Update meeting reminder status
    meeting.inviteStatus.reminderSent = true;
    meeting.inviteStatus.reminderSentAt = new Date();
    await meeting.save();

    res.status(200).json({
      success: true,
      message: `Reminders sent: ${results.sent.length} successful, ${results.failed.length} failed`,
      results
    });

  } catch (error) {
    console.error('Send meeting reminders error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// -------------------------------------------------------------------
// GET USER INVITES
// -------------------------------------------------------------------
export const getUserInvites = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = {
      $or: [
        { invitedUser: req.user.id },
        { email: req.user.email }
      ]
    };

    // Filter by status if provided
    if (status && ['pending', 'accepted', 'declined', 'maybe'].includes(status)) {
      query.status = status;
    }

    const invites = await MeetingInvite.find(query)
      .populate('meeting', 'title startTime endTime description host status')
      .populate('host', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MeetingInvite.countDocuments(query);

    res.status(200).json({
      success: true,
      invites,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get user invites error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// -------------------------------------------------------------------
// CANCEL INVITE
// -------------------------------------------------------------------
export const cancelInvite = async (req, res) => {
  try {
    const { inviteId } = req.params;

    const invite = await MeetingInvite.findById(inviteId)
      .populate('meeting');

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite not found'
      });
    }

    // Check if user is meeting host
    const meeting = await Meeting.findById(invite.meeting);
    if (meeting.host.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only meeting host can cancel invites'
      });
    }

    // Remove from meeting participants if they were added
    if (invite.status === 'accepted' && invite.invitedUser) {
      meeting.participants = meeting.participants.filter(
        p => p.user.toString() !== invite.invitedUser.toString()
      );
      await meeting.save();
    }

    // Delete the invite
    await MeetingInvite.findByIdAndDelete(inviteId);

    res.status(200).json({
      success: true,
      message: 'Invite cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel invite error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};