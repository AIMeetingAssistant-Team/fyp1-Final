import mongoose from 'mongoose';

const meetingInviteSchema = new mongoose.Schema({
  meeting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: true
  },
  invitedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: ['participant', 'guest'],
    default: 'participant'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'maybe'],
    default: 'pending'
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  respondedAt: {
    type: Date,
    default: null
  },
  responseNote: {
    type: String,
    maxlength: [200, 'Response note cannot be more than 200 characters']
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderSentAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for better performance
meetingInviteSchema.index({ meeting: 1, invitedUser: 1 });
meetingInviteSchema.index({ token: 1 });
meetingInviteSchema.index({ status: 1 });
meetingInviteSchema.index({ createdAt: 1 });

// Virtual for checking if invite is expired (24 hours)
meetingInviteSchema.virtual('isExpired').get(function() {
  const twentyFourHours = 24 * 60 * 60 * 1000;
  return Date.now() - this.createdAt > twentyFourHours;
});

// Method to generate response URL
meetingInviteSchema.methods.generateResponseUrl = function(action) {
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  return `${baseUrl}/meeting-invite/${this.token}?action=${action}`;
};

// Static method to find pending invites for a meeting
meetingInviteSchema.statics.findPendingByMeeting = function(meetingId) {
  return this.find({ 
    meeting: meetingId, 
    status: 'pending' 
  }).populate('invitedUser', 'name email profilePicture');
};

// Static method to find by token
meetingInviteSchema.statics.findByToken = function(token) {
  return this.findOne({ token })
    .populate('meeting', 'title startTime endTime description host')
    .populate('invitedUser', 'name email profilePicture');
};

export default mongoose.model('MeetingInvite', meetingInviteSchema);