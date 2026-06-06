import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Clock,
  Users,
  CheckCircle,
  TrendingUp,
  Download,
  Calendar,
  ArrowLeft,
  Loader2,
  PieChart,
  Activity,
  Target,
  UserCheck,
  Video,
  FileText,
  Award
} from 'lucide-react';
import { apiRequest } from '../utils/api';
import StatsCards from '../components/analytics/StatsCards';
import MeetingTrendsChart from '../components/analytics/MeetingTrendsChart';
import ParticipationChart from '../components/analytics/ParticipationChart';
import TaskAnalytics from '../components/analytics/TaskAnalytics';
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
  const [exportType, setExportType] = useState('meetings');

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

  const handleExport = async (format, reportType) => {
    const token = localStorage.getItem('token');
    const url = `${import.meta.env.VITE_BASE_URL}/analytics/export/${reportType}?period=${period}&format=${format}`;
    
    window.open(url, '_blank');
    setShowExportModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gradient-to-b from-gray-50 to-white"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/60 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
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
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-sm text-gray-500">Track meeting performance and team insights</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
            >
              {periods.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-lg font-medium hover:shadow-md transition-all"
            >
              <Download className="w-4 h-4" />
              Export Report
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards Row */}
        <motion.div variants={fadeInUp} className="mb-8">
          <StatsCards data={data?.overview} />
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Meeting Trends Chart */}
          <motion.div variants={fadeInUp}>
            <MeetingTrendsChart data={data?.meetingTrends} period={period} />
          </motion.div>

          {/* Participation Chart */}
          <motion.div variants={fadeInUp}>
            <ParticipationChart data={data?.participation} />
          </motion.div>
        </div>

        {/* Time Analytics Section */}
        <motion.div variants={fadeInUp} className="mb-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100">
                <Clock className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Time Analytics</h2>
                <p className="text-sm text-gray-500">Meeting duration and scheduling patterns</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Total Meeting Time</p>
                <p className="text-3xl font-bold text-gray-900">
                  {data?.overview?.meetings?.totalHours || 0} <span className="text-lg font-normal text-gray-500">hours</span>
                </p>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <TrendingUp className={`w-4 h-4 ${data?.timeAnalytics?.trend >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  <span className={data?.timeAnalytics?.trend >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {Math.abs(data?.timeAnalytics?.trend || 0)}% from last week
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Average Meeting Duration</p>
                <p className="text-3xl font-bold text-gray-900">
                  {data?.overview?.meetings?.averageDuration || 0} <span className="text-lg font-normal text-gray-500">minutes</span>
                </p>
                <p className="text-xs text-gray-400 mt-2">Across {data?.overview?.meetings?.total || 0} meetings</p>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Busiest Day</p>
                <p className="text-3xl font-bold text-gray-900">{data?.timeAnalytics?.busiestDay || 'N/A'}</p>
                <p className="text-xs text-gray-400 mt-2">Most meetings scheduled this day</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Meeting Type Distribution & Task Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.div variants={fadeInUp}>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100">
                  <PieChart className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Meeting Type Distribution</h2>
                  <p className="text-sm text-gray-500">Breakdown by meeting format</p>
                </div>
              </div>

              <div className="space-y-4">
                {data?.meetingTypeDistribution?.map((type, idx) => (
                  <div key={type.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize text-gray-700">{type.name}</span>
                      <span className="text-gray-500">{type.value} meetings</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(type.value / data.overview.meetings.total) * 100}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.1 }}
                        className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <TaskAnalytics data={data?.taskAnalytics} />
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div variants={fadeInUp}>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100">
                <Activity className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                <p className="text-sm text-gray-500">Latest meetings and tasks</p>
              </div>
            </div>

            <div className="space-y-3">
              {data?.recentActivity?.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-4 p-4 bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200"
                >
                  <div className={`p-2 rounded-lg ${item.type === 'meeting' ? 'bg-cyan-50 text-cyan-600' : 'bg-purple-50 text-purple-600'}`}>
                    {item.type === 'meeting' ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.status === 'completed' ? 'bg-green-100 text-green-700' :
                        item.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {item.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 capitalize">{item.type}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
      />
    </motion.div>
  );
}