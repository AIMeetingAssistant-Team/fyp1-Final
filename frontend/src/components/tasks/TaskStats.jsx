import React, { useState, useMemo, useCallback } from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  Users,
  Calendar,
  FileText,
  Target,
  BarChart3,
  PieChart,
  Zap,
  Filter,
  Download,
  ChevronRight,
  UserCheck,
  Award,
  TrendingDown,
  Loader2,
  Info,
  Activity
} from 'lucide-react';

// Helper function for random colors - defined at module level
const getRandomColor = () => {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const TaskStats = ({ tasks = [], currentUser, isLoading = false }) => {
  const [timeRange, setTimeRange] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');

  // Safe data extraction with defaults
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  // Extract unique users for filtering
  const users = useMemo(() => {
    const userMap = new Map();
    if (currentUser && currentUser._id) {
      userMap.set(currentUser._id, {
        id: currentUser._id,
        name: 'You',
        email: currentUser.email,
        avatarColor: '#3B82F6'
      });
    }
    
    safeTasks.forEach(task => {
      if (task.createdBy && task.createdBy._id && !userMap.has(task.createdBy._id)) {
        userMap.set(task.createdBy._id, {
          id: task.createdBy._id,
          name: task.createdBy.name || 'Unknown',
          email: task.createdBy.email || '',
          avatarColor: getRandomColor()
        });
      }
      
      if (task.assignedTo && Array.isArray(task.assignedTo)) {
        task.assignedTo.forEach(assignment => {
          if (assignment.user && assignment.user._id && !userMap.has(assignment.user._id)) {
            userMap.set(assignment.user._id, {
              id: assignment.user._id,
              name: assignment.user.name || 'Unknown',
              email: assignment.user.email || '',
              avatarColor: getRandomColor()
            });
          }
        });
      }
    });
    
    return Array.from(userMap.values());
  }, [safeTasks, currentUser]);

  // Filter tasks based on selected filters
  const filteredTasks = useMemo(() => {
    let filtered = [...safeTasks];
    
    if (timeRange !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch(timeRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(task => {
        if (!task.createdAt) return false;
        return new Date(task.createdAt) >= startDate;
      });
    }
    
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === selectedPriority);
    }
    
    if (selectedUser !== 'all') {
      filtered = filtered.filter(task => {
        const isCreator = task.createdBy?._id === selectedUser;
        const isAssigned = task.assignedTo?.some(
          assignment => assignment.user?._id === selectedUser
        );
        return isCreator || isAssigned;
      });
    }
    
    return filtered;
  }, [safeTasks, timeRange, selectedPriority, selectedUser]);

  // Calculate all metrics with safe defaults
  const metrics = useMemo(() => {
    const now = new Date();
    const total = filteredTasks.length;
    
    if (total === 0) {
      return {
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        overdue: 0,
        urgent: 0,
        high: 0,
        medium: 0,
        low: 0,
        completionRate: 0,
        progressRate: 0,
        overdueRate: 0,
        performanceScore: 50,
        avgCompletionTime: 0,
        efficiencyScore: 50,
        totalEstimatedHours: 0,
        totalActualHours: 0,
        userWorkload: []
      };
    }

    // Status counts with safe property access
    const completed = filteredTasks.filter(t => t.status === 'completed').length;
    const inProgress = filteredTasks.filter(t => t.status === 'in-progress').length;
    const pending = filteredTasks.filter(t => t.status === 'pending').length;
    const overdue = filteredTasks.filter(t => {
      if (!t.dueDate) return false;
      try {
        const dueDate = new Date(t.dueDate);
        const status = t.status || 'pending';
        return dueDate < now && ['pending', 'in-progress'].includes(status);
      } catch {
        return false;
      }
    }).length;
    
    // Priority counts with safe defaults
    const urgent = filteredTasks.filter(t => (t.priority || 'medium') === 'urgent').length;
    const high = filteredTasks.filter(t => (t.priority || 'medium') === 'high').length;
    const medium = filteredTasks.filter(t => (t.priority || 'medium') === 'medium').length;
    const low = filteredTasks.filter(t => (t.priority || 'medium') === 'low').length;
    
    // Calculate rates
    const completionRate = Math.round((completed / total) * 100) || 0;
    const progressRate = Math.round(((completed + inProgress) / total) * 100) || 0;
    const overdueRate = Math.round((overdue / total) * 100) || 0;
    
    // Calculate performance score
    let performanceScore = 50;
    const baseScore = completionRate * 0.5;
    const timelinessScore = Math.max(0, 30 - (overdueRate * 0.3));
    const priorityScore = ((urgent * 2 + high * 1.5 + medium) / total) * 20;
    performanceScore = Math.min(100, Math.round(baseScore + timelinessScore + priorityScore));
    
    // Calculate average completion time
    let avgCompletionTime = 0;
    const completedTasks = filteredTasks.filter(t => 
      t.status === 'completed' && t.createdAt
    );
    
    if (completedTasks.length > 0) {
      let validTasks = 0;
      const totalDays = completedTasks.reduce((sum, task) => {
        try {
          const created = new Date(task.createdAt);
          const completed = task.completionDate ? new Date(task.completionDate) : new Date();
          const days = Math.max(1, Math.ceil((completed - created) / (1000 * 60 * 60 * 24)));
          validTasks++;
          return sum + days;
        } catch {
          return sum;
        }
      }, 0);
      
      if (validTasks > 0) {
        avgCompletionTime = Math.round(totalDays / validTasks);
      }
    }
    
    // Calculate efficiency score
    let efficiencyScore = 50;
    if (completed > 0) {
      const timeEfficiency = avgCompletionTime > 0 ? Math.min(100, (7 / avgCompletionTime) * 100) : 0;
      const qualityScore = overdue > 0 ? Math.max(0, ((completed - overdue) / completed) * 100) : 100;
      efficiencyScore = Math.round((timeEfficiency * 0.4) + (qualityScore * 0.6));
    }
    
    // Calculate hours with safe defaults
    const totalEstimatedHours = filteredTasks.reduce((sum, task) => 
      sum + (parseFloat(task.estimatedHours) || 0), 0
    );
    const totalActualHours = filteredTasks.reduce((sum, task) => 
      sum + (parseFloat(task.actualHours) || 0), 0
    );
    
    // Calculate user workload
    const userWorkloadMap = new Map();
    
    filteredTasks.forEach(task => {
      // Count tasks created by user
      if (task.createdBy && task.createdBy._id) {
        const userId = task.createdBy._id;
        const userName = task.createdBy.name || 'Unknown';
        
        if (!userWorkloadMap.has(userId)) {
          userWorkloadMap.set(userId, {
            id: userId,
            name: userName,
            totalTasks: 0,
            completed: 0,
            pending: 0,
            overdue: 0
          });
        }
        const userWorkload = userWorkloadMap.get(userId);
        userWorkload.totalTasks++;
        if (task.status === 'completed') userWorkload.completed++;
        if (task.status === 'pending') userWorkload.pending++;
        
        // Check if overdue
        if (task.dueDate) {
          try {
            const dueDate = new Date(task.dueDate);
            const status = task.status || 'pending';
            if (dueDate < now && ['pending', 'in-progress'].includes(status)) {
              userWorkload.overdue++;
            }
          } catch (error) {
            console.error('Error parsing due date:', error);
          }
        }
      }
      
      // Count tasks assigned to user
      if (task.assignedTo && Array.isArray(task.assignedTo)) {
        task.assignedTo.forEach(assignment => {
          if (assignment.user && assignment.user._id) {
            const userId = assignment.user._id;
            const userName = assignment.user.name || 'Unknown';
            
            if (!userWorkloadMap.has(userId)) {
              userWorkloadMap.set(userId, {
                id: userId,
                name: userName,
                totalTasks: 0,
                completed: 0,
                pending: 0,
                overdue: 0
              });
            }
            const userWorkload = userWorkloadMap.get(userId);
            userWorkload.totalTasks++;
            if (task.status === 'completed') userWorkload.completed++;
            if (task.status === 'pending') userWorkload.pending++;
            
            // Check if overdue
            if (task.dueDate) {
              try {
                const dueDate = new Date(task.dueDate);
                const status = task.status || 'pending';
                if (dueDate < now && ['pending', 'in-progress'].includes(status)) {
                  userWorkload.overdue++;
                }
              } catch (error) {
                console.error('Error parsing due date:', error);
              }
            }
          }
        });
      }
    });
    
    const userWorkload = Array.from(userWorkloadMap.values())
      .sort((a, b) => b.totalTasks - a.totalTasks)
      .slice(0, 5);
    
    return {
      total,
      completed,
      inProgress,
      pending,
      overdue,
      urgent,
      high,
      medium,
      low,
      completionRate,
      progressRate,
      overdueRate,
      performanceScore,
      avgCompletionTime,
      efficiencyScore,
      totalEstimatedHours,
      totalActualHours,
      userWorkload
    };
  }, [filteredTasks]);

  // Chart data
  const statusChartData = useMemo(() => [
    { name: 'Completed', value: metrics.completed, color: '#10B981' },
    { name: 'In Progress', value: metrics.inProgress, color: '#3B82F6' },
    { name: 'Pending', value: metrics.pending, color: '#F59E0B' },
    { name: 'Overdue', value: metrics.overdue, color: '#EF4444' }
  ], [metrics]);

  const priorityChartData = useMemo(() => [
    { name: 'Urgent', value: metrics.urgent, color: '#DC2626' },
    { name: 'High', value: metrics.high, color: '#EA580C' },
    { name: 'Medium', value: metrics.medium, color: '#3B82F6' },
    { name: 'Low', value: metrics.low, color: '#10B981' }
  ], [metrics]);

  // Handle export
  const handleExport = useCallback(() => {
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Tasks', metrics.total],
      ['Completed', metrics.completed],
      ['In Progress', metrics.inProgress],
      ['Pending', metrics.pending],
      ['Overdue', metrics.overdue],
      ['Completion Rate', `${metrics.completionRate}%`],
      ['Performance Score', metrics.performanceScore],
      ['Efficiency Score', metrics.efficiencyScore]
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task-stats-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }, [metrics]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-gray-600">Loading task statistics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-8 h-8" />
              <h1 className="text-2xl font-bold">Task Analytics Dashboard</h1>
            </div>
            <p className="text-gray-300">Real-time insights into task performance and team productivity</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              disabled={metrics.total === 0}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
            
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All Users</option>
              {users.map(user => (
                <option key={user.id || user.email} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Tasks */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">Total Tasks</span>
          </div>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-gray-900">{metrics.total}</h3>
            <div className="text-right">
              <div className={`flex items-center text-sm ${metrics.completionRate >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                {metrics.completionRate >= 80 ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <Activity className="w-4 h-4 mr-1" />
                )}
                <span>{metrics.completionRate}% completion</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Completed: <span className="font-medium">{metrics.completed}</span></span>
              <span className="text-gray-600">Active: <span className="font-medium">{metrics.inProgress + metrics.pending}</span></span>
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">Completion Rate</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-3xl font-bold text-gray-900">{metrics.completionRate}%</h3>
              <p className="text-sm text-gray-600 mt-1">{metrics.completed} of {metrics.total} tasks</p>
            </div>
            <div className="w-20 h-20">
              <div className="relative w-full h-full">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#E5E7EB"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#10B981"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${metrics.completionRate * 2.513} 251.3`}
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">{metrics.completionRate}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-50 rounded-xl">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">Overdue Tasks</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <h3 className={`text-3xl font-bold ${metrics.overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.overdue}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{metrics.overdueRate}% of total</p>
            </div>
            <div className="text-right">
              <div className={`flex items-center text-sm ${metrics.overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.overdue > 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4 mr-1" />
                    <span>Attention Needed</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span>On Track</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Score */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">Performance Score</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-3xl font-bold text-gray-900">{metrics.performanceScore}</h3>
              <p className="text-sm text-gray-600 mt-1">Based on efficiency metrics</p>
            </div>
            <div className="w-20">
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block text-gray-600">
                      Score
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-gray-600">
                      {metrics.performanceScore}/100
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                  <div
                    style={{ width: `${metrics.performanceScore}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-purple-500 to-purple-600"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Task Status Distribution</h3>
            </div>
            <span className="text-sm text-gray-500">{metrics.total} total tasks</span>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-48 h-48">
              {/* Simple pie chart using SVG */}
              <div className="relative w-full h-full">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {statusChartData.map((item, index) => {
                    if (item.value === 0) return null;
                    
                    const totalValues = statusChartData.reduce((sum, d) => sum + d.value, 0);
                    if (totalValues === 0) return null;
                    
                    const percentage = (item.value / totalValues) * 100;
                    const startAngle = statusChartData
                      .slice(0, index)
                      .reduce((acc, curr) => acc + (curr.value / totalValues) * 360, 0);
                    const endAngle = startAngle + (percentage * 360 / 100);
                    
                    // Calculate arc coordinates
                    const startRad = (startAngle - 90) * Math.PI / 180;
                    const endRad = (endAngle - 90) * Math.PI / 180;
                    
                    const x1 = 50 + 40 * Math.cos(startRad);
                    const y1 = 50 + 40 * Math.sin(startRad);
                    const x2 = 50 + 40 * Math.cos(endRad);
                    const y2 = 50 + 40 * Math.sin(endRad);
                    
                    const largeArcFlag = percentage > 50 ? 1 : 0;
                    
                    const pathData = [
                      `M 50 50`,
                      `L ${x1} ${y1}`,
                      `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                      `Z`
                    ].join(' ');
                    
                    return (
                      <path
                        key={item.name}
                        d={pathData}
                        fill={item.color}
                        stroke="white"
                        strokeWidth="2"
                      />
                    );
                  })}
                  <circle cx="50" cy="50" r="15" fill="white" />
                </svg>
              </div>
            </div>
            
            <div className="flex-1 space-y-4">
              {statusChartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900">{item.value}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({metrics.total > 0 ? Math.round((item.value / metrics.total) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Priority Distribution</h3>
            </div>
            <span className="text-sm text-gray-500">By urgency level</span>
          </div>
          
          <div className="space-y-4">
            {priorityChartData.map((item) => {
              const percentage = metrics.total > 0 ? (item.value / metrics.total) * 100 : 0;
              
              return (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900">{item.value}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({Math.round(percentage)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: item.color
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>



      {/* Empty State */}
      {metrics.total === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No Task Data Available</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            {selectedUser !== 'all' 
              ? `No tasks found for the selected user in the current time range.`
              : `Create and assign tasks to start tracking performance metrics and team productivity.`}
          </p>
          <div className="flex justify-center gap-3">
            <button 
              onClick={() => {
                setTimeRange('all');
                setSelectedUser('all');
                setSelectedPriority('all');
              }}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskStats;