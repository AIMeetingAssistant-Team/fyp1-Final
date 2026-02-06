import { useEffect, useState } from "react";
import { apiRequest } from "../utils/api";
import { useNavigate } from "react-router-dom";
import MeetingsList from "../components/meetings/MeetingList";
import MeetingFilters from "../components/meetings/MeetingFilters";
import { CalendarPlus, Filter, RefreshCw, ArrowLeft, Users, Clock, Calendar } from "lucide-react";
import { motion } from "framer-motion";

// Animation variants matching previous design
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const fadeInUp = {
  hidden: { y: 10, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [filterType, setFilterType] = useState("live");
  const [filterStatus, setFilterStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, completed: 0 });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const handleClearFilters = () => {
    setFilterType("live");
    setFilterStatus("all");
    setStartDate("");
    setEndDate("");
  };

  const fetchMeetings = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", pagination.limit);
      params.append("type", filterType);

      if (filterStatus !== "all") params.append("status", filterStatus);
      if (startDate) params.append("from", startDate);
      if (endDate) params.append("to", endDate);

      const data = await apiRequest(`/meetings?${params.toString()}`, "GET", null, token);

      if (data.success) {
        setMeetings(data.meetings || []);
        setPagination(data.pagination || pagination);
        
        // Calculate stats
        const total = data.meetings?.length || 0;
        const upcoming = data.meetings?.filter(m => m.status === 'scheduled' || m.status === 'live')?.length || 0;
        const completed = data.meetings?.filter(m => m.status === 'completed')?.length || 0;
        
        setStats({ total, upcoming, completed });
      }
    } catch (err) {
      console.error("Error fetching meetings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings(1);
  }, [filterType, filterStatus, startDate, endDate]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    fetchMeetings(newPage);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block mb-4">
            <div className="w-12 h-12 border-3 border-cyan-200 border-t-cyan-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-cyan-600 animate-pulse" />
            </div>
          </div>
          <p className="text-sm text-gray-500">Loading meetings...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gradient-to-b from-white to-gray-50 w-full"
    >
      {/* Header with Workspace-like Design */}
      <motion.div
        variants={fadeInUp}
        className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/60 px-4 sm:px-6 md:px-1 lg:px-9 py-4"
      >
        <div className="flex items-center justify-between">
          {/* Left side: Title with vertical line */}
          <div className="flex items-center gap-3">
            {/* Enhanced Title with Workspace-like Styling */}
            <motion.div
              className="relative group"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Vertical Thick Line */}
                <motion.div
                  className="hidden sm:block w-1 h-8 bg-gray-900/95 rounded-full origin-bottom"
                  whileHover={{ scaleY: 1.2 }}
                  transition={{ duration: 0.2 }}
                />
                
                {/* Cyan Glow Effect on Hover */}
                <motion.div
                  className="absolute -left-2 sm:left-1 top-1/2 -translate-y-1/2 w-0 h-0 rounded-full bg-cyan-500/20 blur-xl"
                  initial={{ width: 0, height: 0 }}
                  whileHover={{
                    width: "100px",
                    height: "100px",
                    opacity: [0, 0.3, 0.1]
                  }}
                  transition={{ duration: 0.3 }}
                />
                
                <h1 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Meetings Overview
                </h1>
              </div>
            </motion.div>
          </div>
          
          {/* Right side: Back button only */}
          <motion.button
            whileHover={{ x: -2, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors group"
          >
            <motion.div
              className="p-1.5 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors"
              whileHover={{ rotate: -5 }}
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.div>
            <span className="text-sm font-medium hidden sm:inline">Back</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <motion.div variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Meetings", value: stats.total, icon: <Users className="w-4 h-4" />, color: "from-cyan-500 to-cyan-600" },
            { label: "Upcoming", value: stats.upcoming, icon: <Calendar className="w-4 h-4" />, color: "from-blue-500 to-blue-600" },
            { label: "Completed", value: stats.completed, icon: <Clock className="w-4 h-4" />, color: "from-gray-500 to-gray-600" }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ y: -3 }}
              className="group"
            >
              <div className="bg-gradient-to-b from-white to-gray-50/50 border border-gray-200/60 rounded-xl p-5 hover:border-cyan-200/60 transition-all duration-300 hover:shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color.replace('from-', 'from-').replace('to-', 'to-')}/10 ${stat.color.replace('from-', 'to-')}/5`}>
                    <div className="text-gray-900/95">
                      {stat.icon}
                    </div>
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                </div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <div className="mt-3 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                    className={`h-full bg-gradient-to-r ${stat.color}`}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Header with Schedule Button */}
        <motion.div variants={fadeInUp} className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">Manage Meetings</h2>
              <p className="text-sm sm:text-base text-gray-500">Track and organize all your meetings</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/schedule")}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-md shadow-sm group"
            >
              <CalendarPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Schedule Meeting
            </motion.button>
          </div>
        </motion.div>

        {/* Filters Card */}
        <motion.div variants={fadeInUp} className="mb-8">
          <div className="bg-white border border-gray-200/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm overflow-hidden relative">
            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/5 to-cyan-600/3 rounded-full -translate-y-16 translate-x-16"></div>
            
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                <div className="flex items-center gap-3 mb-4 sm:mb-0">
                  <motion.div
                    whileHover={{ rotate: 10 }}
                    className="p-2.5 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100"
                  >
                    <Filter className="w-5 h-5 text-cyan-600" />
                  </motion.div>
                  <div>
                    <h3 className="font-medium text-gray-900 text-lg">Filter Meetings</h3>
                    <p className="text-sm text-gray-500">Narrow down your meeting list</p>
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClearFilters}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <motion.div
                    animate={{ rotate: 0 }}
                    whileHover={{ rotate: 180 }}
                    transition={{ duration: 0.3 }}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </motion.div>
                  Clear Filters
                </motion.button>
              </div>
              
              <MeetingFilters 
                filterType={filterType}
                setFilterType={setFilterType}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                handleClearFilters={handleClearFilters}
              />
            </div>
          </div>
        </motion.div>

        {/* Meetings List */}
        <motion.div variants={fadeInUp}>
          {meetings.length > 0 ? (
            <div className="bg-white border border-gray-200/80 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm">
              <MeetingsList meetings={meetings} />
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-to-b from-white to-gray-50/50 border border-gray-200/60 rounded-xl sm:rounded-2xl">
              <div className="inline-block p-4 rounded-full bg-gradient-to-br from-cyan-50 to-white border border-cyan-100 mb-4">
                <Calendar className="w-8 h-8 text-cyan-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">No meetings found</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                Try adjusting your filters or schedule a new meeting to get started
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/schedule")}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg font-medium text-sm transition-all duration-300 hover:shadow-md shadow-sm"
              >
                Schedule First Meeting
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Pagination - Enhanced */}
        {pagination.pages > 1 && (
          <motion.div 
            variants={fadeInUp}
            className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-gray-200/40"
          >
            <div className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-900">{meetings.length}</span> of{" "}
              <span className="font-medium text-gray-900">{pagination.total}</span> meetings
            </div>
            
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ x: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </motion.button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  let pageNum;
                  if (pagination.pages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.pages - 2) {
                    pageNum = pagination.pages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }

                  return (
                    <motion.button
                      key={pageNum}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-all duration-200 ${
                        pagination.page === pageNum
                          ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-sm"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {pageNum}
                    </motion.button>
                  );
                })}
              </div>

              <motion.button
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                Next
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Empty State Art - Minimal Visual */}
        {meetings.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="max-w-md mx-auto mt-8 mb-6"
          >
            <div className="text-center">
              <div className="relative inline-block mb-4">
                {/* Decorative Circles */}
                <div className="absolute -top-2 -left-2 w-3 sm:w-4 h-3 sm:h-4 rounded-full bg-cyan-500/20 animate-pulse"></div>
                <div className="absolute -bottom-2 -right-2 w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-cyan-600/20 animate-pulse delay-300"></div>

                {/* Main Circle */}
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-white to-gray-50 border border-gray-200/60 flex items-center justify-center">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg opacity-20"></div>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-gray-400 italic">
                Your meeting schedule is clear. Schedule one to get started.
              </p>
            </div>
          </motion.div>
        )}

        {/* Minimal Footer */}
        <motion.div
          variants={fadeInUp}
          className="pt-6 mt-6 border-t border-gray-200/40"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
                <p className="text-xs text-gray-400 font-medium">
                  Meetings Platform
                </p>
              </div>
              <div className="hidden sm:block w-px h-3 bg-gray-300"></div>
              <p className="text-xs text-gray-400">
                Page: <span className="text-cyan-600 font-medium">{pagination.page}</span> of{" "}
                <span className="text-cyan-600 font-medium">{pagination.pages}</span>
              </p>
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-2">
              <div className="hidden sm:block w-1 h-1 rounded-full bg-gray-300"></div>
              <span>
                Updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}