import mongoose from 'mongoose';
import mongooseSequence from 'mongoose-sequence';
const AutoIncrement = mongooseSequence(mongoose);

const participantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['host', 'participant', 'guest'],
    default: 'participant'
  },
  status: {
    type: String,
    enum: ['invited', 'accepted', 'declined', 'attended', 'absent'],
    default: 'invited'
  },
  joinedAt: {
    type: Date,
    default: null
  },
  leftAt: {
    type: Date,
    default: null
  }
});

const meetingSchema = new mongoose.Schema({
  meetingId: {
    type: Number,
    unique: true
  },
  title: {
    type: String,
    required: [true, 'Meeting title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  meetingType: {
    type: String,
    enum: ['live', 'recording', 'upload'],
    default: 'live'
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required'],
    validate: {
      validator: function (value) {
        const now = new Date();
        const meetingType = this?.meetingType;
        const status = this?.status;

        if (meetingType === 'live' && status === 'in-progress') {
          const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
          return value >= fiveMinutesAgo;
        }

        if (meetingType === 'upload' || meetingType === 'recording') {
          return true;
        }

        if (meetingType === 'live' && status === 'scheduled') {
          return value > now;
        }

        return true;
      },
      message: 'Start time is invalid for this meeting type and status',
    }
  },
  endTime: {
    type: Date,
    required: [true, 'End time is required'],
    validate: {
      validator: function (value) {
        if (this?.meetingType === 'upload') {
          return value >= this.startTime;
        }
        if (this?.meetingType === 'recording') {
          return true;
        }
        return value > this.startTime;
      },
      message: 'End time must be after start time'
    }
  },
  duration: {
    type: Number, // in minutes
    default: 60
  },
  participants: [participantSchema],
  maxParticipants: {
    type: Number,
    default: 50,
    min: [1, 'Maximum participants must be at least 1'],
    max: [1000, 'Maximum participants cannot exceed 1000']
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  meetingLink: {
    type: String,
    default: null
  },
  recordingUrl: {
    type: String,
    default: null
  },
  agenda: {
    type: String,
    trim: true,
    maxlength: [2000, 'Agenda cannot be more than 2000 characters']
  },
  tags: [{
    type: String,
    trim: true
  }],
  timezone: {
    type: String,
    default: 'UTC'
  },
  
  // Auto-process AI settings
  autoProcessAI: {
    type: Boolean,
    default: true // Default to true for backward compatibility
  },

  // Enhanced Invite System Fields
  inviteStatus: {
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: {
      type: Date,
      default: null
    },
    reminderSent: {
      type: Boolean,
      default: false
    },
    reminderSentAt: {
      type: Date,
      default: null
    }
  },
  customMessage: {
    type: String,
    maxlength: [500, 'Custom message cannot be more than 500 characters'],
    default: ''
  },

  // AI Transcription & Summary
  transcription: {
    text: String,
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    processedAt: Date,
    language: String,
    confidence: Number,
    segments: [mongoose.Schema.Types.Mixed]
  },

  minutesOfMeeting: {
    summary: String,
    keyPoints: [String],
    decisions: [String],
    actionItems: [{
      text: String,
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      deadline: Date,
      status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed'],
        default: 'pending'
      }
    }],
    generatedAt: Date,
    version: {
      type: Number,
      default: 1
    }
  },

  aiInsights: {
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative', 'mixed']
    },
    topics: [String],
    participantsEngagement: {
      type: Map,
      of: Number // userId -> speaking time in seconds
    },
    talkTimeDistribution: {
      hostPercentage: Number,
      participantsPercentage: Number
    }
  },

  sharedDocuments: [{
    name: String,
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    size: Number,
    type: String
  }],

  // ==================== RECORDING FIELDS ====================
  recordings: [{
    url: String,
    publicId: String,
    fileName: String,
    fileType: String,
    fileSize: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permissions: {
      canDownload: {
        type: Boolean,
        default: true
      },
      canDelete: {
        type: Boolean,
        default: false
      }
    },
    transcriptionStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    transcriptionResult: {
      text: String,
      segments: [Object],
      language: String,
      confidence: Number
    },
    minutesResult: {
      summary: String,
      keyPoints: [String],
      decisions: [String],
      actionItems: [{
        text: String,
        assignedTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        deadline: Date,
        status: {
          type: String,
          enum: ['pending', 'in-progress', 'completed'],
          default: 'pending'
        }
      }],
      generatedAt: Date
    },
    aiInsights: {
      sentiment: {
        type: String,
        enum: ['positive', 'neutral', 'negative', 'mixed']
      },
      topics: [String],
      participantsEngagement: {
        type: Map,
        of: Number
      },
      talkTimeDistribution: {
        hostPercentage: Number,
        participantsPercentage: Number
      }
    }
  }],

  recordingParticipants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    canDownload: {
      type: Boolean,
      default: true
    },
    canDelete: {
      type: Boolean,
      default: false
    },
    viewedAt: Date
  }],

  meetingCode: {
    type: String,
    unique: true,
    sparse: true
  },
  videoRoomId: {
    type: String,
    default: null
  },
  videoStartedAt: Date,
  videoEndedAt: Date,
  actualDuration: Number,

  liveKit: {
    roomName: String,
    lastJoinedAt: Date,
    recordingActive: { type: Boolean, default: false },
    recordingStartedAt: Date,
    recordingEndedAt: Date,    
  },
}, {
  timestamps: true
});

// Auto-increment meeting ID
meetingSchema.plugin(AutoIncrement, { inc_field: 'meetingId' });

// Indexes for better performance
meetingSchema.index({ host: 1, startTime: 1 });
meetingSchema.index({ 'participants.user': 1 });
meetingSchema.index({ startTime: 1, endTime: 1 });
meetingSchema.index({ status: 1 });
meetingSchema.index({ 'inviteStatus.sent': 1 });
meetingSchema.index({ 'inviteStatus.reminderSent': 1 });

// ==================== AUTO-LINKS FEATURE ====================

meetingSchema.pre('save', function (next) {
  if (this.isNew) {
    if (!this.videoRoomId) {
      this.videoRoomId = `room_${this._id}_${Date.now()}`;
    }
  }

  if (this.startTime && this.endTime) {
    this.duration = Math.round((this.endTime - this.startTime) / (1000 * 60));
  }

  next();
});

// Virtual properties UPDATE KARO
meetingSchema.virtual('joinLink').get(function () {
  if (this.meetingType !== 'live') return null;
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  return `${baseUrl}/join-meeting/${this._id}`;
});

meetingSchema.virtual('videoMeetingLink').get(function () {
  if (this.meetingType !== 'live') return null;
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  return `${baseUrl}/video-meeting/${this._id}`;
});

// Virtual for checking if meeting is active
meetingSchema.virtual('isActive').get(function () {
  const now = new Date();
  return this.startTime <= now && this.endTime >= now && this.status === 'in-progress';
});

// Virtual for checking if meeting is upcoming
meetingSchema.virtual('isUpcoming').get(function () {
  const now = new Date();
  return this.startTime > now && this.status === 'scheduled';
});

// Virtual for checking if meeting can send reminders
meetingSchema.virtual('canSendReminders').get(function () {
  const now = new Date();
  const oneHourBefore = new Date(this.startTime.getTime() - (60 * 60 * 1000));
  return this.status === 'scheduled' && now < oneHourBefore;
});

// Virtual for participant count
meetingSchema.virtual('participantCount').get(function () {
  return this.participants.length;
});

// Virtual for accepted participant count
meetingSchema.virtual('acceptedParticipantCount').get(function () {
  return this.participants.filter(p => p.status === 'accepted').length;
});

// ==================== TASK-RELATED VIRTUAL PROPERTIES ====================

// Virtual for task count
meetingSchema.virtual('taskCount').get(async function () {
  const Task = mongoose.model('Task');
  return await Task.countDocuments({ meeting: this._id });
});

// ==================== TASK-RELATED METHODS ====================

// Method to get meeting tasks
meetingSchema.methods.getTasks = function () {
  const Task = mongoose.model('Task');
  return Task.find({ meeting: this._id })
    .populate('createdBy', 'name email profilePicture')
    .populate('assignedTo.user', 'name email profilePicture')
    .sort({ createdAt: -1 });
};

// Method to get task statistics for meeting
meetingSchema.methods.getTaskStatistics = async function () {
  const Task = mongoose.model('Task');
  const stats = await Task.aggregate([
    { $match: { meeting: this._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalHours: { $sum: { $ifNull: ['$estimatedHours', 0] } }
      }
    }
  ]);

  const result = {
    total: 0,
    pending: 0,
    'in-progress': 0,
    completed: 0,
    cancelled: 0,
    'on-hold': 0,
    totalEstimatedHours: 0
  };

  stats.forEach(stat => {
    result.total += stat.count;
    result.totalEstimatedHours += stat.totalHours;
    result[stat._id] = stat.count;
  });

  return result;
};

// ==================== EXISTING MEETING METHODS ====================

// Pre-save middleware to calculate duration
meetingSchema.pre('save', function (next) {
  if (this.startTime && this.endTime) {
    this.duration = Math.round((this.endTime - this.startTime) / (1000 * 60));
  }
  next();
});

// Method to check if user is participant
meetingSchema.methods.isParticipant = function (userId) {
  return this.participants.some(participant =>
    participant.user.toString() === userId.toString()
  );
};

// Method to check if user is host
meetingSchema.methods.isHost = function (userId) {
  return this.host.toString() === userId.toString();
};

// Method to add participant
meetingSchema.methods.addParticipant = function (userId, role = 'participant') {
  if (!this.isParticipant(userId)) {
    this.participants.push({
      user: userId,
      role: role,
      status: 'invited'
    });
  }
  return this;
};

// Method to remove participant
meetingSchema.methods.removeParticipant = function (userId) {
  this.participants = this.participants.filter(
    participant => participant.user.toString() !== userId.toString()
  );
  return this;
};

// Method to update participant status
meetingSchema.methods.updateParticipantStatus = function (userId, status) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  if (participant) {
    participant.status = status;
    if (status === 'accepted') {
      participant.joinedAt = new Date();
    }
  }
  return this;
};

// Method to mark invites as sent
meetingSchema.methods.markInvitesSent = function () {
  this.inviteStatus.sent = true;
  this.inviteStatus.sentAt = new Date();
  return this;
};

// Method to mark reminders as sent
meetingSchema.methods.markRemindersSent = function () {
  this.inviteStatus.reminderSent = true;
  this.inviteStatus.reminderSentAt = new Date();
  return this;
};

// Static method to find meetings by date range
meetingSchema.statics.findByDateRange = function (startDate, endDate, userId = null) {
  let query = {
    startTime: { $gte: startDate },
    endTime: { $lte: endDate }
  };

  if (userId) {
    query.$or = [
      { host: userId },
      { 'participants.user': userId }
    ];
  }

  return this.find(query)
    .populate('host', 'name email profilePicture')
    .populate('participants.user', 'name email profilePicture');
};

// Static method to find meetings needing reminders
meetingSchema.statics.findMeetingsNeedingReminders = function () {
  const oneHourFromNow = new Date(Date.now() + (60 * 60 * 1000));
  const now = new Date();

  return this.find({
    status: 'scheduled',
    startTime: { $lte: oneHourFromNow, $gt: now },
    'inviteStatus.sent': true,
    'inviteStatus.reminderSent': false
  }).populate('host', 'name email');
};


// ==================== RECORDING METHODS ====================

// Method to add a recording
meetingSchema.methods.addRecording = function (recordingData) {
  if (!this.recordings) {
    this.recordings = [];
  }
  this.recordings.push(recordingData);
  return this;
};

// Method to get recordings sorted by date
meetingSchema.methods.getRecordings = function () {
  if (!this.recordings || this.recordings.length === 0) {
    return [];
  }
  return this.recordings.sort((a, b) =>
    new Date(b.uploadedAt) - new Date(a.uploadedAt)
  );
};

// Method to get a specific recording by index
meetingSchema.methods.getRecording = function (index) {
  if (!this.recordings || index >= this.recordings.length) {
    return null;
  }
  return this.recordings[index];
};

// Method to check if user can download recording
meetingSchema.methods.canDownloadRecording = function (userId, recordingIndex) {
  if (this.host.toString() === userId.toString()) return true;

  if (!this.recordings || recordingIndex >= this.recordings.length) {
    return false;
  }

  const recording = this.recordings[recordingIndex];
  if (recording.uploadedBy.toString() === userId.toString()) return true;

  const participant = this.participants.find(p =>
    p.user.toString() === userId.toString()
  );
  return !!participant;
};

// Method to check if user can delete recording
meetingSchema.methods.canDeleteRecording = function (userId, recordingIndex) {
  if (this.host.toString() === userId.toString()) return true;

  if (!this.recordings || recordingIndex >= this.recordings.length) {
    return false;
  }

  const recording = this.recordings[recordingIndex];
  return recording.uploadedBy.toString() === userId.toString() &&
    recording.permissions.canDelete === true;
};

// Method to start transcription
meetingSchema.methods.startTranscription = async function (recordingIndex = 0) {
  if (!this.recordings || this.recordings.length === 0) {
    throw new Error('No recordings available for transcription');
  }

  const recording = this.recordings[recordingIndex];
  if (!recording) {
    throw new Error('Recording not found');
  }

  // Initialize transcription object if it doesn't exist
  if (!this.transcription) {
    this.transcription = {
      status: 'pending'
    };
  }

  this.transcription.status = 'processing';
  recording.transcriptionStatus = 'processing';
  await this.save();

  return this;
};

// Method to complete transcription
meetingSchema.methods.completeTranscription = async function (transcriptionData, recordingIndex = 0) {
  try {
    console.log(`💾 [completeTranscription] Starting save for meeting ${this._id}`);
    console.log(`💾 [completeTranscription] Transcription data:`, {
      hasText: !!transcriptionData.text,
      textLength: transcriptionData.text?.length || 0,
      hasSegments: !!transcriptionData.segments,
      language: transcriptionData.language,
      confidence: transcriptionData.confidence
    });

    // Ensure segments are plain objects without _id fields
    const cleanSegments = (transcriptionData.segments || []).map(segment => {
      if (typeof segment === 'object' && segment !== null) {
        const { start, end, text, speaker } = segment;
        return { start, end, text: text || '', speaker: speaker || '' };
      }
      return segment;
    });

    this.transcription = {
      text: transcriptionData.text || '',
      segments: cleanSegments,
      language: transcriptionData.language || 'en',
      confidence: transcriptionData.confidence || 0.9,
      status: 'completed',
      processedAt: new Date()
    };

    if (this.recordings && this.recordings[recordingIndex]) {
      this.recordings[recordingIndex].transcriptionStatus = 'completed';
      this.recordings[recordingIndex].transcriptionResult = {
        text: transcriptionData.text || '',
        segments: cleanSegments,
        language: transcriptionData.language || 'en',
        confidence: transcriptionData.confidence || 0.9
      };
    }

    await this.save();
    console.log(`✅ [completeTranscription] Successfully saved transcription for meeting ${this._id}`);
    return this;
  } catch (error) {
    console.error(`❌ [completeTranscription] Error saving transcription:`, error);
    console.error(`❌ [completeTranscription] Error details:`, {
      message: error.message,
      name: error.name,
      errors: error.errors,
      code: error.code
    });
    throw error;
  }
};

// Method to generate minutes from transcription
meetingSchema.methods.generateMinutes = async function (minutesData) {
  this.minutesOfMeeting = {
    summary: minutesData.summary,
    keyPoints: minutesData.keyPoints || [],
    decisions: minutesData.decisions || [],
    actionItems: minutesData.actionItems || [],
    generatedAt: new Date(),
    version: (this.minutesOfMeeting?.version || 0) + 1
  };

  await this.save();
  return this;
};

// Method to extract and create tasks from action items
meetingSchema.methods.createTasksFromActionItems = async function (createdBy) {
  const Task = mongoose.model('Task');
  const createdTasks = [];

  if (!this.minutesOfMeeting?.actionItems) {
    return createdTasks;
  }

  for (const actionItem of this.minutesOfMeeting.actionItems) {
    if (actionItem.text && actionItem.assignedTo) {
      const task = await Task.create({
        title: actionItem.text.substring(0, 100),
        description: actionItem.text,
        meeting: this._id,
        createdBy: createdBy,
        assignedTo: [{
          user: actionItem.assignedTo,
          assignedBy: createdBy
        }],
        priority: 'medium',
        dueDate: actionItem.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: 7 days
        status: 'pending'
      });

      createdTasks.push(task);
      console.log(`✅ Created task from action item: ${actionItem.text}`);
    }
  }

  return createdTasks;
};

// ==================== INSTANT MEETING METHODS ====================

// Method to create instant meeting
meetingSchema.statics.createInstantMeeting = async function(userId, title = "Instant Meeting") {
  const user = await mongoose.model('User').findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

  const meetingData = {
    title,
    description: "Instant meeting created on demand",
    host: userId,
    meetingType: "live",
    status: "in-progress", // This is key - mark as in-progress immediately
    startTime: now,
    endTime: inOneHour,
    duration: 60,
    participants: [{
      user: userId,
      role: "host",
      status: "accepted"
    }],
    isPrivate: false
  };

  const meeting = new this(meetingData);
  
  // Generate unique meeting code for sharing
  await meeting.generateMeetingCode();
  
  await meeting.save();
  return meeting;
};

// Generate unique meeting code (like Google Meet's abc-defg-hij)
meetingSchema.methods.generateMeetingCode = async function() {
  if (!this.meetingCode) {
    // Generate 10-character alphanumeric code
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 10; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Format like abc-defg-hij
    this.meetingCode = `${code.substring(0, 3)}-${code.substring(3, 7)}-${code.substring(7, 10)}`;
    
    // Ensure uniqueness
    const existing = await this.constructor.findOne({ meetingCode: this.meetingCode });
    if (existing) {
      return this.generateMeetingCode(); // Retry if duplicate
    }
  }
  return this.meetingCode;
};

// Method to join meeting by code
meetingSchema.statics.joinByCode = async function(code, userId) {
  const meeting = await this.findOne({ meetingCode: code })
    .populate('host', 'name email profilePicture');
  
  if (!meeting) {
    throw new Error('Meeting not found');
  }

  if (meeting.status === 'cancelled') {
    throw new Error('This meeting has been cancelled');
  }

  if (meeting.status === 'completed') {
    throw new Error('This meeting has already ended');
  }

  // Check if user is already a participant
  const isParticipant = meeting.participants.some(
    p => p.user.toString() === userId.toString()
  );

  if (!isParticipant) {
    // Add user as participant
    const user = await mongoose.model('User').findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    meeting.participants.push({
      user: userId,
      role: "participant",
      status: "accepted"
    });
    await meeting.save();
  }

  return meeting;
};

// Method to get meeting shareable link
meetingSchema.methods.getShareableLink = function() {
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  return `${baseUrl}/join/${this.meetingCode}`;
};

// Method to get meeting info for sharing
meetingSchema.methods.getShareInfo = function() {
  return {
    meetingCode: this.meetingCode,
    shareableLink: this.getShareableLink(),
    title: this.title,
    host: this.host,
    status: this.status,
    participantCount: this.participants.length,
    isActive: this.status === 'in-progress' || this.status === 'scheduled'
  };
};

export default mongoose.model('Meeting', meetingSchema);