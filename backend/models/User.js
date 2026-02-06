import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import validator from 'validator';

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  
  // Enhanced Profile Fields
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters'],
    default: ''
  },
  phone: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || validator.isMobilePhone(v, 'any', { strictMode: false });
      },
      message: 'Please provide a valid phone number'
    },
    default: ''
  },
  jobTitle: {
    type: String,
    maxlength: [100, 'Job title cannot be more than 100 characters'],
    default: ''
  },
  organization: {
    type: String,
    maxlength: [100, 'Organization cannot be more than 100 characters'],
    default: ''
  },
  department: {
    type: String,
    maxlength: [100, 'Department cannot be more than 100 characters'],
    default: ''
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  
  // Profile Media
  profilePicture: {
    url: {
      type: String,
      default: null
    },
    publicId: {
      type: String,
      default: null
    },
    uploadedAt: {
      type: Date,
      default: null
    }
  },
  
  // Account Settings
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  emailNotifications: {
    type: Boolean,
    default: true
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },

  // Security Fields
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerifyToken: String,
  emailVerifyExpire: Date,
  lastPasswordChange: {
    type: Date,
    default: Date.now
  },
  
  // Timestamps
  lastLogin: {
    type: Date,
    default: null
  },
  deactivatedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  // Update lastPasswordChange when password is modified
  if (this.isModified('password')) {
    this.lastPasswordChange = Date.now();
  }
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update last login method
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Method to create password reset token
userSchema.methods.createPasswordResetToken = function() {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 10 minutes
  return resetToken;
};

// Method to deactivate account
userSchema.methods.deactivateAccount = function() {
  this.isActive = false;
  this.deactivatedAt = new Date();
  return this.save();
};

// Method to reactivate account
userSchema.methods.reactivateAccount = function() {
  this.isActive = true;
  this.deactivatedAt = null;
  return this.save();
};

// Method to update profile picture
userSchema.methods.updateProfilePicture = function(imageData) {
  this.profilePicture = {
    url: imageData.url,
    publicId: imageData.publicId,
    uploadedAt: new Date()
  };
  return this.save();
};

// Method to remove profile picture
userSchema.methods.removeProfilePicture = function() {
  this.profilePicture = {
    url: null,
    publicId: null,
    uploadedAt: null
  };
  return this.save();
};

// ==================== TASK-RELATED VIRTUAL PROPERTIES ====================

// Virtual for total tasks created by user
userSchema.virtual('createdTasksCount').get(async function() {
  const Task = mongoose.model('Task');
  return await Task.countDocuments({ createdBy: this._id });
});

// Virtual for total tasks assigned to user
userSchema.virtual('assignedTasksCount').get(async function() {
  const Task = mongoose.model('Task');
  return await Task.countDocuments({ 'assignedTo.user': this._id });
});

// Virtual for completed tasks count
userSchema.virtual('completedTasksCount').get(async function() {
  const Task = mongoose.model('Task');
  return await Task.countDocuments({ 
    'assignedTo.user': this._id,
    status: 'completed'
  });
});

// Virtual for overdue tasks count
userSchema.virtual('overdueTasksCount').get(async function() {
  const Task = mongoose.model('Task');
  return await Task.countDocuments({ 
    'assignedTo.user': this._id,
    dueDate: { $lt: new Date() },
    status: { $in: ['pending', 'in-progress'] }
  });
});

// Virtual for task completion rate
userSchema.virtual('taskCompletionRate').get(async function() {
  const Task = mongoose.model('Task');
  const totalAssigned = await Task.countDocuments({ 'assignedTo.user': this._id });
  const completed = await Task.countDocuments({ 
    'assignedTo.user': this._id,
    status: 'completed'
  });
  
  if (totalAssigned === 0) return 0;
  return Math.round((completed / totalAssigned) * 100);
});

// ==================== TASK-RELATED METHODS ====================

// Method to get user's task statistics
userSchema.methods.getTaskStatistics = async function() {
  const Task = mongoose.model('Task');
  
  const stats = await Task.aggregate([
    {
      $match: {
        'assignedTo.user': this._id
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalEstimatedHours: { $sum: { $ifNull: ['$estimatedHours', 0] } },
        totalActualHours: { $sum: { $ifNull: ['$actualHours', 0] } }
      }
    }
  ]);

  // Get priority distribution
  const priorityStats = await Task.aggregate([
    {
      $match: {
        'assignedTo.user': this._id
      }
    },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get overdue tasks
  const overdueCount = await Task.countDocuments({
    'assignedTo.user': this._id,
    dueDate: { $lt: new Date() },
    status: { $in: ['pending', 'in-progress'] }
  });

  // Format the results
  const result = {
    totalAssigned: 0,
    totalCreated: await Task.countDocuments({ createdBy: this._id }),
    statusBreakdown: {
      pending: 0,
      'in-progress': 0,
      completed: 0,
      cancelled: 0,
      'on-hold': 0
    },
    priorityBreakdown: {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0
    },
    timeMetrics: {
      totalEstimatedHours: 0,
      totalActualHours: 0,
      efficiency: 0
    },
    overdue: overdueCount,
    completionRate: 0
  };

  // Process status breakdown
  stats.forEach(stat => {
    result.totalAssigned += stat.count;
    result.statusBreakdown[stat._id] = stat.count;
    result.timeMetrics.totalEstimatedHours += stat.totalEstimatedHours;
    result.timeMetrics.totalActualHours += stat.totalActualHours;
  });

  // Process priority breakdown
  priorityStats.forEach(stat => {
    result.priorityBreakdown[stat._id] = stat.count;
  });

  // Calculate completion rate
  if (result.totalAssigned > 0) {
    result.completionRate = Math.round(
      (result.statusBreakdown.completed / result.totalAssigned) * 100
    );
  }

  // Calculate efficiency (if we have both estimated and actual hours)
  if (result.timeMetrics.totalEstimatedHours > 0 && result.timeMetrics.totalActualHours > 0) {
    result.timeMetrics.efficiency = Math.round(
      (result.timeMetrics.totalEstimatedHours / result.timeMetrics.totalActualHours) * 100
    );
  }

  return result;
};

// Method to get user's recent tasks
userSchema.methods.getRecentTasks = function(limit = 10) {
  const Task = mongoose.model('Task');
  return Task.find({
    $or: [
      { createdBy: this._id },
      { 'assignedTo.user': this._id }
    ]
  })
  .populate('meeting', 'title startTime')
  .populate('createdBy', 'name email profilePicture')
  .populate('assignedTo.user', 'name email profilePicture')
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Method to get user's upcoming deadlines
userSchema.methods.getUpcomingDeadlines = function(days = 7) {
  const Task = mongoose.model('Task');
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  
  return Task.find({
    'assignedTo.user': this._id,
    dueDate: { $gte: startDate, $lte: endDate },
    status: { $in: ['pending', 'in-progress'] }
  })
  .populate('meeting', 'title')
  .populate('createdBy', 'name email profilePicture')
  .sort({ dueDate: 1 })
  .limit(20);
};

// Method to get user's task performance by month
userSchema.methods.getMonthlyTaskPerformance = async function(months = 6) {
  const Task = mongoose.model('Task');
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  const monthlyStats = await Task.aggregate([
    {
      $match: {
        'assignedTo.user': this._id,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalEstimatedHours: { $sum: { $ifNull: ['$estimatedHours', 0] } },
        totalActualHours: { $sum: { $ifNull: ['$actualHours', 0] } }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);

  // Format the results for easier consumption
  return monthlyStats.map(stat => ({
    period: `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}`,
    totalTasks: stat.totalTasks,
    completedTasks: stat.completedTasks,
    completionRate: Math.round((stat.completedTasks / stat.totalTasks) * 100),
    totalEstimatedHours: stat.totalEstimatedHours,
    totalActualHours: stat.totalActualHours,
    efficiency: stat.totalActualHours > 0 ? 
      Math.round((stat.totalEstimatedHours / stat.totalActualHours) * 100) : 0
  }));
};

// ==================== TASK-RELATED STATIC METHODS ====================

// Static method to get top performers (users with highest completion rates)
userSchema.statics.getTopPerformers = async function(limit = 10) {
  const Task = mongoose.model('Task');
  
  const performers = await Task.aggregate([
    { $unwind: '$assignedTo' },
    {
      $group: {
        _id: '$assignedTo.user',
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        }
      }
    },
    {
      $match: {
        totalTasks: { $gte: 5 } // Only consider users with at least 5 tasks
      }
    },
    {
      $project: {
        userId: '$_id',
        totalTasks: 1,
        completedTasks: 1,
        completionRate: {
          $multiply: [
            { $divide: ['$completedTasks', '$totalTasks'] },
            100
          ]
        }
      }
    },
    { $sort: { completionRate: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        userId: 1,
        userName: '$user.name',
        userEmail: '$user.email',
        userProfilePicture: '$user.profilePicture',
        totalTasks: 1,
        completedTasks: 1,
        completionRate: { $round: ['$completionRate', 2] }
      }
    }
  ]);

  return performers;
};

// ==================== EXISTING VIRTUAL PROPERTIES ====================

// Virtual for formatted profile
userSchema.virtual('profile').get(function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    bio: this.bio,
    phone: this.phone,
    organization: this.organization,
    jobTitle: this.jobTitle,
    department: this.department,
    timezone: this.timezone,
    profilePicture: this.profilePicture.url,
    role: this.role,
    isVerified: this.isVerified,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt
  };
});

// ==================== INDEXES ====================

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ resetPasswordToken: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ 'profilePicture.publicId': 1 });

export default mongoose.model('User', userSchema);