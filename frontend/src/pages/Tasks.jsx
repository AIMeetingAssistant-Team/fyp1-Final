import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import TaskList from '../components/tasks/TaskList';
import TaskStats from "../components/tasks/TaskStats";
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import TaskFilters from '../components/tasks/TaskFilters';
import EditTaskModal from '../components/tasks/EditTaskModal';
import {
  Plus,
  Calendar,
  Loader2,
  Grid,
  List,
  X,
  AlertTriangle,
  Trash2,
  AlertCircle
} from 'lucide-react';

const Tasks = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    assignedToMe: false,
    overdue: false,
    search: '',
    sortBy: 'dueDate',
    sortOrder: 'asc'
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState('all');
  const [editingTask, setEditingTask] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    taskId: null,
    taskTitle: ''
  });

  // Fetch tasks with current filters
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        ...filters,
        assignedToMe: filters.assignedToMe.toString(),
        overdue: filters.overdue.toString()
      });

      if (selectedMeeting !== 'all') {
        queryParams.set('meetingId', selectedMeeting);
      }

      const data = await apiRequest(`/tasks?${queryParams}`, 'GET', null, token);

      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user meetings
  const fetchUserMeetings = async () => {
    try {
      const token = localStorage.getItem('token');
      const data = await apiRequest('/meetings?limit=50', 'GET', null, token);

      if (data.success) {
        setMeetings(data.meetings);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchTasks();
    fetchUserMeetings();
  }, [filters, selectedMeeting]);

  // Task CRUD operations
  const handleCreateTask = async (taskData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiRequest('/tasks', 'POST', taskData, token);

      if (response.success) {
        setShowCreateModal(false);
        await fetchTasks();
        return { success: true, message: 'Task created successfully!' };
      }
      return { success: false, message: response.message };
    } catch (error) {
      console.error('Create task error:', error);
      return { success: false, message: error.message };
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowEditModal(true);
  };

  const handleUpdateTaskSubmit = async (updatedData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiRequest(`/tasks/${editingTask._id}`, 'PUT', updatedData, token);

      if (response.success) {
        setShowEditModal(false);
        setEditingTask(null);
        await fetchTasks();
        return { success: true, message: 'Task updated successfully!' };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiRequest(`/tasks/${taskId}`, 'PUT', updates, token);

      if (response.success) {
        fetchTasks();
        return { success: true, message: 'Task updated successfully!' };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const handleDeleteTask = async (taskId, taskTitle = '') => {
    setDeleteModal({
      isOpen: true,
      taskId,
      taskTitle
    });
  };

  const confirmDeleteTask = async () => {
    if (!deleteModal.taskId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await apiRequest(`/tasks/${deleteModal.taskId}`, 'DELETE', null, token);

      if (response.success) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Delete task error:', error);
    } finally {
      setDeleteModal({ isOpen: false, taskId: null, taskTitle: '' });
    }
  };

  const handleAssignUser = async (taskId, userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiRequest(`/tasks/${taskId}/assign`, 'PUT', { userId }, token);

      if (response.success) {
        fetchTasks();
        return { success: true, message: 'User assigned successfully!' };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const handleAddComment = async (taskId, text) => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiRequest(`/tasks/${taskId}/comments`, 'POST', { text }, token);

      if (response.success) {
        fetchTasks();
        return { success: true, message: 'Comment added!' };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };
  const handleDeleteComment = async (taskId, commentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiRequest(`/tasks/${taskId}/comments/${commentId}`, 'DELETE', null, token);
      if (response.success) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Delete comment error:', error);
    }
  };
  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Task Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage all your meeting tasks in one place</p>
      </div>

      {/* ============ 1. TASK STATS FIRST ============ */}
      <TaskStats
        tasks={tasks}
        currentUser={user}
        isLoading={loading}
      />

      {/* ============ 2. CONTROLS BAR SECOND ============ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Meeting Filter */}
            <div className="flex items-center">
              <label className="text-sm text-gray-600 mr-2">Meeting:</label>
              <select
                value={selectedMeeting}
                onChange={(e) => setSelectedMeeting(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Meetings</option>
                {meetings.map(meeting => (
                  <option key={meeting._id} value={meeting._id}>
                    {meeting.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleFilterChange({ assignedToMe: !filters.assignedToMe })}
                className={`px-3 py-1.5 rounded-lg text-sm ${filters.assignedToMe ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Assigned to Me
              </button>
              <button
                onClick={() => handleFilterChange({ overdue: !filters.overdue })}
                className={`px-3 py-1.5 rounded-lg text-sm ${filters.overdue ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Overdue
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <TaskFilters filters={filters} onFilterChange={handleFilterChange} />
      </div>

      {/* ============ 3. TASKS LIST/GRID THIRD ============ */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-gray-600">Loading tasks...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No tasks found</h3>
          <p className="text-gray-600 mb-6">Create your first task to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create New Task
          </button>
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          viewMode={viewMode}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onAssignUser={handleAssignUser}
          onAddComment={handleAddComment}
          onEditTask={handleEditTask}
          user={user}
        />
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTask}
          meetings={meetings}
          user={user}
        />
      )}

      {showEditModal && editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => {
            setShowEditModal(false);
            setEditingTask(null);
          }}
          onSubmit={handleUpdateTaskSubmit}
          meetings={meetings}
          user={user}
        />
      )}

      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Delete Task</h2>
                <button
                  onClick={() => setDeleteModal({ isOpen: false, taskId: null, taskTitle: '' })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>

              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                Are you sure you want to delete this task?
              </h3>

              {deleteModal.taskTitle && (
                <p className="text-gray-600 text-center mb-6">
                  "{deleteModal.taskTitle}"
                </p>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">
                    This action cannot be undone. All comments, attachments, and task data will be permanently deleted.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteModal({ isOpen: false, taskId: null, taskTitle: '' })}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteTask}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;