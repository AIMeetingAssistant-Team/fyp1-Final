import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Document name is required'],
    trim: true
  },
  originalName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  url: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: true
  },
  format: {
    type: String,
    required: true
  },
  size: {
    type: Number, // in bytes
    required: true
  },
  category: {
    type: String,
    enum: ['image', 'document', 'audio', 'video', 'other'],
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  meeting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  permissions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    canView: {
      type: Boolean,
      default: true
    },
    canDownload: {
      type: Boolean,
      default: true
    },
    canEdit: {
      type: Boolean,
      default: false
    }
  }],
  downloadCount: {
    type: Number,
    default: 0
  },
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    url: String,
    publicId: String,
    version: Number,
    uploadedAt: Date
  }]
}, {
  timestamps: true
});

// Index for better performance
documentSchema.index({ meeting: 1, uploadedBy: 1 });
documentSchema.index({ category: 1 });
documentSchema.index({ createdAt: -1 });

// Virtual for formatted file size
documentSchema.virtual('formattedSize').get(function() {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (this.size === 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(this.size) / Math.log(1024)));
  return Math.round(this.size / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Virtual for file icon based on category and format
documentSchema.virtual('icon').get(function() {
  const icons = {
    image: '🖼️',
    video: '🎥',
    audio: '🎵',
    document: '📄',
    pdf: '📕',
    word: '📘',
    powerpoint: '📊',
    excel: '📈',
    text: '📝',
    other: '📎'
  };

  if (this.category === 'document') {
    if (this.format === 'pdf') return icons.pdf;
    if (['doc', 'docx'].includes(this.format)) return icons.word;
    if (['ppt', 'pptx'].includes(this.format)) return icons.powerpoint;
    if (['xls', 'xlsx'].includes(this.format)) return icons.excel;
    if (this.format === 'txt') return icons.text;
  }

  return icons[this.category] || icons.other;
});

// Method to check if user has permission
documentSchema.methods.hasPermission = function(userId, action = 'view') {
  // Uploader has all permissions
  if (this.uploadedBy.toString() === userId.toString()) {
    return true;
  }

  // Check specific permissions
  const userPermission = this.permissions.find(
    perm => perm.user.toString() === userId.toString()
  );

  if (!userPermission) {
    return this.isPublic && action === 'view';
  }

  switch (action) {
    case 'view':
      return userPermission.canView;
    case 'download':
      return userPermission.canDownload;
    case 'edit':
      return userPermission.canEdit;
    default:
      return false;
  }
};

// Method to increment download count
documentSchema.methods.incrementDownloadCount = function() {
  this.downloadCount += 1;
  return this.save();
};

// Static method to find documents by meeting with permissions
documentSchema.statics.findByMeeting = function(meetingId, userId) {
  return this.find({
    meeting: meetingId,
    $or: [
      { uploadedBy: userId },
      { isPublic: true },
      { 'permissions.user': userId }
    ]
  }).populate('uploadedBy', 'name email profilePicture');
};

export default mongoose.model('Document', documentSchema);