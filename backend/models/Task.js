import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters'],
    default: ''
  },
  meeting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled', 'on-hold'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: {
    type: Date,
    // REPLACE with this (allows today, blocks past days)
    validate: {
      validator: function (value) {
        if (!value) return true;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(value) >= today;
      },
      message: 'Due date cannot be in the past'
    }
  },
  estimatedHours: {
    type: Number,
    min: [0, 'Estimated hours cannot be negative'],
    max: [1000, 'Estimated hours cannot exceed 1000']
  },
  actualHours: {
    type: Number,
    min: [0, 'Actual hours cannot be negative'],
    default: 0
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot be more than 50 characters']
  }],
  attachments: [{
    name: String,
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: [500, 'Comment cannot be more than 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  completionDate: {
    type: Date,
    default: null
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly', null],
    default: null
  },
  nextRecurrence: {
    type: Date,
    default: null
  },
  parentTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  subtasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }]
}, {
  timestamps: true
});

// Indexes for better performance
taskSchema.index({ meeting: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ priority: 1, status: 1 });
taskSchema.index({ 'assignedTo.user': 1 });

// Virtual for checking if task is overdue
taskSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate || this.status === 'completed') return false;
  return new Date() > this.dueDate;
});

// Virtual for days until due
taskSchema.virtual('daysUntilDue').get(function () {
  if (!this.dueDate) return null;
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for progress percentage (for subtasks)
taskSchema.virtual('progress').get(function () {
  if (this.subtasks.length === 0) {
    return this.status === 'completed' ? 100 : 0;
  }

  const completedSubtasks = this.subtasks.filter(subtask =>
    subtask.status === 'completed'
  ).length;

  return Math.round((completedSubtasks / this.subtasks.length) * 100);
});

// Virtual for assigned users count
taskSchema.virtual('assignedUsersCount').get(function () {
  return this.assignedTo.length;
});

// Method to assign user to task
taskSchema.methods.assignUser = function (userId, assignedBy) {
  const isAlreadyAssigned = this.assignedTo.some(
    assignment => assignment.user.toString() === userId.toString()
  );

  if (!isAlreadyAssigned) {
    this.assignedTo.push({
      user: userId,
      assignedBy: assignedBy || this.createdBy
    });
  }
  return this;
};

// Method to remove user assignment
taskSchema.methods.removeAssignment = function (userId) {
  this.assignedTo = this.assignedTo.filter(
    assignment => assignment.user.toString() !== userId.toString()
  );
  return this;
};

// Method to update task status
taskSchema.methods.updateStatus = function (newStatus) {
  this.status = newStatus;

  if (newStatus === 'completed') {
    this.completionDate = new Date();
    this.actualHours = this.actualHours || this.estimatedHours || 0;
  } else if (newStatus !== 'completed' && this.completionDate) {
    this.completionDate = null;
  }

  return this;
};

// Method to add comment
taskSchema.methods.addComment = function (userId, text) {
  this.comments.push({
    user: userId,
    text: text
  });
  return this;
};

// Static method to find overdue tasks
taskSchema.statics.findOverdueTasks = function () {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $in: ['pending', 'in-progress'] }
  }).populate('assignedTo.user', 'name email profilePicture');
};

// Static method to find tasks by user
taskSchema.statics.findByUser = function (userId, options = {}) {
  const query = {
    $or: [
      { createdBy: userId },
      { 'assignedTo.user': userId }
    ]
  };

  if (options.status) {
    query.status = options.status;
  }

  if (options.priority) {
    query.priority = options.priority;
  }

  return this.find(query)
    .populate('meeting', 'title startTime')
    .populate('createdBy', 'name email profilePicture')
    .populate('assignedTo.user', 'name email profilePicture')
    .sort(options.sort || { dueDate: 1, priority: -1 });
};

// Pre-save middleware to handle recurring tasks
taskSchema.pre('save', function (next) {
  if (this.isRecurring && this.status === 'completed' && this.recurrencePattern) {
    const now = new Date();
    let nextDate = new Date(this.dueDate || now);

    switch (this.recurrencePattern) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    this.nextRecurrence = nextDate;
  }
  next();
});

export default mongoose.model('Task', taskSchema);