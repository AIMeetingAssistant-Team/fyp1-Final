import React, { useState } from 'react';
import {
    BarChart3,
    PieChart,
    TrendingUp,
    Users,
    Clock,
    AlertCircle,
    CheckCircle,
    Calendar,
    Target,
    ChevronDown,
    User
} from 'lucide-react';

const TaskDashboardStats = ({ tasks, currentUser }) => {
    const [selectedUser, setSelectedUser] = useState('all');
    const [viewType, setViewType] = useState('overview'); // 'overview', 'detailed', 'comparison'

    // Get all unique users from tasks
    const getAllUsers = () => {
        const usersMap = new Map();

        // Add current user first
        if (currentUser) {
            usersMap.set(currentUser._id || currentUser.id || 'current', {
                id: currentUser._id || currentUser.id || 'current',
                name: currentUser.name || currentUser.email || 'You',
                email: currentUser.email || '',
                tasksCreated: 0,
                tasksAssigned: 0,
                tasksCompleted: 0
            });
        }

        tasks.forEach(task => {
            // Add task creator
            if (task.createdBy) {
                const userId = task.createdBy._id || task.createdBy;
                const userName = task.createdBy.name || task.createdBy.email || 'Unknown User';
                if (!usersMap.has(userId)) {
                    usersMap.set(userId, {
                        id: userId,
                        name: userName,
                        email: task.createdBy.email || '',
                        tasksCreated: 0,
                        tasksAssigned: 0,
                        tasksCompleted: 0
                    });
                }
                usersMap.get(userId).tasksCreated += 1;
            }

            // Add assigned users
            if (task.assignedTo && task.assignedTo.length > 0) {
                task.assignedTo.forEach(assignment => {
                    if (assignment.user) {
                        const userId = assignment.user._id || assignment.user;
                        const userName = assignment.user.name || assignment.user.email || 'Unknown User';
                        if (!usersMap.has(userId)) {
                            usersMap.set(userId, {
                                id: userId,
                                name: userName,
                                email: assignment.user.email || '',
                                tasksCreated: 0,
                                tasksAssigned: 0,
                                tasksCompleted: 0
                            });
                        }
                        const user = usersMap.get(userId);
                        user.tasksAssigned += 1;
                        if (task.status === 'completed') {
                            user.tasksCompleted += 1;
                        }
                    }
                });
            }
        });

        return Array.from(usersMap.values());
    };

    const allUsers = getAllUsers();

    // Calculate statistics for selected user or all users
    const calculateStats = (userId = 'all') => {
        if (userId === 'all') {
            // Calculate for ALL tasks (not filtering by user)
            const now = new Date();
            const total = tasks.length;
            const completed = tasks.filter(t => t.status === 'completed').length;
            const pending = tasks.filter(t => t.status === 'pending').length;
            const inProgress = tasks.filter(t => t.status === 'in-progress').length;
            const overdue = tasks.filter(t =>
                t.dueDate && new Date(t.dueDate) < now && ['pending', 'in-progress'].includes(t.status)
            ).length;

            const urgent = tasks.filter(t => t.priority === 'urgent').length;
            const high = tasks.filter(t => t.priority === 'high').length;
            const medium = tasks.filter(t => t.priority === 'medium').length;
            const low = tasks.filter(t => t.priority === 'low').length;

            const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

            // Calculate average completion time
            let avgCompletionTime = 0;
            const completedTasks = tasks.filter(t =>
                t.status === 'completed' && t.createdAt && t.completionDate
            );

            if (completedTasks.length > 0) {
                const totalDays = completedTasks.reduce((sum, task) => {
                    const created = new Date(task.createdAt);
                    const completed = new Date(task.completionDate);
                    const days = Math.ceil((completed - created) / (1000 * 60 * 60 * 24));
                    return sum + days;
                }, 0);
                avgCompletionTime = Math.round(totalDays / completedTasks.length);
            }

            // Calculate productivity score
            let productivityScore = 0;
            if (total > 0) {
                const scoreComponents = {
                    completion: (completed / total) * 40,
                    timeliness: (overdue === 0 ? 30 : (1 - (overdue / total)) * 30),
                    priorityHandling: ((urgent + high) / total) * 30
                };
                productivityScore = Math.round(
                    scoreComponents.completion + scoreComponents.timeliness + scoreComponents.priorityHandling
                );
            }

            return {
                total,
                completed,
                pending,
                inProgress,
                overdue,
                urgent,
                high,
                medium,
                low,
                completionRate,
                avgCompletionTime,
                productivityScore
            };
        } else {
            // Calculate for specific user
            const userTasks = tasks.filter(task => {
                // Check if user is creator
                const isCreator = task.createdBy?._id === userId || task.createdBy === userId;

                // Check if user is assigned
                const isAssigned = task.assignedTo?.some(assignment =>
                    assignment.user?._id === userId || assignment.user === userId
                );

                return isCreator || isAssigned;
            });

            const now = new Date();
            const total = userTasks.length;
            const completed = userTasks.filter(t => t.status === 'completed').length;
            const pending = userTasks.filter(t => t.status === 'pending').length;
            const inProgress = userTasks.filter(t => t.status === 'in-progress').length;
            const overdue = userTasks.filter(t =>
                t.dueDate && new Date(t.dueDate) < now && ['pending', 'in-progress'].includes(t.status)
            ).length;

            const urgent = userTasks.filter(t => t.priority === 'urgent').length;
            const high = userTasks.filter(t => t.priority === 'high').length;
            const medium = userTasks.filter(t => t.priority === 'medium').length;
            const low = userTasks.filter(t => t.priority === 'low').length;

            const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

            // Calculate average completion time
            let avgCompletionTime = 0;
            const completedTasks = userTasks.filter(t =>
                t.status === 'completed' && t.createdAt && t.completionDate
            );

            if (completedTasks.length > 0) {
                const totalDays = completedTasks.reduce((sum, task) => {
                    const created = new Date(task.createdAt);
                    const completed = new Date(task.completionDate);
                    const days = Math.ceil((completed - created) / (1000 * 60 * 60 * 24));
                    return sum + days;
                }, 0);
                avgCompletionTime = Math.round(totalDays / completedTasks.length);
            }

            // Calculate productivity score
            let productivityScore = 0;
            if (total > 0) {
                const scoreComponents = {
                    completion: (completed / total) * 40,
                    timeliness: (overdue === 0 ? 30 : (1 - (overdue / total)) * 30),
                    priorityHandling: ((urgent + high) / total) * 30
                };
                productivityScore = Math.round(
                    scoreComponents.completion + scoreComponents.timeliness + scoreComponents.priorityHandling
                );
            }

            return {
                total,
                completed,
                pending,
                inProgress,
                overdue,
                urgent,
                high,
                medium,
                low,
                completionRate,
                avgCompletionTime,
                productivityScore
            };
        }
    };

    const stats = calculateStats(selectedUser);
    const allStats = calculateStats('all');

    // Get selected user name
    const selectedUserName = selectedUser === 'all'
        ? 'All Users'
        : allUsers.find(u => u.id === selectedUser)?.name || 'User';

    // Generate productivity insights
    const getProductivityInsights = () => {
        if (stats.total === 0) return [];

        const insights = [];

        if (stats.completionRate >= 80) {
            insights.push({
                type: 'positive',
                text: `Excellent completion rate of ${stats.completionRate}%`
            });
        } else if (stats.completionRate < 50) {
            insights.push({
                type: 'warning',
                text: `Low completion rate of ${stats.completionRate}% - focus on completing tasks`
            });
        }

        if (stats.overdue > 0) {
            insights.push({
                type: 'critical',
                text: `${stats.overdue} overdue task${stats.overdue > 1 ? 's' : ''} require immediate attention`
            });
        }

        if (stats.urgent > 0) {
            insights.push({
                type: 'warning',
                text: `${stats.urgent} urgent task${stats.urgent > 1 ? 's' : ''} need prioritization`
            });
        }

        if (stats.avgCompletionTime > 7) {
            insights.push({
                type: 'info',
                text: `Average completion time is ${stats.avgCompletionTime} days - consider task breakdown`
            });
        }

        if (insights.length === 0) {
            insights.push({
                type: 'positive',
                text: 'Good task management overall'
            });
        }

        return insights.slice(0, 3); // Limit to 3 insights
    };

    const insights = getProductivityInsights();

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            {/* Header with User Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center">
                        <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                        Task Statistics Dashboard
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {selectedUser === 'all' ? 'Team-wide performance metrics' : `Performance metrics for ${selectedUserName}`}
                    </p>
                </div>

                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                        >
                            <option value="all">👥 All Team</option>
                            {allUsers.map(user => (
                                <option key={user.id} value={user.id}>
                                    👤 {user.name}
                                </option>
                            ))}
                        </select>
                        <Users className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400" />
                    </div>

                    <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewType('overview')}
                            className={`px-3 py-1.5 text-sm ${viewType === 'overview' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setViewType('detailed')}
                            className={`px-3 py-1.5 text-sm ${viewType === 'detailed' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            Detailed
                        </button>
                    </div>
                </div>
            </div>

            {/* Overview View */}
            {viewType === 'overview' && (
                <div className="space-y-6">
                    {/* Key Metrics Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-blue-700 font-medium">Completion Rate</p>
                                    <p className="text-2xl font-bold text-gray-800 mt-1">{stats.completionRate}%</p>
                                </div>
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    <Target className="w-5 h-5 text-blue-600" />
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="w-full bg-blue-200 rounded-full h-1.5">
                                    <div
                                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                                        style={{ width: `${stats.completionRate}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-blue-700 mt-1">
                                    {stats.completed} of {stats.total} tasks completed
                                </p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-700 font-medium">Productivity</p>
                                    <p className="text-2xl font-bold text-gray-800 mt-1">{stats.productivityScore}/100</p>
                                </div>
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="w-full bg-green-200 rounded-full h-1.5">
                                    <div
                                        className="bg-green-600 h-1.5 rounded-full transition-all duration-500"
                                        style={{ width: `${stats.productivityScore}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-green-700 mt-1">
                                    Based on completion, timeliness & priority
                                </p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-purple-700 font-medium">Avg. Time</p>
                                    <p className="text-2xl font-bold text-gray-800 mt-1">{stats.avgCompletionTime}d</p>
                                </div>
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    <Clock className="w-5 h-5 text-purple-600" />
                                </div>
                            </div>
                            <p className="text-xs text-purple-700 mt-3">
                                Average days to complete tasks
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-red-700 font-medium">Require Action</p>
                                    <p className="text-2xl font-bold text-gray-800 mt-1">{stats.overdue + stats.pending}</p>
                                </div>
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                </div>
                            </div>
                            <p className="text-xs text-red-700 mt-3">
                                {stats.overdue} overdue, {stats.pending} pending
                            </p>
                        </div>
                    </div>

                    {/* Status Distribution */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="border border-gray-200 rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                <PieChart className="w-4 h-4 mr-2 text-blue-600" />
                                Status Distribution
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                                        <span className="text-sm text-gray-600">Completed</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span className="text-sm font-medium text-gray-800">{stats.completed}</span>
                                        <span className="text-xs text-gray-500">
                                            ({stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%)
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                                        <span className="text-sm text-gray-600">In Progress</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span className="text-sm font-medium text-gray-800">{stats.inProgress}</span>
                                        <span className="text-xs text-gray-500">
                                            ({stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}%)
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                                        <span className="text-sm text-gray-600">Pending</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span className="text-sm font-medium text-gray-800">{stats.pending}</span>
                                        <span className="text-xs text-gray-500">
                                            ({stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}%)
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                                        <span className="text-sm text-gray-600">Overdue</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span className="text-sm font-medium text-gray-800">{stats.overdue}</span>
                                        <span className="text-xs text-gray-500">
                                            ({stats.total > 0 ? Math.round((stats.overdue / stats.total) * 100) : 0}%)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Priority Distribution */}
                        <div className="border border-gray-200 rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                <AlertCircle className="w-4 h-4 mr-2 text-orange-600" />
                                Priority Distribution
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs text-gray-600">Urgent</span>
                                        <span className="text-xs font-medium text-gray-800">
                                            {stats.urgent} ({stats.total > 0 ? Math.round((stats.urgent / stats.total) * 100) : 0}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-red-100 rounded-full h-1.5">
                                        <div
                                            className="bg-red-500 h-1.5 rounded-full"
                                            style={{ width: `${(stats.urgent / Math.max(stats.total, 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs text-gray-600">High</span>
                                        <span className="text-xs font-medium text-gray-800">
                                            {stats.high} ({stats.total > 0 ? Math.round((stats.high / stats.total) * 100) : 0}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-orange-100 rounded-full h-1.5">
                                        <div
                                            className="bg-orange-500 h-1.5 rounded-full"
                                            style={{ width: `${(stats.high / Math.max(stats.total, 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs text-gray-600">Medium</span>
                                        <span className="text-xs font-medium text-gray-800">
                                            {stats.medium} ({stats.total > 0 ? Math.round((stats.medium / stats.total) * 100) : 0}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-blue-100 rounded-full h-1.5">
                                        <div
                                            className="bg-blue-500 h-1.5 rounded-full"
                                            style={{ width: `${(stats.medium / Math.max(stats.total, 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs text-gray-600">Low</span>
                                        <span className="text-xs font-medium text-gray-800">
                                            {stats.low} ({stats.total > 0 ? Math.round((stats.low / stats.total) * 100) : 0}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-green-100 rounded-full h-1.5">
                                        <div
                                            className="bg-green-500 h-1.5 rounded-full"
                                            style={{ width: `${(stats.low / Math.max(stats.total, 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Productivity Insights */}
                    {insights.length > 0 && (
                        <div className="border border-gray-200 rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                <TrendingUp className="w-4 h-4 mr-2 text-purple-600" />
                                Productivity Insights
                            </h3>
                            <div className="space-y-2">
                                {insights.map((insight, index) => (
                                    <div
                                        key={index}
                                        className={`flex items-start p-3 rounded-lg ${insight.type === 'critical' ? 'bg-red-50 border-l-4 border-red-500' :
                                            insight.type === 'warning' ? 'bg-yellow-50 border-l-4 border-yellow-500' :
                                                insight.type === 'positive' ? 'bg-green-50 border-l-4 border-green-500' :
                                                    'bg-blue-50 border-l-4 border-blue-500'
                                            }`}
                                    >
                                        <div className={`mr-3 mt-0.5 ${insight.type === 'critical' ? 'text-red-600' :
                                            insight.type === 'warning' ? 'text-yellow-600' :
                                                insight.type === 'positive' ? 'text-green-600' :
                                                    'text-blue-600'
                                            }`}>
                                            {insight.type === 'critical' ? '⚠️' :
                                                insight.type === 'warning' ? '⚠️' :
                                                    insight.type === 'positive' ? '✅' : 'ℹ️'}
                                        </div>
                                        <p className="text-sm text-gray-700">{insight.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Comparison */}
                    {selectedUser !== 'all' && (
                        <div className="border border-gray-200 rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Performance vs Team Average</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <p className="text-xs text-gray-500">Completion Rate</p>
                                    <p className={`text-lg font-bold ${stats.completionRate >= allStats.completionRate ? 'text-green-600' : 'text-red-600'}`}>
                                        {stats.completionRate}%
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        vs {allStats.completionRate}% team
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-500">Overdue Tasks</p>
                                    <p className={`text-lg font-bold ${stats.overdue <= allStats.overdue ? 'text-green-600' : 'text-red-600'}`}>
                                        {stats.overdue}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        vs {allStats.overdue} team
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-500">Productivity</p>
                                    <p className={`text-lg font-bold ${stats.productivityScore >= allStats.productivityScore ? 'text-green-600' : 'text-red-600'}`}>
                                        {stats.productivityScore}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        vs {allStats.productivityScore} team
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Detailed View */}
            {viewType === 'detailed' && (
                <div className="space-y-6">
                    {/* User Performance Table */}
                    <div className="overflow-hidden border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tasks
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Completed
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Completion Rate
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Overdue
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Productivity
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {allUsers.map(user => {
                                    const userStats = calculateStats(user.id);
                                    return (
                                        <tr
                                            key={user.id}
                                            className={`hover:bg-gray-50 cursor-pointer ${selectedUser === user.id ? 'bg-blue-50' : ''}`}
                                            onClick={() => setSelectedUser(user.id)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                        <User className="w-4 h-4 text-blue-600" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {user.tasksAssigned} assigned, {user.tasksCreated} created
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-900">{userStats.total}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-900">{userStats.completed}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                        <div
                                                            className="bg-blue-600 h-2 rounded-full"
                                                            style={{ width: `${userStats.completionRate}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm text-gray-900">{userStats.completionRate}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-medium ${userStats.overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {userStats.overdue}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                        <div
                                                            className="bg-green-600 h-2 rounded-full"
                                                            style={{ width: `${userStats.productivityScore}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm text-gray-900">{userStats.productivityScore}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Selected User Details */}
                    {selectedUser !== 'all' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Task Breakdown</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-xs text-gray-600">Total Tasks</span>
                                        <span className="text-sm font-medium">{stats.total}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-xs text-gray-600">Completed</span>
                                        <span className="text-sm font-medium text-green-600">{stats.completed}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-xs text-gray-600">In Progress</span>
                                        <span className="text-sm font-medium text-blue-600">{stats.inProgress}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-xs text-gray-600">Pending</span>
                                        <span className="text-sm font-medium text-yellow-600">{stats.pending}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-xs text-gray-600">Overdue</span>
                                        <span className="text-sm font-medium text-red-600">{stats.overdue}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Priority Analysis</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-xs text-gray-600">Urgent Tasks</span>
                                        <span className="text-sm font-medium text-red-600">{stats.urgent}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-xs text-gray-600">High Priority</span>
                                        <span className="text-sm font-medium text-orange-600">{stats.high}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-xs text-gray-600">Medium Priority</span>
                                        <span className="text-sm font-medium text-blue-600">{stats.medium}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-xs text-gray-600">Low Priority</span>
                                        <span className="text-sm font-medium text-green-600">{stats.low}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Performance Metrics</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-xs text-gray-600">Completion Rate</span>
                                        <span className="text-sm font-medium">{stats.completionRate}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-xs text-gray-600">Productivity Score</span>
                                        <span className="text-sm font-medium">{stats.productivityScore}/100</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-xs text-gray-600">Avg. Days to Complete</span>
                                        <span className="text-sm font-medium">{stats.avgCompletionTime}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-xs text-gray-600">On-time Rate</span>
                                        <span className="text-sm font-medium">
                                            {stats.total > 0 ? Math.round(((stats.total - stats.overdue) / stats.total) * 100) : 100}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TaskDashboardStats;