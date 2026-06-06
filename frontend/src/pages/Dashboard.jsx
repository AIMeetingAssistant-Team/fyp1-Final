import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Video, CalendarDays, Link2, ArrowLeft, Clock, Users, Shield, Zap, Sparkles, Target, Copy, Share2 } from "lucide-react";
import { apiRequest } from '../utils/api';
import { useState } from "react";

// Clean animation variants matching workspace
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

const cardHover = {
  initial: { y: 0 },
  hover: {
    y: -6,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  }
};

const pulseAnimation = {
  initial: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [meetingCreated, setMeetingCreated] = useState(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [tokenData, setTokenData] = useState(null);

  const createMeeting = async () => {
    try {
      setCreatingMeeting(true);
      setMeetingCreated(null);
      setTokenData(null);
      
      const token = localStorage.getItem('token');
      
      // Create instant meeting
      const createRes = await apiRequest('/meetings/instant', 'POST', {
        title: `Instant Meeting - ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
      }, token);
      
      if (!createRes.success) throw new Error(createRes.message || 'Failed to create meeting');

      const meeting = createRes.meeting;
      
      // Generate ZEGO token but don't navigate yet
      const tokenRes = await apiRequest(`/livekit/meetings/${meeting._id}/token`, 'POST', { role: 'host' }, token);
      
      // Store meeting info for sharing and token data
      setMeetingCreated({
        meetingCode: meeting.meetingCode,
        shareableLink: meeting.shareableLink,
        meetingId: meeting._id,
        title: meeting.title,
        host: meeting.host
      });
      
      setTokenData(tokenRes);

    } catch (err) {
      console.error('Create meeting error:', err);
      alert(err.message || 'Error creating meeting');
    } finally {
      setCreatingMeeting(false);
    }
  };

  // Function to join the meeting when user clicks "Join Now"
  const joinMeetingNow = () => {
    if (!meetingCreated || !tokenData) {
      alert('Meeting information is not ready yet. Please wait.');
      return;
    }
    
    const roomId = meetingCreated.meetingId.toString();
    
    // Navigate to video room
    navigate(`/video-meeting/${roomId}`, { 
      state: { 
        tokenData: tokenData,
        meetingInfo: meetingCreated 
      } 
    });
    
    // Close the modal
    setMeetingCreated(null);
    setTokenData(null);
  };

  // Copy meeting link function
  const copyMeetingLink = async () => {
    if (!meetingCreated) return;
    
    try {
      await navigator.clipboard.writeText(meetingCreated.shareableLink);
      setCopyStatus('copied');
      
      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg transform translate-y-0 opacity-0 transition-all duration-300 z-50';
      toast.textContent = 'Meeting link copied to clipboard!';
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.classList.add('opacity-100');
      }, 10);
      
      setTimeout(() => {
        toast.classList.remove('opacity-100');
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
      
      setTimeout(() => setCopyStatus(''), 2000);
      
    } catch (err) {
      setCopyStatus('error');
      console.error('Copy failed:', err);
    }
  };

  // Share meeting function
  const shareMeeting = async () => {
    if (!meetingCreated) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my meeting: ${meetingCreated.title}`,
          text: `Join my instant meeting. Meeting code: ${meetingCreated.meetingCode}`,
          url: meetingCreated.shareableLink,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      // Fallback to copy
      copyMeetingLink();
    }
  };

  const actions = [
    {
      id: 1,
      title: "Instant Meeting",
      description: "Start a new meeting immediately",
      icon: <Video className="w-5 h-5" />,
      accentColor: "border-cyan-500",
      iconColor: "text-cyan-600",
      bgColor: "bg-gradient-to-br from-white to-cyan-50",
      path: "/dashboard",
      gradient: "from-cyan-500/10 to-cyan-600/5",
      onClick: createMeeting,
      loading: creatingMeeting,
      cta: creatingMeeting ? "Creating..." : "Start Meeting"
    },
    {
      id: 2,
      title: "Schedule Meeting",
      description: "Plan your meeting ahead of time",
      icon: <CalendarDays className="w-5 h-5" />,
      accentColor: "border-gray-200",
      iconColor: "text-gray-600",
      bgColor: "bg-gradient-to-br from-white to-gray-50",
      gradient: "from-gray-500/10 to-gray-600/5",
      onClick: () => navigate("/schedule"),
      cta: "Schedule"
    },
    {
      id: 3,
      title: "Join Meeting",
      description: "Join with an existing code",
      icon: <Link2 className="w-5 h-5" />,
      accentColor: "border-gray-200",
      iconColor: "text-gray-600",
      bgColor: "bg-gradient-to-br from-white to-gray-50",
      gradient: "from-gray-500/10 to-gray-600/5",
      onClick: () => navigate("/join"),
      cta: "Join"
    },
  ];

  const features = [
    {
      id: 1,
      icon: <Clock className="w-4 h-4" />,
      text: "No time limits",
      color: "text-cyan-600",
      gradient: "from-cyan-500/20 to-cyan-600/10"
    },
    {
      id: 2,
      icon: <Users className="w-4 h-4" />,
      text: "Up to 100 participants",
      color: "text-cyan-600",
      gradient: "from-cyan-500/20 to-cyan-600/10"
    },
    {
      id: 3,
      icon: <Shield className="w-4 h-4" />,
      text: "End-to-end encrypted",
      color: "text-cyan-600",
      gradient: "from-cyan-500/20 to-cyan-600/10"
    }
  ];

  const meetingTips = [
    {
      id: 1,
      icon: <Zap className="w-4 h-4" />,
      title: "Quick Start",
      description: "Start meetings instantly with just a single click"
    },
    {
      id: 2,
      icon: <Sparkles className="w-4 h-4" />,
      title: "AI Assistance",
      description: "Get automated meeting summaries and action items"
    },
    {
      id: 3,
      icon: <Target className="w-4 h-4" />,
      title: "Smart Scheduling",
      description: "Find optimal meeting times with smart suggestions"
    }
  ];

  return (
    <>
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
                    Meeting Dashboard
                  </h1>
                </div>
              </motion.div>
            </div>
            
            {/* Right side: Back button only */}
            <motion.button
              whileHover={{ x: -2, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <motion.div variants={fadeInUp} className="text-center mb-10 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-3">
              Start or join a meeting
            </h2>
            <p className="text-sm sm:text-base text-gray-500 max-w-md mx-auto">
              Choose how you'd like to begin your meeting session
            </p>
          </motion.div>

          {/* Feature Highlights - Responsive Grid */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8 sm:mb-10"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-gray-50 to-white border border-gray-200/80 rounded-full"
              >
                <div className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-br ${feature.gradient}`}>
                  <div className={feature.color}>
                    {feature.icon}
                  </div>
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-700">
                  {feature.text}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* Action Cards - Responsive Grid */}
          <motion.div variants={fadeInUp} className="mb-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
              {actions.map((action, index) => (
                <motion.div
                  key={action.id}
                  variants={fadeInUp}
                  custom={index}
                  whileHover="hover"
                  initial="initial"
                  animate="visible"
                  className="group relative"
                >
                  {/* Glow Effect */}
                  <div className={`absolute -inset-0.5 bg-gradient-to-r ${action.id === 1 ? 'from-cyan-500 to-cyan-600' : 'from-gray-500 to-gray-600'} rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-300`}></div>

                  <motion.div
                    variants={cardHover}
                    onClick={action.onClick}
                    disabled={action.loading}
                    className={`relative ${action.bgColor} border border-gray-200/80 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-all duration-300 hover:border-cyan-400/50 group-hover:border-cyan-400/50 backdrop-blur-sm cursor-pointer ${action.loading ? 'cursor-wait' : ''}`}
                  >
                    {/* Gradient Border Top */}
                    <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${action.id === 1 ? 'from-cyan-500 to-cyan-600' : 'from-gray-500 to-gray-600'} rounded-t-xl`}></div>

                    <div className="flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4 sm:mb-5">
                        <motion.div
                          variants={pulseAnimation}
                          className={`p-2 sm:p-3 rounded-xl bg-gradient-to-br ${action.gradient} ${action.iconColor} backdrop-blur-sm border ${action.id === 1 ? 'border-cyan-200/30' : 'border-gray-200/30'}`}
                        >
                          {action.icon}
                        </motion.div>
                        
                        {/* Loading Animation */}
                        {action.loading && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center space-x-1 mt-1"
                          >
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                animate={{ 
                                  y: [0, -6, 0],
                                  transition: {
                                    duration: 0.6,
                                    repeat: Infinity,
                                    delay: i * 0.1
                                  }
                                }}
                                className="w-1.5 h-1.5 bg-cyan-600 rounded-full"
                              />
                            ))}
                          </motion.div>
                        )}
                        
                        {!action.loading && (
                          <motion.div
                            initial={{ x: 0 }}
                            whileHover={{ x: 3 }}
                            className={`${action.id === 1 ? 'text-cyan-600' : 'text-gray-300'} group-hover:text-cyan-600 transition-colors mt-1`}
                          >
                            <ArrowLeft className="w-4 h-4 rotate-180" />
                          </motion.div>
                        )}
                      </div>

                      <div className="flex-grow">
                        <h3 className="font-medium text-gray-900 text-base sm:text-lg mb-2">
                          {action.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-3 sm:mb-4">
                          {action.description}
                        </p>
                      </div>

                      <div className="pt-3 sm:pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-medium ${action.id === 1 ? 'text-cyan-600' : 'text-gray-600'} group-hover:text-cyan-600 transition-colors`}>
                            {action.cta}
                          </span>
                          {!action.loading && (
                            <motion.div
                              animate={{ x: 0 }}
                              whileHover={{ x: 2 }}
                              className={`${action.id === 1 ? 'text-cyan-600' : 'text-gray-400'} group-hover:text-cyan-600 transition-colors`}
                            >
                              <ArrowLeft className="w-3 h-3 rotate-180" />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Enhanced Meeting Best Practices Section */}
          <motion.div variants={fadeInUp} className="max-w-6xl mx-auto mb-8">
            <div className="bg-white border border-gray-200/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm overflow-hidden relative">
              
              {/* Background Decorative Elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/5 to-cyan-600/3 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-cyan-500/3 to-cyan-600/2 rounded-full translate-y-12 -translate-x-12"></div>
              
              <div className="relative z-10">
                {/* Section Header with Enhanced Typography */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 sm:mb-10">
                  <div className="mb-4 sm:mb-0">
                    <motion.div
                      animate={{
                        rotate: [0, 10, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 3,
                        ease: "easeInOut"
                      }}
                      className="inline-block p-3 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100 shadow-sm mb-4"
                    >
                      <Shield className="w-5 h-5 text-cyan-600" />
                    </motion.div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-6 bg-gradient-to-b from-cyan-500 to-cyan-600 rounded-full"></div>
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight">
                          Meeting Excellence Guide
                        </h3>
                      </div>
                      
                      <p className="text-sm text-gray-500 max-w-2xl">
                        Proven strategies and best practices to make every meeting 
                        <span className="text-cyan-600 font-medium"> productive, efficient, and effective</span>
                      </p>
                    </div>
                  </div>
                  
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 180 }}
                    transition={{ duration: 0.3 }}
                    className="self-start sm:self-center"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-50 to-white border border-gray-200/60 flex items-center justify-center shadow-xs">
                      <span className="text-xs font-semibold text-gray-400">i</span>
                    </div>
                  </motion.div>
                </div>

                {/* Tips Grid with Enhanced Card Design */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {meetingTips.map((tip, index) => (
                    <motion.div
                      key={tip.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      whileHover={{ y: -4 }}
                      className="group relative"
                    >
                      {/* Card Glow Effect */}
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl blur opacity-0 group-hover:opacity-10 transition duration-300"></div>
                      
                      <div className="relative bg-gradient-to-b from-white to-gray-50/50 border border-gray-200/60 rounded-xl p-5 hover:border-cyan-200/60 transition-all duration-300 hover:shadow-md backdrop-blur-sm">
                        
                        {/* Number Badge */}
                        <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-md">
                          <span className="text-xs font-bold text-white">{index + 1}</span>
                        </div>
                        
                        {/* Icon with Gradient Background */}
                        <div className="flex items-start gap-3 mb-4">
                          <div className={`p-3 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-200/30`}>
                            {tip.icon}
                          </div>
                          
                          {/* Tip Title with Improved Typography */}
                          <div className="flex-grow">
                            <h4 className="font-semibold text-gray-900 text-base mb-1 tracking-tight">
                              {tip.title}
                            </h4>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-px bg-gradient-to-r from-cyan-500 to-transparent"></div>
                              <span className="text-xs text-cyan-600 font-medium uppercase tracking-wider">
                                Best Practice
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Description with Better Typography */}
                        <p className="text-sm text-gray-600 leading-relaxed mb-4 pl-1">
                          {tip.description}
                        </p>

                        {/* Action Section with Subtle Indicator */}
                        <div className="mt-4 pt-4 border-t border-gray-100 group-hover:border-cyan-100 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <span className="text-xs text-gray-400 group-hover:text-cyan-600 transition-colors font-medium">
                                Apply this tip
                              </span>
                            </div>
                            
                            <motion.div
                              initial={{ x: 0 }}
                              whileHover={{ x: 4 }}
                              transition={{ duration: 0.2 }}
                              className="text-gray-300 group-hover:text-cyan-600 transition-colors"
                            >
                              <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                            </motion.div>
                          </div>
                          
                          {/* Progress Indicator Bar */}
                          <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: "0%" }}
                              whileHover={{ width: "100%" }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

              </div>
            </div>
          </motion.div>

          {/* Empty State Art - Minimal Visual matching workspace */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="max-w-md mx-auto mt-8 sm:mt-12 mb-6 sm:mb-8"
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
                Ready to start your meeting? Choose an option above.
              </p>
            </div>
          </motion.div>

          {/* Minimal Footer matching workspace */}
          <motion.div
            variants={fadeInUp}
            className="pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-gray-200/40"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
                  <p className="text-xs text-gray-400 font-medium">
                    Meeting Platform
                  </p>
                </div>
                <div className="hidden sm:block w-px h-3 bg-gray-300"></div>
                <p className="text-xs text-gray-400">
                  Status: <span className="text-cyan-600 font-medium">Online</span>
                </p>
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-2">
                <div className="hidden sm:block w-1 h-1 rounded-full bg-gray-300"></div>
                <span>
                  Last sync: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Meeting Created Modal */}
      {meetingCreated && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setMeetingCreated(null)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <Video className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Meeting Created!</h3>
              <p className="text-gray-600">Share this link with participants</p>
            </div>

            <div className="space-y-4">
              {/* Meeting Code */}
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Meeting Code</span>
                  <span className="text-xs text-gray-500">Share this code</span>
                </div>
                <div className="flex items-center justify-between">
                  <code className="text-2xl font-bold text-gray-900 tracking-wider">
                    {meetingCreated.meetingCode}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(meetingCreated.meetingCode)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Copy code"
                  >
                    <Copy className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Shareable Link */}
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Shareable Link</span>
                  <span className="text-xs text-gray-500">Click to copy</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={meetingCreated.shareableLink}
                    className="flex-1 bg-transparent border-none text-sm text-gray-600 truncate outline-none"
                  />
                  <button
                    onClick={copyMeetingLink}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Copy link"
                  >
                    {copyStatus === 'copied' ? (
                      <span className="text-green-600 text-sm">✓</span>
                    ) : (
                      <Copy className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  onClick={shareMeeting}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg font-medium hover:shadow-md transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  Share Meeting
                </button>
                <button
                  onClick={joinMeetingNow}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-cyan-600 text-cyan-600 rounded-lg font-medium hover:bg-cyan-50 transition-colors"
                >
                  <Video className="w-4 h-4" />
                  Join Now
                </button>
              </div>

              {/* Quick Tips */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">📝 Quick Tips:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Share the meeting code or link with participants</li>
                  <li>• Participants can join without creating an account</li>
                  <li>• Meeting will expire in 1 hour</li>
                  <li>• You can extend the meeting anytime</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setMeetingCreated(null)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ✕
            </button>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}