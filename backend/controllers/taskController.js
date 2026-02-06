import Task from '../models/Task.js';
import Meeting from '../models/Meeting.js';
import User from '../models/User.js';
import mongoose from 'mongoose';


// -------------------------------------------------------------------
// HELPER: SEND TASK ASSIGNMENT EMAIL
// -------------------------------------------------------------------
import { sendEmail } from '../utils/emailService.js';

const sendTaskAssignmentEmail = async (task, assignedUser, assignedBy) => {
  try {
    // Get assigned user details
    const user = await User.findById(assignedUser);
    const assigner = await User.findById(assignedBy);

    if (!user || !user.email) {
      console.log(`No email found for user ${assignedUser}`);
      return;
    }

    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const taskUrl = `${frontendUrl}/tasks`;
    const meeting = await Meeting.findById(task.meeting);

    const formatDate = (date) => {
      if (!date) return 'Not specified';
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: white; border-radius: 8px; padding: 40px 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 35px;">
          <h1 style="color: #000000; margin: 0; font-size: 28px; font-weight: 700;">Welcome to AI Meeting Assistant!</h1>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 16px;">New Task Assigned</p>
        </div>

        <!-- Welcome Message -->
        <div style="text-align: center; margin-bottom: 30px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hello <strong>${user.name || 'User'}</strong>,<br>
            You have been assigned a new task. Please review the details below.
          </p>
        </div>

        <!-- Task Details Card -->
        <div style="background: #f8fafc; border-radius: 8px; padding: 25px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">${task.title}</h2>
          
          <div style="display: grid; gap: 12px;">
            <div style="display: flex; align-items: center;">
              <span style="color: #6b7280; min-width: 120px; font-size: 14px;">Meeting:</span>
              <span style="color: #374151; font-weight: 500;">${meeting?.title || 'Not specified'}</span>
            </div>
            
            ${task.description ? `
            <div style="display: flex; align-items: flex-start;">
              <span style="color: #6b7280; min-width: 120px; font-size: 14px;">Description:</span>
              <span style="color: #374151;">${task.description}</span>
            </div>
            ` : ''}
            
            <div style="display: flex; align-items: center;">
              <span style="color: #6b7280; min-width: 120px; font-size: 14px;">Priority:</span>
              <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; text-transform: uppercase;
                ${task.priority === 'urgent' ? 'background-color: #fee2e2; color: #dc2626;' :
        task.priority === 'high' ? 'background-color: #ffedd5; color: #ea580c;' :
          task.priority === 'medium' ? 'background-color: #dbeafe; color: #2563eb;' :
            'background-color: #dcfce7; color: #16a34a;'}">
                ${task.priority}
              </span>
            </div>
            
            <div style="display: flex; align-items: center;">
              <span style="color: #6b7280; min-width: 120px; font-size: 14px;">Status:</span>
              <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;
                ${task.status === 'completed' ? 'background-color: #dcfce7; color: #16a34a;' :
        task.status === 'in-progress' ? 'background-color: #dbeafe; color: #2563eb;' :
          'background-color: #fef3c7; color: #d97706;'}">
                ${task.status.replace('-', ' ')}
              </span>
            </div>
            
            ${task.dueDate ? `
            <div style="display: flex; align-items: center;">
              <span style="color: #6b7280; min-width: 120px; font-size: 14px;">Due Date:</span>
              <span style="color: #374151; font-weight: 500;">${formatDate(task.dueDate)}</span>
            </div>
            ` : ''}
            
            <div style="display: flex; align-items: center;">
              <span style="color: #6b7280; min-width: 120px; font-size: 14px;">Assigned By:</span>
              <span style="color: #374151; font-weight: 500;">${assigner?.name || 'System'}</span>
            </div>
            
            <div style="display: flex; align-items: center;">
              <span style="color: #6b7280; min-width: 120px; font-size: 14px;">Assigned To:</span>
              <span style="color: #374151; font-weight: 500;">You</span>
            </div>
          </div>
        </div>

        <!-- Action Button -->
        <div style="text-align: center; margin: 35px 0;">
          <a href="${taskUrl}" 
             style="background-color: #06b6d4; color: white; padding: 16px 32px; 
                    text-decoration: none; border-radius: 6px; font-size: 16px;
                    display: inline-block; font-weight: 500; box-shadow: 0 2px 4px rgba(6, 182, 212, 0.3);
                    transition: background-color 0.2s ease;">
            View Task in Dashboard
          </a>
        </div>

        <!-- Security Note -->
        <div style="background: #fef3c7; border-radius: 6px; padding: 15px; margin-bottom: 25px;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            <strong>Task Details:</strong> This task was assigned to you via the AI Meeting Assistant system.
          </p>
        </div>

        <!-- Additional Info -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
            If the button doesn't work, you can also view your tasks at:
          </p>
          <p style="background: #f8fafc; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px; color: #374151; margin: 0;">
            ${taskUrl}
          </p>
        </div>

        <!-- Footer -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            If you believe this task was assigned by mistake, please contact the task creator.<br>
            © ${new Date().getFullYear()} AI Meeting Assistant. All rights reserved.
          </p>
        </div>
      </div>
    </div>
    `;

    await sendEmail(user.email, `Task Assigned: ${task.title} - AI Meeting Assistant`, html);
    console.log(`✅ Task assignment email sent to ${user.email}`);

  } catch (error) {
    console.error('❌ Error sending task assignment email:', error.message);
  }
};


// -------------------------------------------------------------------
// CREATE TASK WITH VALIDATION AND EMAIL-BASED ASSIGNMENT
// -------------------------------------------------------------------
export const createTask = async (req, res) => {
  try {
    console.log('=== CREATE TASK REQUEST ===');
    console.log('Request body:', req.body);
    console.log('User ID:', req.user.id);

    const {
      title,
      description,
      meetingId,
      emails = [], // Changed to default empty array
      priority,
      dueDate,
      estimatedHours,
      tags,
      assignedUserIds = [] // Added support for direct user IDs
    } = req.body;

    // ============ VALIDATION START ============
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required'
      });
    }

    if (!meetingId) {
      return res.status(400).json({
        success: false,
        message: 'Meeting ID is required'
      });
    }

    if (title.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Title cannot exceed 200 characters'
      });
    }

    if (description && description.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Description cannot exceed 2000 characters'
      });
    }

    if (estimatedHours && (estimatedHours < 0 || estimatedHours > 1000)) {
      return res.status(400).json({
        success: false,
        message: 'Estimated hours must be between 0 and 1000'
      });
    }

    if (dueDate && new Date(dueDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Due date cannot be in the past'
      });
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid priority value'
      });
    }
    // ============ VALIDATION END ============

    // Check if meeting exists and user has access
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    console.log('Meeting found:', meeting.title);
    console.log('Emails to assign:', emails);
    console.log('User IDs to assign:', assignedUserIds);

    // Check if user is host or participant of the meeting
    const isHost = meeting.host.toString() === req.user.id;
    const isParticipant = meeting.participants.some(
      p => p.user.toString() === req.user.id
    );

    if (!isHost && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create tasks for this meeting'
      });
    }

    // Create task
    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      meeting: meetingId,
      createdBy: req.user.id,
      priority: priority || 'medium',
      dueDate: dueDate || null,
      estimatedHours: estimatedHours || null,
      tags: tags || [],
      status: 'pending'
    });

    console.log('Task created with ID:', task._id);

    // ============ EMAIL-BASED ASSIGNMENT START ============
    const allAssignmentPromises = [];

    // Process email-based assignments
    if (emails && Array.isArray(emails) && emails.length > 0) {
      console.log('Looking for users with emails:', emails);

      // Find users by their emails
      const users = await User.find({
        email: { $in: emails.map(email => email.toLowerCase().trim()) }
      });

      console.log('Found users by email:', users.map(u => ({
        id: u._id,
        email: u.email,
        name: u.name
      })));

      if (users.length === 0) {
        console.log('WARNING: No users found with the provided emails');
      }

      for (const user of users) {
        // Check if user is a meeting participant
        const isMeetingParticipant = meeting.participants.some(
          p => p.user.toString() === user._id.toString()
        );

        console.log(`User ${user.email} is meeting participant:`, isMeetingParticipant);

        if (isMeetingParticipant) {
          console.log(`Assigning user ${user.email} to task`);
          allAssignmentPromises.push(task.assignUser(user._id, req.user.id));

          // ============ ADD EMAIL NOTIFICATION ============
          allAssignmentPromises.push(
            sendTaskAssignmentEmail(task, user._id, req.user.id).catch(emailError => {
              console.error(`Failed to send email to ${user.email}:`, emailError.message);
              // Don't throw, continue with other assignments
            })
          );
          // ============ END EMAIL NOTIFICATION ============
        } else {
          console.log(`Skipping ${user.email} - not a meeting participant`);
        }
      }
    }

    // Execute all assignments
    if (allAssignmentPromises.length > 0) {
      await Promise.all(allAssignmentPromises);
      await task.save();
      console.log('Task saved with assignments');
    } else {
      console.log('No valid assignments to process');
    }
    // ============ EMAIL-BASED ASSIGNMENT END ============

    // Populate and return the task
    const populatedTask = await Task.findById(task._id)
      .populate('meeting', 'title startTime')
      .populate('createdBy', 'name email profilePicture')
      .populate('assignedTo.user', 'name email profilePicture')
      .populate('comments.user', 'name email profilePicture');

    console.log('Final task with populated data:', {
      id: populatedTask._id,
      title: populatedTask.title,
      assignedTo: populatedTask.assignedTo
    });

    // ============ UPDATE STATS START ============
    // Update meeting task stats
    await updateMeetingTaskStats(meetingId);
    // ============ UPDATE STATS END ============

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: populatedTask
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

// -------------------------------------------------------------------
// HELPER FUNCTION: UPDATE MEETING TASK STATS
// -------------------------------------------------------------------
const updateMeetingTaskStats = async (meetingId) => {
  try {
    console.log('Updating stats for meeting:', meetingId);

    // Get all tasks for this meeting
    const tasks = await Task.find({ meeting: meetingId });

    // Calculate statistics
    const stats = {
      total: tasks.length,
      pending: 0,
      'in-progress': 0,
      completed: 0,
      cancelled: 0,
      'on-hold': 0,
      totalEstimatedHours: 0,
      totalActualHours: 0,
      overdueCount: 0,
      completionRate: 0
    };

    let completedTasks = 0;
    const now = new Date();

    tasks.forEach(task => {
      stats[task.status] = (stats[task.status] || 0) + 1;
      stats.totalEstimatedHours += task.estimatedHours || 0;
      stats.totalActualHours += task.actualHours || 0;

      if (task.status === 'completed') {
        completedTasks++;
      }

      // Check if overdue
      if (task.dueDate && task.dueDate < now &&
        ['pending', 'in-progress'].includes(task.status)) {
        stats.overdueCount++;
      }
    });

    // Calculate completion rate
    if (stats.total > 0) {
      stats.completionRate = Math.round((completedTasks / stats.total) * 100);
    }

    // Update meeting with stats (you can add a stats field to your Meeting model)
    await Meeting.findByIdAndUpdate(meetingId, {
      $set: {
        'taskStats': {
          lastUpdated: new Date(),
          ...stats
        }
      }
    });

    console.log('Meeting stats updated:', stats);

    return stats;
  } catch (error) {
    console.error('Error updating meeting task stats:', error);
    throw error;
  }
};

// -------------------------------------------------------------------
// GET TASKS WITH FILTERING
// -------------------------------------------------------------------
export const getTasks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      meetingId,
      assignedToMe,
      overdue,
      search,
      sortBy = 'dueDate',
      sortOrder = 'asc'
    } = req.query;

    let query = {};

    // Filter by meeting
    if (meetingId) {
      // Check if user has access to this meeting
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      const isHost = meeting.host.toString() === req.user.id;
      const isParticipant = meeting.participants.some(
        p => p.user.toString() === req.user.id
      );

      if (!isHost && !isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view tasks for this meeting'
        });
      }

      query.meeting = meetingId;
    }

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by priority
    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    // Filter tasks assigned to current user
    if (assignedToMe === 'true') {
      query['assignedTo.user'] = req.user.id;
    }

    // Filter overdue tasks
    if (overdue === 'true') {
      query.dueDate = { $lt: new Date() };
      query.status = { $in: ['pending', 'in-progress'] };
    }

    // Search in title and description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // If no specific filters, show user's tasks (created by or assigned to)
    if (Object.keys(query).length === 0) {
      query.$or = [
        { createdBy: req.user.id },
        { 'assignedTo.user': req.user.id }
      ];
    }

    // Sort options
    const sortOptions = {};
    const validSortFields = ['title', 'dueDate', 'priority', 'status', 'createdAt', 'estimatedHours'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'dueDate';
    sortOptions[sortField] = sortOrder === 'desc' ? -1 : 1;

    // Add secondary sort by priority for better organization
    if (sortField !== 'priority') {
      sortOptions.priority = -1;
    }

    const tasks = await Task.find(query)
      .populate('meeting', 'title startTime host')
      .populate('createdBy', 'name email profilePicture')
      .populate('assignedTo.user', 'name email profilePicture')
      .populate('comments.user', 'name email profilePicture')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(query);

    // Get summary statistics
    const stats = await Task.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusSummary = {
      total: 0,
      pending: 0,
      'in-progress': 0,
      completed: 0,
      cancelled: 0,
      'on-hold': 0
    };

    stats.forEach(stat => {
      statusSummary.total += stat.count;
      statusSummary[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      tasks,
      summary: statusSummary,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// -------------------------------------------------------------------
// GET SINGLE TASK
// -------------------------------------------------------------------
export const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('meeting', 'title startTime host participants')
      .populate('createdBy', 'name email profilePicture')
      .populate('assignedTo.user', 'name email profilePicture')
      .populate('comments.user', 'name email profilePicture');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user has access to this task
    const isCreator = task.createdBy._id.toString() === req.user.id;
    const isAssigned = task.assignedTo.some(
      assignment => assignment.user._id.toString() === req.user.id
    );

    // Check if user is meeting host or participant
    const meeting = await Meeting.findById(task.meeting._id);
    const isMeetingHost = meeting.host.toString() === req.user.id;
    const isMeetingParticipant = meeting.participants.some(
      p => p.user.toString() === req.user.id
    );

    if (!isCreator && !isAssigned && !isMeetingHost && !isMeetingParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this task'
      });
    }

    res.status(200).json({
      success: true,
      task
    });

  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// -------------------------------------------------------------------
// UPDATE TASK WITH VALIDATION AND STATS UPDATE
// -------------------------------------------------------------------
export const updateTask = async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      estimatedHours,
      actualHours,
      tags,
      emails, // Added email support for updates
      assignedUserIds // Added user ID support for updates
    } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user can update this task
    const isCreator = task.createdBy.toString() === req.user.id;
    const isAssigned = task.assignedTo.some(
      assignment => assignment.user.toString() === req.user.id
    );

    const meeting = await Meeting.findById(task.meeting);
    const isMeetingHost = meeting.host.toString() === req.user.id;

    if (!isCreator && !isAssigned && !isMeetingHost) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task'
      });
    }

    // ============ VALIDATION START ============
    if (title && (!title.trim() || title.length > 200)) {
      return res.status(400).json({
        success: false,
        message: 'Title is required and cannot exceed 200 characters'
      });
    }

    if (description && description.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Description cannot exceed 2000 characters'
      });
    }

    if (estimatedHours && (estimatedHours < 0 || estimatedHours > 1000)) {
      return res.status(400).json({
        success: false,
        message: 'Estimated hours must be between 0 and 1000'
      });
    }

    if (actualHours && (actualHours < 0 || actualHours > 1000)) {
      return res.status(400).json({
        success: false,
        message: 'Actual hours must be between 0 and 1000'
      });
    }

    if (dueDate && new Date(dueDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Due date cannot be in the past'
      });
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid priority value'
      });
    }

    const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled', 'on-hold'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    // ============ VALIDATION END ============

    // Update basic fields
    const allowedUpdates = [
      'title', 'description', 'status', 'priority', 'dueDate',
      'estimatedHours', 'actualHours', 'tags'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'title' || field === 'description') {
          task[field] = req.body[field].trim();
        } else {
          task[field] = req.body[field];
        }
      }
    });

    // Handle status change
    if (status && task.status !== status) {
      task.updateStatus(status);
    }

    // ============ EMAIL-BASED ASSIGNMENT UPDATE START ============
    if (emails || assignedUserIds) {
      // Clear existing assignments if new ones are provided
      if (emails || assignedUserIds) {
        task.assignedTo = [];
      }

      const allAssignmentPromises = [];

      // Process email-based assignments
      if (emails && Array.isArray(emails) && emails.length > 0) {
        const users = await User.find({
          email: { $in: emails.map(email => email.toLowerCase().trim()) }
        });

        for (const user of users) {
          const isMeetingParticipant = meeting.participants.some(
            p => p.user.toString() === user._id.toString()
          );

          if (isMeetingParticipant) {
            allAssignmentPromises.push(task.assignUser(user._id, req.user.id));
          }
        }
      }

      // Process direct user ID assignments
      if (assignedUserIds && Array.isArray(assignedUserIds) && assignedUserIds.length > 0) {
        console.log('Processing direct user ID assignments:', assignedUserIds);

        // Validate user IDs
        const usersById = await User.find({
          _id: { $in: assignedUserIds.map(id => new mongoose.Types.ObjectId(id)) }
        });

        const validUserIds = usersById.map(user => user._id.toString());

        for (const userId of assignedUserIds) {
          if (validUserIds.includes(userId)) {
            const isMeetingParticipant = meeting.participants.some(
              p => p.user.toString() === userId
            );

            if (isMeetingParticipant) {
              console.log(`Assigning user ${userId} to task`);
              allAssignmentPromises.push(task.assignUser(userId, req.user.id));

              // ============ ADD EMAIL NOTIFICATION ============
              // Find the user object to get email
              const user = usersById.find(u => u._id.toString() === userId);
              if (user) {
                allAssignmentPromises.push(
                  sendTaskAssignmentEmail(task, userId, req.user.id).catch(emailError => {
                    console.error(`Failed to send email to ${user.email}:`, emailError.message);
                    // Don't throw, continue with other assignments
                  })
                );
              }
              // ============ END EMAIL NOTIFICATION ============
            } else {
              console.log(`Skipping ${userId} - not a meeting participant`);
            }
          } else {
            console.log(`Invalid user ID: ${userId}`);
          }
        }
      }

      if (allAssignmentPromises.length > 0) {
        await Promise.all(allAssignmentPromises);
      }
    }
    // ============ EMAIL-BASED ASSIGNMENT UPDATE END ============

    await task.save();

    // ============ UPDATE STATS START ============
    await updateMeetingTaskStats(task.meeting.toString());
    // ============ UPDATE STATS END ============

    const updatedTask = await Task.findById(task._id)
      .populate('meeting', 'title startTime')
      .populate('createdBy', 'name email profilePicture')
      .populate('assignedTo.user', 'name email profilePicture')
      .populate('comments.user', 'name email profilePicture');

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask
    });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// -------------------------------------------------------------------
// DELETE TASK WITH STATS UPDATE
// -------------------------------------------------------------------
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user can delete this task
    const isCreator = task.createdBy.toString() === req.user.id;
    const meeting = await Meeting.findById(task.meeting);
    const isMeetingHost = meeting.host.toString() === req.user.id;

    if (!isCreator && !isMeetingHost) {
      return res.status(403).json({
        success: false,
        message: 'Only task creator or meeting host can delete this task'
      });
    }

    const meetingId = task.meeting.toString();

    await Task.findByIdAndDelete(req.params.id);

    // ============ UPDATE STATS START ============
    await updateMeetingTaskStats(meetingId);
    // ============ UPDATE STATS END ============

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// -------------------------------------------------------------------
// ASSIGN USER TO TASK (ENHANCED WITH EMAIL SUPPORT)
// -------------------------------------------------------------------
export const assignUserToTask = async (req, res) => {
  try {
    const { userId, email } = req.body; // Added email support

    if (!userId && !email) {
      return res.status(400).json({
        success: false,
        message: 'Either User ID or Email is required'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user can assign to this task
    const isCreator = task.createdBy.toString() === req.user.id;
    const meeting = await Meeting.findById(task.meeting);
    const isMeetingHost = meeting.host.toString() === req.user.id;

    if (!isCreator && !isMeetingHost) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to assign users to this task'
      });
    }

    let targetUserId = userId;

    // If email is provided, find user by email
    if (email && !userId) {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User with this email not found'
        });
      }
      targetUserId = user._id.toString();
    }

    // Check if target user is a meeting participant
    const isMeetingParticipant = meeting.participants.some(
      p => p.user.toString() === targetUserId
    );

    if (!isMeetingParticipant) {
      return res.status(400).json({
        success: false,
        message: 'Can only assign tasks to meeting participants'
      });
    }

    // Check if user is already assigned
    const alreadyAssigned = task.assignedTo.some(
      assignment => assignment.user.toString() === targetUserId
    );

    if (alreadyAssigned) {
      return res.status(400).json({
        success: false,
        message: 'User is already assigned to this task'
      });
    }

    await task.assignUser(targetUserId, req.user.id);
    await task.save();

    // ============ SEND EMAIL NOTIFICATION START ============
    try {
      await sendTaskAssignmentEmail(task, targetUserId, req.user.id);
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
      // Continue even if email fails
    }
    // ============ SEND EMAIL NOTIFICATION END ============

    // ============ UPDATE STATS START ============
    await updateMeetingTaskStats(task.meeting.toString());
    // ============ UPDATE STATS END ============

    const updatedTask = await Task.findById(task._id)
      .populate('assignedTo.user', 'name email profilePicture');

    res.status(200).json({
      success: true,
      message: 'User assigned to task successfully',
      task: updatedTask
    });

  } catch (error) {
    console.error('Assign user error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// -------------------------------------------------------------------
// REMOVE USER ASSIGNMENT WITH STATS UPDATE
// -------------------------------------------------------------------
export const removeUserAssignment = async (req, res) => {
  try {
    const { userId, email } = req.body; // Added email support

    if (!userId && !email) {
      return res.status(400).json({
        success: false,
        message: 'Either User ID or Email is required'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user can modify assignments
    const isCreator = task.createdBy.toString() === req.user.id;
    const meeting = await Meeting.findById(task.meeting);
    const isMeetingHost = meeting.host.toString() === req.user.id;

    if (!isCreator && !isMeetingHost) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify task assignments'
      });
    }

    let targetUserId = userId;

    // If email is provided, find user by email
    if (email && !userId) {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User with this email not found'
        });
      }
      targetUserId = user._id.toString();
    }

    // Check if user is actually assigned
    const isAssigned = task.assignedTo.some(
      assignment => assignment.user.toString() === targetUserId
    );

    if (!isAssigned) {
      return res.status(400).json({
        success: false,
        message: 'User is not assigned to this task'
      });
    }

    await task.removeAssignment(targetUserId);
    await task.save();

    // ============ UPDATE STATS START ============
    await updateMeetingTaskStats(task.meeting.toString());
    // ============ UPDATE STATS END ============

    const updatedTask = await Task.findById(task._id)
      .populate('assignedTo.user', 'name email profilePicture');

    res.status(200).json({
      success: true,
      message: 'User assignment removed successfully',
      task: updatedTask
    });

  } catch (error) {
    console.error('Remove assignment error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// -------------------------------------------------------------------
// ADD COMMENT TO TASK
// -------------------------------------------------------------------
export const addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user has access to this task
    const isCreator = task.createdBy.toString() === req.user.id;
    const isAssigned = task.assignedTo.some(
      assignment => assignment.user.toString() === req.user.id
    );

    const meeting = await Meeting.findById(task.meeting);
    const isMeetingHost = meeting.host.toString() === req.user.id;
    const isMeetingParticipant = meeting.participants.some(
      p => p.user.toString() === req.user.id
    );

    if (!isCreator && !isAssigned && !isMeetingHost && !isMeetingParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to comment on this task'
      });
    }

    await task.addComment(req.user.id, text.trim());
    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('comments.user', 'name email profilePicture');

    res.status(200).json({
      success: true,
      message: 'Comment added successfully',
      task: updatedTask
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// -------------------------------------------------------------------
// GET TASK DASHBOARD STATS (WITH FILTERS)
// -------------------------------------------------------------------
export const getTaskDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      meetingId,
      assignedToMe,
      status,
      priority,
      overdue
    } = req.query;

    // Build query based on filters
    let query = {};

    // Filter by meeting
    if (meetingId) {
      query.meeting = meetingId;
    }

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by priority
    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    // Filter overdue tasks
    if (overdue === 'true') {
      query.dueDate = { $lt: new Date() };
      query.status = { $in: ['pending', 'in-progress'] };
    }

    // If assignedToMe is true, only show tasks assigned to current user
    if (assignedToMe === 'true') {
      query['assignedTo.user'] = userId;
    } else {
      // Otherwise show tasks created by or assigned to user
      query.$or = [
        { createdBy: userId },
        { 'assignedTo.user': userId }
      ];
    }

    // Get filtered tasks
    const filteredTasks = await Task.find(query)
      .populate('meeting', 'title startTime')
      .populate('createdBy', 'name email')
      .populate('assignedTo.user', 'name email');

    // Calculate statistics from filtered tasks
    const now = new Date();
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.status === 'completed').length;
    const pending = filteredTasks.filter(t => t.status === 'pending').length;
    const inProgress = filteredTasks.filter(t => t.status === 'in-progress').length;
    const overdueCount = filteredTasks.filter(t =>
      t.dueDate && new Date(t.dueDate) < now && ['pending', 'in-progress'].includes(t.status)
    ).length;

    // Calculate rates
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate performance score
    let performanceScore = 0;
    if (total > 0) {
      const baseScore = completionRate * 0.7;
      const timelinessScore = overdueCount === 0 ? 30 : Math.max(0, 30 - ((overdueCount / total) * 100));
      performanceScore = Math.min(100, Math.round(baseScore + timelinessScore));
    }

    // Priority distribution
    const priorities = {
      urgent: filteredTasks.filter(t => t.priority === 'urgent').length,
      high: filteredTasks.filter(t => t.priority === 'high').length,
      medium: filteredTasks.filter(t => t.priority === 'medium').length,
      low: filteredTasks.filter(t => t.priority === 'low').length
    };

    // Get user distribution for team view
    const userStats = await Task.aggregate([
      { $match: query },
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
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          name: '$user.name',
          email: '$user.email',
          totalTasks: 1,
          completedTasks: 1,
          completionRate: {
            $multiply: [
              { $divide: ['$completedTasks', '$totalTasks'] },
              100
            ]
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total,
        completed,
        pending,
        inProgress,
        overdue: overdueCount,
        completionRate,
        performanceScore,
        priorities
      },
      userStats,
      filteredTasks: filteredTasks.slice(0, 10) // For recent tasks display
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// -------------------------------------------------------------------
// GET MEETING TASKS WITH STATS
// -------------------------------------------------------------------
export const getMeetingTasks = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      assignedToMe
    } = req.query;

    // Check if meeting exists and user has access
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if user is host or participant of the meeting
    const isHost = meeting.host.toString() === req.user.id;
    const isParticipant = meeting.participants.some(
      p => p.user.toString() === req.user.id
    );

    if (!isHost && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view tasks for this meeting'
      });
    }

    let query = { meeting: meetingId };

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by priority
    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    // Filter tasks assigned to current user
    if (assignedToMe === 'true') {
      query['assignedTo.user'] = req.user.id;
    }

    const tasks = await Task.find(query)
      .populate('createdBy', 'name email profilePicture')
      .populate('assignedTo.user', 'name email profilePicture')
      .populate('comments.user', 'name email profilePicture')
      .sort({ dueDate: 1, priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(query);

    // Get task statistics for this meeting
    const stats = await Task.aggregate([
      { $match: { meeting: meeting._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalHours: { $sum: { $ifNull: ['$estimatedHours', 0] } }
        }
      }
    ]);

    const statusSummary = {
      total: 0,
      pending: 0,
      'in-progress': 0,
      completed: 0,
      cancelled: 0,
      'on-hold': 0,
      totalEstimatedHours: 0
    };

    stats.forEach(stat => {
      statusSummary.total += stat.count;
      statusSummary.totalEstimatedHours += stat.totalHours;
      statusSummary[stat._id] = stat.count;
    });

    // Get meeting stats from helper function
    const meetingStats = await updateMeetingTaskStats(meetingId);

    res.status(200).json({
      success: true,
      tasks,
      meeting: {
        id: meeting._id,
        title: meeting.title,
        startTime: meeting.startTime
      },
      summary: statusSummary,
      meetingStats: meetingStats, // Add this line
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get meeting tasks error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// -------------------------------------------------------------------
// GET MEETING TASK STATISTICS
// -------------------------------------------------------------------
export const getMeetingTaskStats = async (req, res) => {
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

    // Check if user is host or participant of the meeting
    const isHost = meeting.host.toString() === req.user.id;
    const isParticipant = meeting.participants.some(
      p => p.user.toString() === req.user.id
    );

    if (!isHost && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view task statistics for this meeting'
      });
    }

    // Get detailed task statistics
    const stats = await Task.aggregate([
      { $match: { meeting: meeting._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalEstimatedHours: { $sum: { $ifNull: ['$estimatedHours', 0] } },
          totalActualHours: { $sum: { $ifNull: ['$actualHours', 0] } },
          avgEstimatedHours: { $avg: { $ifNull: ['$estimatedHours', 0] } }
        }
      }
    ]);

    // Get priority distribution
    const priorityStats = await Task.aggregate([
      { $match: { meeting: meeting._id } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get assignment statistics
    const assignmentStats = await Task.aggregate([
      { $match: { meeting: meeting._id } },
      { $unwind: '$assignedTo' },
      {
        $group: {
          _id: '$assignedTo.user',
          taskCount: { $sum: 1 },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          userName: '$user.name',
          userEmail: '$user.email',
          taskCount: 1,
          completedCount: 1,
          completionRate: {
            $multiply: [
              { $divide: ['$completedCount', '$taskCount'] },
              100
            ]
          }
        }
      }
    ]);

    // Format the response
    const formattedStats = {
      overview: {
        totalTasks: 0,
        totalEstimatedHours: 0,
        totalActualHours: 0,
        completionRate: 0
      },
      statusBreakdown: {},
      priorityBreakdown: {},
      assignmentBreakdown: assignmentStats
    };

    let completedTasks = 0;

    stats.forEach(stat => {
      formattedStats.overview.totalTasks += stat.count;
      formattedStats.overview.totalEstimatedHours += stat.totalEstimatedHours;
      formattedStats.overview.totalActualHours += stat.totalActualHours;

      formattedStats.statusBreakdown[stat._id] = {
        count: stat.count,
        estimatedHours: stat.totalEstimatedHours,
        actualHours: stat.totalActualHours,
        avgEstimatedHours: Math.round(stat.avgEstimatedHours * 100) / 100
      };

      if (stat._id === 'completed') {
        completedTasks = stat.count;
      }
    });

    priorityStats.forEach(stat => {
      formattedStats.priorityBreakdown[stat._id] = {
        count: stat.count,
        percentage: Math.round((stat.count / formattedStats.overview.totalTasks) * 100)
      };
    });

    // Calculate overall completion rate
    if (formattedStats.overview.totalTasks > 0) {
      formattedStats.overview.completionRate = Math.round(
        (completedTasks / formattedStats.overview.totalTasks) * 100
      );
    }

    res.status(200).json({
      success: true,
      meeting: {
        id: meeting._id,
        title: meeting.title,
        startTime: meeting.startTime
      },
      statistics: formattedStats
    });

  } catch (error) {
    console.error('Get meeting task stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};