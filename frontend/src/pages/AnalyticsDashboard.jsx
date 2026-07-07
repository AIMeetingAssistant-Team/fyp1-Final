import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  Loader2,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  TrendingUp,
  Award,
  BarChart3
} from 'lucide-react';
import { apiRequest } from '../utils/api';
import ExportModal from '../components/analytics/ExportModal';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
};

const fadeInUp = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('30d');
  const [showExportModal, setShowExportModal] = useState(false);

  const periods = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'all', label: 'All Time' }
  ];

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await apiRequest(`/analytics/dashboard?period=${period}`, 'GET', null, token);
      if (response.success) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const overview = data?.overview || { meetings: { total: 0, completed: 0, completionRate: 0, totalMinutes: 0 }, tasks: { total: 0, completed: 0, completionRate: 0 }, participants: { unique: 0 } };

  // Calculate additional metrics
  const avgMeetingDuration = overview.meetings.total > 0 
    ? Math.round(overview.meetings.totalMinutes / overview.meetings.total) 
    : 0;
  const taskCompletionRate = overview.tasks.total > 0 
    ? Math.round((overview.tasks.completed / overview.tasks.total) * 100) 
    : 0;

  const statsCards = [
    {
      title: 'Total Meetings',
      value: overview.meetings.total,
      icon: Calendar,
      color: 'indigo',
      subtext: `${overview.meetings.completionRate}% completed`,
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600'
    },
    {
      title: 'Meeting Hours',
      value: Math.round(overview.meetings.totalMinutes / 60),
      icon: Clock,
      color: 'blue',
      subtext: `${avgMeetingDuration} min avg`,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Total Tasks',
      value: overview.tasks.total,
      icon: CheckCircle,
      color: 'green',
      subtext: `${taskCompletionRate}% completed`,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    {
      title: 'Participants',
      value: overview.participants.unique,
      icon: Users,
      color: 'purple',
      subtext: 'Unique collaborators',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600'
    }
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gray-50"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </motion.button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-sm text-gray-500">Track your meeting and task performance</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {periods.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-sm hover:shadow"
            >
              <Download className="w-4 h-4" />
              Export Report
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards Grid */}
        <motion.div variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              variants={fadeInUp}
              custom={index}
              whileHover={{ y: -4 }}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {stat.subtext}
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.title}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Key Metrics Overview */}
        <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Meeting Insights */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Meeting Insights</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Meeting Completion Rate</span>
                  <span className="font-medium text-gray-900">{overview.meetings.completionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${overview.meetings.completionRate}%` }}
                    transition={{ duration: 0.6 }}
                    className="h-2 rounded-full bg-indigo-600"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-sm text-gray-500">Total Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{overview.meetings.completed}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Minutes</p>
                  <p className="text-2xl font-bold text-gray-900">{overview.meetings.totalMinutes}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Task Insights */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Task Insights</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Task Completion Rate</span>
                  <span className="font-medium text-gray-900">{taskCompletionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${taskCompletionRate}%` }}
                    transition={{ duration: 0.6 }}
                    className="h-2 rounded-full bg-green-600"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-sm text-gray-500">Total Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">{overview.tasks.total}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{overview.tasks.completed}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Collaboration Stats */}
        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Collaboration Overview</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{overview.participants.unique}</p>
              <p className="text-sm text-gray-500">Unique Participants</p>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-xl">
              <TrendingUp className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{overview.meetings.completed}</p>
              <p className="text-sm text-gray-500">Completed Meetings</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <Award className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">
                {overview.meetings.total > 0 && overview.tasks.total > 0 
                  ? Math.round((overview.meetings.completionRate + taskCompletionRate) / 2)
                  : 0}%
              </p>
              <p className="text-sm text-gray-500">Overall Performance</p>
            </div>
          </div>
        </motion.div>

        {/* Period Summary */}
        <motion.div variants={fadeInUp} className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <div className="flex items-center gap-3 text-indigo-800">
            <Calendar className="w-5 h-5" />
            <p className="text-sm">
              <span className="font-medium">Summary:</span> In the selected period, you've had 
              <span className="font-bold"> {overview.meetings.total} </span> 
              meetings with <span className="font-bold">{overview.participants.unique}</span> unique participants, 
              and completed <span className="font-bold">{overview.tasks.completed}</span> out of 
              <span className="font-bold"> {overview.tasks.total}</span> tasks.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </motion.div>
  );
}