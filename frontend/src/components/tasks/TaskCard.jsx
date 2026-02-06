import { useState } from 'react';
import {
  Calendar,
  Users,
  Flag,
  MessageSquare,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit,
  Trash2,
  UserPlus,
  ChevronDown,
  ChevronUp,
  User,
  Pencil // Already imported
} from 'lucide-react';
import TaskCommentSection from './TaskCommentSection';

const TaskCard = ({ task, viewMode, onUpdateTask, onDeleteTask, onAssignUser, onAddComment, user, onEditTask }) => { // Add onEditTask prop
  const [showDetails, setShowDetails] = useState(false);
  const [showCommentSection, setShowCommentSection] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Add this helper function for status colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'on-hold': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-progress': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'overdue': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };


  // Add this function to check if user can edit task
  const canEditTask = () => {
    console.log('=== DEBUG canEditTask ===');
    console.log('Current user:', user);
    console.log('Task data:', task);
    console.log('Task createdBy:', task.createdBy);
    console.log('Task assignedTo:', task.assignedTo);

    if (!user) {
      console.log('No user found, returning false');
      return false;
    }

    // Check if user is the creator
    const isCreator = task.createdBy?._id === user?.id || task.createdBy === user?.id;
    console.log('Is creator?', isCreator, 'task.createdBy?._id:', task.createdBy?._id, 'user?.id:', user?.id);

    // Check if user is assigned to the task
    const isAssigned = task.assignedTo?.some(assignment => {
      const assignmentUserId = assignment.user?._id || assignment.user || assignment;
      console.log('Checking assignment:', assignment, 'assignmentUserId:', assignmentUserId);
      return assignmentUserId === user?.id;
    });

    console.log('Is assigned?', isAssigned);
    console.log('Can edit?', isCreator || isAssigned);
    console.log('=== END DEBUG ===');

    return isCreator || isAssigned;
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setIsUpdating(true);
      await onUpdateTask(task._id, { status: newStatus });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return <span className="text-red-600">Overdue</span>;
    if (diffDays === 0) return <span className="text-orange-600">Today</span>;
    if (diffDays === 1) return <span className="text-orange-600">Tomorrow</span>;
    if (diffDays <= 7) return <span className="text-blue-600">{diffDays} days</span>;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Helper to get assigned users
  const getAssignedUsers = () => {
    if (!task.assignedTo || task.assignedTo.length === 0) {
      return [];
    }

    const assignedUsers = task.assignedTo.map(assignment => {
      if (assignment.user && typeof assignment.user === 'object') {
        return {
          name: assignment.user.name || 'User',
          email: assignment.user.email,
          profilePicture: assignment.user.profilePicture
        };
      }

      if (assignment.name || assignment.email) {
        return {
          name: assignment.name || 'User',
          email: assignment.email,
          profilePicture: assignment.profilePicture
        };
      }

      if (typeof assignment === 'string') {
        return {
          name: 'User',
          email: assignment
        };
      }

      return { name: 'User', email: 'unknown' };
    });

    return assignedUsers;
  };

  const assignedUsers = getAssignedUsers();

  // List view (table row) - UPDATED
  if (viewMode === 'list') {
    return (
      <>
        <tr className="hover:bg-gray-50">
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                {getStatusIcon(task.status)}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{task.title}</div>
                {task.description && (
                  <div className="text-sm text-gray-500 truncate max-w-xs">{task.description}</div>
                )}
              </div>
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-900">{task.meeting?.title || 'No meeting'}</div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center">
              {assignedUsers.length > 0 ? (
                <div className="flex items-center space-x-2">
                  <div className="flex -space-x-2">
                    {assignedUsers.slice(0, 4).map((user, idx) => {
                      const initials = user.name?.charAt(0)?.toUpperCase() ||
                        user.email?.charAt(0)?.toUpperCase() ||
                        'U';
                      const bgColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
                      const bgColor = bgColors[idx % bgColors.length];

                      return (
                        <div key={idx} className="relative group">
                          <div className={`w-8 h-8 rounded-full ${bgColor} border-2 border-white ring-2 ring-blue-100 flex items-center justify-center text-white text-xs font-medium`}>
                            {initials}
                          </div>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                            <div className="font-medium">{user.name || 'User'}</div>
                            <div className="text-gray-300">{user.email}</div>
                          </div>
                        </div>
                      );
                    })}
                    {assignedUsers.length > 4 && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white ring-2 ring-gray-100 flex items-center justify-center text-xs text-gray-600">
                        +{assignedUsers.length - 4}
                      </div>
                    )}
                  </div>
                  <div className="text-sm">
                    {assignedUsers.slice(0, 2).map((user, idx) => (
                      <div key={idx} className="text-gray-700 truncate max-w-[150px]">
                        {user.email}
                      </div>
                    ))}
                    {assignedUsers.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{assignedUsers.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-sm text-gray-500 italic px-2 py-1 bg-gray-100 rounded">Unassigned</span>
              )}
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDate(task.dueDate)}
            </div>
          </td>
          {/* Status column - UPDATED: Replace dropdown with badge */}
          <td className="px-6 py-4 whitespace-nowrap">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
              {task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('-', ' ')}
            </span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <div className="flex items-center space-x-2">
              {/* Edit button - only show if user can edit */}
              {canEditTask() && onEditTask && (
                <button
                  onClick={() => {
                    console.log('Edit button clicked for task:', task);
                    console.log('onEditTask function:', onEditTask);
                    onEditTask(task);
                  }}
                  className="text-gray-400 hover:text-blue-600"
                  title="Edit Task"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setShowCommentSection(!showCommentSection)}
                className="text-gray-400 hover:text-blue-600 flex items-center"
                title="Comments"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="ml-1 text-xs">
                  {task.comments?.length || 0}
                </span>
              </button>
              {/* Delete button - only show if user can edit */}
              {canEditTask() && (
                <button
                  onClick={() => onDeleteTask(task._id)}
                  className="text-gray-400 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </td>
        </tr>

        {/* Comment section row */}
        {showCommentSection && (
          <tr>
            <td colSpan="7" className="px-6 py-4 bg-gray-50">
              <TaskCommentSection
                taskId={task._id}
                comments={task.comments || []}
                onAddComment={onAddComment}
                user={user}
              />
            </td>
          </tr>
        )}
      </>
    );
  }

  // Grid view (card)
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getStatusIcon(task.status)}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{task.title}</h3>
            {task.meeting?.title && (
              <p className="text-sm text-gray-500 mt-1">{task.meeting.title}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-400 hover:text-gray-600"
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Status Badge - ADDED */}
      <div className="mb-3">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
          {task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('-', ' ')}
        </span>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{task.description}</p>
      )}

      {/* Assigned Users */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Users className="w-4 h-4 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700">Assigned to:</span>
          </div>
          {assignedUsers.length > 0 ? (
            <span className="text-xs text-gray-500">
              {assignedUsers.length} {assignedUsers.length === 1 ? 'person' : 'people'}
            </span>
          ) : null}
        </div>

        {assignedUsers.length > 0 ? (
          <div className="space-y-2">
            <div className="flex -space-x-2">
              {assignedUsers.slice(0, 4).map((user, idx) => {
                const initials = user.name?.charAt(0)?.toUpperCase() ||
                  user.email?.charAt(0)?.toUpperCase() ||
                  'U';
                const bgColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
                const bgColor = bgColors[idx % bgColors.length];

                return (
                  <div key={idx} className="relative group">
                    <div className={`w-8 h-8 rounded-full ${bgColor} border-2 border-white ring-2 ring-blue-100 flex items-center justify-center text-white text-xs font-medium`}>
                      {initials}
                    </div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      <div className="font-medium">{user.name || 'User'}</div>
                      <div className="text-gray-300">{user.email}</div>
                    </div>
                  </div>
                );
              })}
              {assignedUsers.length > 4 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white ring-2 ring-gray-100 flex items-center justify-center text-xs text-gray-600">
                  +{assignedUsers.length - 4}
                </div>
              )}
            </div>

            <div className="mt-2">
              {assignedUsers.slice(0, 3).map((user, idx) => (
                <div key={idx} className="flex items-center text-sm text-gray-600 mb-1 last:mb-0">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                  <span className="truncate">
                    {user.name || 'User'}: <span className="text-gray-500">{user.email}</span>
                  </span>
                </div>
              ))}
              {assignedUsers.length > 3 && (
                <div className="text-xs text-gray-500 mt-1">
                  + {assignedUsers.length - 3} more
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-3 border border-dashed border-gray-300 rounded-lg">
            <User className="w-5 h-5 text-gray-400 mx-auto mb-1" />
            <span className="text-sm text-gray-500">No one assigned</span>
          </div>
        )}
      </div>

      {/* Expanded Details - UPDATED */}
      {showDetails && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          {/* Action Buttons - UPDATED */}
          <div className="flex space-x-2">
            {/* Edit button - only show if user can edit */}
            {canEditTask() && onEditTask && (
              <button
                onClick={() => onEditTask(task)}
                className="flex-1 flex items-center justify-center px-3 py-2 border border-blue-300 rounded-lg text-sm text-blue-700 hover:bg-blue-50"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit Task
              </button>
            )}
            <button
              onClick={() => setShowCommentSection(!showCommentSection)}
              className={`flex-1 flex items-center justify-center px-3 py-2 border rounded-lg text-sm ${showCommentSection ? 'bg-blue-50 text-blue-700 border-blue-200' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Comments ({task.comments?.length || 0})
            </button>
            {/* Delete button - only show if user can edit */}
            {canEditTask() && (
              <button
                onClick={() => onDeleteTask(task._id)}
                className="flex items-center justify-center px-3 py-2 border border-red-300 rounded-lg text-sm text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Comments Section */}
      {showCommentSection && (
        <TaskCommentSection
          taskId={task._id}
          comments={task.comments || []}
          onAddComment={onAddComment}
          user={user}
        />
      )}
    </div>
  );
};

export default TaskCard;