import Meeting from '../models/Meeting.js';
import User from '../models/User.js';
import moment from 'moment';
import aiService from '../utils/aiService.js';
import { sendEmail } from '../utils/emailService.js';
import fs from "fs";

// @desc    Upload shared document (Cloudinary)
// @route   POST /api/meetings/:id/documents
// @access  Private (Host only)

// @desc    Create a new meeting
// @route   POST /api/meetings
// @access  Private
export const createMeeting = async (req, res) => {
  try {
    const {
      title,
      description,
      meetingType,
      startTime,
      endTime,
      emails,
      agenda,
      timezone,
      isPrivate,
      autoProcessAI = false // New parameter
    } = req.body;
    console.log(req.body.emails)
    if (!emails || emails.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one participant email is required."
      });
    }

    const users = await User.find({ email: { $in: emails } }).select("email _id");

    const registeredEmails = users.map(u => u.email.toLowerCase());
    const inputEmails = emails.map(e => e.toLowerCase());
    const invalidEmails = inputEmails.filter(e => !registeredEmails.includes(e));

    if (invalidEmails.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some participant emails are not registered.",
        invalidEmails
      });
    }

    const participants = users.map(u => ({
      user: u._id,
      role: "participant"
    }));

    // All emails valid → create meeting
    const meeting = await Meeting.create({
      title,
      description,
      host: req.user.id,
      meetingType: meetingType || 'live',
      startTime,
      endTime,
      isPrivate: isPrivate || false,
      agenda,
      timezone,
      isPrivate,
      participants: participants,
      autoProcessAI: autoProcessAI !== undefined ? autoProcessAI : true // Default to true if not provided
    });

    // Always add host as participant
    meeting.addParticipant(req.user.id, 'host');
    await meeting.save();

    // After creating meeting, if autoProcessAI is true and meetingType is 'upload'
    if (autoProcessAI && meetingType === 'upload') {
      // Schedule AI processing for 1 minute after creation
      setTimeout(async () => {
        try {
          const meetingDoc = await Meeting.findById(meeting._id);
          if (meetingDoc && meetingDoc.recordings?.length > 0) {
            console.log(`🤖 Auto-starting AI processing for meeting: ${meetingDoc.title}`);
            
            // You would call your AI processing function here
            // For example: await processMeetingAI(meetingDoc, req.user.id);
          }
        } catch (error) {
          console.error('Auto AI processing error:', error);
        }
      }, 60000); // 1 minute delay
    }

    // Populate meeting data
    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate('host', 'name email profilePicture')
      .populate('participants.user', 'name email profilePicture');

    // ✅ AUTO-LINKS READY!
    res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      meeting: {
        ...populatedMeeting.toObject(),
        joinLink: populatedMeeting.joinLink,           // ✅ AUTO-GENERATED
        videoMeetingLink: populatedMeeting.videoMeetingLink // ✅ AUTO-GENERATED
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all meetings for user (FAST - relies on background job)
// @route   GET /api/meetings
// @access  Private
export const getMeetings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      from,
      to,
      search
    } = req.query;
    console.log(req.query)
    let query = {
      $or: [
        { host: req.user.id },
        { 'participants.user': req.user.id }
      ]
    };

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by type
    if (type && type !== 'all') {
      query.meetingType = type;
    }

    // Filter by ONLY startDate (single day)
    if (from && !to) {
      const start = new Date(from);
      const end = new Date(from);
      end.setHours(23, 59, 59, 999);

      query.startTime = { $gte: start, $lte: end };
    }

    // Filter by date range
    if (from && to) {
      query.startTime = {
        $gte: new Date(from),
        $lte: new Date(to)
      };
    }

    // Search in title and description
    if (search) {
      query.$or = [
        ...query.$or,
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // ✅ FAST: Background job already handles status updates
    const meetings = await Meeting.find(query)
      .populate('host', 'name email profilePicture')
      .populate('participants.user', 'name email profilePicture')
      .sort({ startTime: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Meeting.countDocuments(query);

    res.status(200).json({
      success: true,
      meetings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single meeting (REAL-TIME ACCURATE)
// @route   GET /api/meetings/:id
// @access  Private
export const getMeeting = async (req, res) => {
  try {
    let meeting = await Meeting.findById(req.params.id)
      .populate('host', 'name email profilePicture')
      .populate('participants.user', 'name email profilePicture');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // ✅ REAL-TIME: Ensure 100% accuracy for single meeting
    const now = new Date();
    let statusChanged = false;

    if (meeting.status === 'scheduled' && meeting.startTime <= now && meeting.endTime >= now) {
      meeting.status = 'in-progress';
      statusChanged = true;
    } else if (meeting.status === 'in-progress' && meeting.endTime < now) {
      meeting.status = 'completed';
      statusChanged = true;
    } else if (meeting.status === 'scheduled' && meeting.endTime < now) {
      meeting.status = 'cancelled';
      statusChanged = true;
    }

    if (statusChanged) {
      await meeting.save();
      console.log(` Meeting ${meeting._id} status auto-updated to: ${meeting.status}`);
    }

    res.status(200).json({
      success: true,
      meeting: {
        ...meeting.toObject(),
        joinLink: meeting.joinLink,
        videoMeetingLink: meeting.videoMeetingLink
      },
      isHost: req.isHost
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update meeting
// @route   PUT /api/meetings/:id
// @access  Private (Host only)
// UPDATE Meeting (Option 1: safer way)
export const updateMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Allowed fields to update
    const fields = [
      'title',
      'description',
      'meetingType',
      'startTime',
      'endTime',
      'isPrivate',
      'agenda',
      'tags',
      'timezone'
    ];

    // Apply only provided fields
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        meeting[field] = req.body[field];
      }
    });

    // Save with full validation
    await meeting.save();

    await meeting.populate('host', 'name email profilePicture');
    await meeting.populate('participants.user', 'name email profilePicture');

    res.status(200).json({
      success: true,
      message: 'Meeting updated successfully',
      meeting
    });
  } catch (error) {
    console.error('Update error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete meeting
// @route   DELETE /api/meetings/:id
// @access  Private (Host only)
export const deleteMeeting = async (req, res) => {
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

    // ✅ GET ALL PARTICIPANTS EMAILS 
    const participantEmails = meeting.participants
      .map(p => p.user?.email)
      .filter(email => email && email !== meeting.host.email);

    // ✅ SEND EMAIL TO ALL PARTICIPANTS (if any)
    if (participantEmails.length > 0) {
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">❌ Meeting Cancelled</h1>
            </div>
            <div style="padding: 20px; background: #f9fafb;">
              <h2>${meeting.title}</h2>
              <p>The meeting has been <strong>cancelled and deleted</strong> by the host.</p>
              
              <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p><strong>📅 Original Schedule:</strong> ${new Date(meeting.startTime).toLocaleString()}</p>
                <p><strong>👤 Host:</strong> ${meeting.host.name}</p>
                ${meeting.description ? `<p><strong>📝 Agenda:</strong> ${meeting.description}</p>` : ''}
              </div>
              
              <p style="color: #6b7280;">If you have any questions, please contact the host directly.</p>
            </div>
          </div>
        `;

        // Send to all participants
        for (const email of participantEmails) {
          await sendEmail(
            email,
            `Meeting Cancelled: ${meeting.title}`,
            emailHtml
          );
          console.log(`✅ Cancellation email sent to: ${email}`);
        }
      } catch (emailError) {
        console.error('❌ Email sending failed:', emailError);
        // Continue with delete even if email fails
      }
    }

    // ✅ NOW DELETE MEETING
    await Meeting.findByIdAndDelete(req.params.id);

    console.log(`🗑️ Meeting deleted by ${req.user.name}: ${meeting.title}`);

    res.status(200).json({
      success: true,
      message: participantEmails.length > 0
        ? 'Meeting deleted successfully and participants notified'
        : 'Meeting deleted successfully'
    });

  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add participant to meeting
// @route   POST /api/meetings/:id/participants
// @access  Private (Host only)
export const addParticipant = async (req, res) => {
  try {
    const { email, role = "participant" } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already participant
    if (req.meeting.isParticipant(user._id)) {
      return res.status(400).json({
        success: false,
        message: "User is already a participant",
      });
    }

    req.meeting.addParticipant(user._id, role);
    await req.meeting.save();

    // ✅ AUTO-SEND EMAIL INVITATION when participant is added
    try {
      const MeetingInvite = (await import('../models/MeetingInvite.js')).default;
      const crypto = (await import('crypto')).default;
      const { sendEmail } = await import('../utils/emailService.js');
      const { generateMeetingInviteEmail } = await import('../utils/emailService.js');

      // Check if invite already exists
      let invite = await MeetingInvite.findOne({
        meeting: req.params.id,
        $or: [
          { invitedUser: user._id },
          { email: email.toLowerCase() }
        ]
      });

      if (!invite) {
        // Generate unique token for this invite
        const token = crypto.randomBytes(32).toString('hex');

        // Create invite record
        invite = await MeetingInvite.create({
          meeting: req.params.id,
          invitedUser: user._id,
          email: email.toLowerCase(),
          role: role,
          token: token
        });
      }

      // Send email invitation
      const populatedMeeting = await Meeting.findById(req.params.id)
        .populate('host', 'name email profilePicture');

      await sendEmail(
        email,
        `Meeting Invitation: ${populatedMeeting.title}`,
        generateMeetingInviteEmail(populatedMeeting, invite, populatedMeeting.customMessage || '')
      );

      console.log(`✅ Auto-sent invitation email to: ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send auto-invitation email:', emailError);
      // Continue even if email fails - participant is still added
    }

    const updatedMeeting = await Meeting.findById(req.params.id)
      .populate("host", "name email profilePicture")
      .populate("participants.user", "name email profilePicture");

    res.status(200).json({
      success: true,
      message: "Participant added successfully and invitation email sent",
      meeting: updatedMeeting,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Remove participant from meeting
// @route   DELETE /api/meetings/:id/participants/:participantId
// @access  Private (Host only)
// controllers/meetingController.js
export const removeParticipant = async (req, res) => {
  try {
    const participantId = req.params.participantId;

    // Make sure we compare ObjectIds properly
    req.meeting.participants = req.meeting.participants.filter(
      (p) => p.user._id.toString() !== participantId
    );

    await req.meeting.save();

    // Populate after saving
    const updatedMeeting = await Meeting.findById(req.params.id)
      .populate('host', 'name email profilePicture')
      .populate('participants.user', 'name email profilePicture');


    res.status(200).json({
      success: true,
      message: 'Participant removed successfully',
      meeting: updatedMeeting
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// @desc    Get calendar view
// @route   GET /api/meetings/calendar
// @access  Private
export const getCalendar = async (req, res) => {
  try {
    const { month, year } = req.query;
    const startDate = moment(`${year}-${month}-01`).startOf('month').toDate();
    const endDate = moment(startDate).endOf('month').toDate();

    const meetings = await Meeting.findByDateRange(startDate, endDate, req.user.id);

    // Group meetings by date
    const calendar = {};
    meetings.forEach(meeting => {
      const date = moment(meeting.startTime).format('YYYY-MM-DD');
      if (!calendar[date]) {
        calendar[date] = [];
      }
      calendar[date].push(meeting);
    });

    res.status(200).json({
      success: true,
      calendar,
      month: parseInt(month),
      year: parseInt(year)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update meeting status
// @route   PATCH /api/meetings/:id/status
// @access  Private (Host only)
export const updateMeetingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['scheduled', 'in-progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('host', 'name email profilePicture')
      .populate('participants.user', 'name email profilePicture');

    res.status(200).json({
      success: true,
      message: `Meeting status updated to ${status}`,
      meeting
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get meeting statistics
// @route   GET /api/meetings/stats
// @access  Private
export const getMeetingStats = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await Meeting.aggregate([
      {
        $match: {
          $or: [
            { host: req.user._id },
            { 'participants.user': req.user._id }
          ],
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          totalMeetings: { $sum: 1 },
          scheduledMeetings: {
            $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] }
          },
          completedMeetings: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalDuration: { $sum: '$duration' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats: stats[0] || {
        totalMeetings: 0,
        scheduledMeetings: 0,
        completedMeetings: 0,
        totalDuration: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add this function to your meetingController.js (proper backend version)
export const createUploadMeeting = async (req, res) => {
  try {
    const {
      title,
      description,
      agenda,
      date, // Just date, no time
      emails,
      autoProcessAI // Auto-process AI setting
    } = req.body;

    console.log('📝 CREATE UPLOAD MEETING REQUEST');
    console.log('📋 Request body:', req.body);
    console.log('👤 User ID:', req.user.id);

    // Validate required fields
    if (!title || !agenda || !date || !emails || !Array.isArray(emails) || emails.length === 0) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Title, agenda, date, and at least one participant email are required'
      });
    }

    // Convert emails to user IDs
    let participantObjects = [];
    if (emails && emails.length > 0) {
      console.log('🔍 Looking for users with emails:', emails);
      const users = await User.find({ email: { $in: emails } });
      console.log('✅ Found users:', users.map(u => u.email));

      if (!users || users.length === 0) {
        console.log('❌ No users found for emails:', emails);
        return res.status(404).json({
          success: false,
          message: 'Please provide valid participant emails'
        });
      }
      participantObjects = users.map(u => ({ user: u._id, role: 'participant' }));
    }

    // For upload meetings, both startTime and endTime should be the date
    const startTime = new Date(date);
    const endTime = new Date(date); // Same as startTime - THIS SHOULD WORK!

    console.log('⏰ Meeting times:', {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      areEqual: startTime.getTime() === endTime.getTime()
    });

    // Create the meeting - SIMPLE version
    const meetingData = {
      title,
      description: description || '',
      host: req.user.id,
      meetingType: 'upload',
      startTime,
      endTime,
      agenda,
      participants: participantObjects,
      autoProcessAI: autoProcessAI !== undefined ? autoProcessAI : true // Default to true if not provided
    };

    console.log('📦 Meeting data to create:', meetingData);

    // Try to create meeting directly
    const meeting = await Meeting.create(meetingData);
    console.log('✅ Meeting created, ID:', meeting._id);

    // Add host as participant
    if (!meeting.participants.some(p => p.user.toString() === req.user.id)) {
      meeting.participants.push({
        user: req.user.id,
        role: 'host',
        status: 'accepted'
      });
      await meeting.save();
      console.log('✅ Host added as participant');
    }

    // Populate meeting data
    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate('host', 'name email profilePicture')
      .populate('participants.user', 'name email profilePicture');

    console.log('🎉 Meeting creation COMPLETE:', {
      id: populatedMeeting._id,
      title: populatedMeeting.title,
      createdAt: populatedMeeting.createdAt,
      meetingType: populatedMeeting.meetingType,
      participants: populatedMeeting.participants.length
    });

    res.status(201).json({
      success: true,
      message: 'Upload meeting created successfully',
      meeting: populatedMeeting
    });

  } catch (error) {
    console.error('❌ CREATE UPLOAD MEETING ERROR:', error.message);
    console.error('📝 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    // Check if it's a validation error
    if (error.name === 'ValidationError') {
      console.error('🔍 Validation errors:', error.errors);
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const createRecordingMeeting = async (req, res) => {
  try {
    const { title, description, agenda, emails } = req.body;
    console.log(req.body)
    if (!title || !agenda || !emails || emails.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Title, agenda, date, and at least one participant email are required.",
      });
    }

    // Convert emails to user IDs
    let participantObjects = [];
    if (emails && emails.length > 0) {
      console.log('🔍 Looking for users with emails:', emails);
      const users = await User.find({ email: { $in: emails } }).select("email _id");

      const registeredEmails = users.map(u => u.email.toLowerCase());
      const inputEmails = emails.map(e => e.toLowerCase());
      const invalidEmails = inputEmails.filter(e => !registeredEmails.includes(e));

      if (invalidEmails.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Please provide valid participant emails.",
          invalidEmails
        });
      }
      participantObjects = users.map(u => ({ user: u._id, role: 'participant' }));
    }

    const d = new Date(); // Use current date-time for recording meetings

    const meeting = await Meeting.create({
      title,
      description,
      agenda,
      host: req.user.id,
      meetingType: "recording",
      startTime: d,
      endTime: d,
      participants: participantObjects,
    });

    meeting.addParticipant(req.user.id, "host");
    await meeting.save();

    res.status(201).json({ success: true, meeting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET MEETING WITH AI INSIGHTS ====================

export const getMeetingWithAI = async (req, res) => {
  try {
    const meetingId = req.params.id;

    const meeting = await Meeting.findById(meetingId)
      .populate('host', 'name email profilePicture')
      .populate('participants.user', 'name email profilePicture')
      .populate('minutesOfMeeting.actionItems.assignedTo', 'name email');

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
        message: 'Not authorized to access this meeting'
      });
    }

    // Check AI service health
    const aiHealth = await aiService.healthCheck();
    const aiAvailable = aiHealth.success;

    // Get tasks related to this meeting
    const tasks = await Task.find({ meeting: meetingId })
      .populate('createdBy', 'name email profilePicture')
      .populate('assignedTo.user', 'name email profilePicture')
      .sort({ createdAt: -1 });

    const response = {
      success: true,
      meeting: {
        ...meeting.toObject(),
        joinLink: meeting.joinLink,
        videoMeetingLink: meeting.videoMeetingLink
      },
      ai: {
        available: aiAvailable,
        transcription: meeting.transcription,
        minutes: meeting.minutesOfMeeting,
        status: meeting.transcription?.status || 'not_started',
        canTranscribe: meeting.recordings?.length > 0 && 
          meeting.transcription?.status !== 'processing' &&
          meeting.transcription?.status !== 'completed'
      },
      tasks: tasks,
      isHost: isHost,
      statistics: {
        participantCount: meeting.participants.length,
        recordingCount: meeting.recordings?.length || 0,
        taskCount: tasks.length,
        completedTaskCount: tasks.filter(t => t.status === 'completed').length
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Get meeting with AI error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};