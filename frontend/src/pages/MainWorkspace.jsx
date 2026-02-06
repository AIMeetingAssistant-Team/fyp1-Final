import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Video,
  Mic,
  Upload,
  ChevronRight,
  ArrowLeft,
  Clock,
  Zap,
  Sparkles,
  Target,
  Menu,
  X
} from "lucide-react";

// Clean animation variants
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
    y: -3,
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

export default function MainWorkspace() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const quickActions = [
    {
      id: 1,
      title: "Start New Meeting",
      description: "Create, join, or schedule meetings with AI assistance",
      icon: <Video className="w-5 h-5" />,
      accentColor: "border-cyan-500",
      iconColor: "text-cyan-600",
      bgColor: "bg-gradient-to-br from-white to-cyan-50",
      path: "/dashboard",
      gradient: "from-cyan-500/10 to-cyan-600/5"
    },
    {
      id: 2,
      title: "Real-Time Recording",
      description: "Record meetings with live transcription & insights",
      icon: <Mic className="w-5 h-5" />,
      accentColor: "border-cyan-500",
      iconColor: "text-cyan-600",
      bgColor: "bg-gradient-to-br from-white to-cyan-50",
      path: "/realtime-recording",
      gradient: "from-cyan-500/10 to-cyan-600/5"
    },
    {
      id: 3,
      title: "Upload Recording",
      description: "Upload audio/video recordings for AI analysis",
      icon: <Upload className="w-5 h-5" />,
      accentColor: "border-cyan-500",
      iconColor: "text-cyan-600",
      bgColor: "bg-gradient-to-br from-white to-cyan-50",
      path: "/upload-recordings",
      gradient: "from-cyan-500/10 to-cyan-600/5"
    }
  ];

  const tips = [
    {
      id: 1,
      icon: <Zap className="w-4 h-4" />,
      title: "Quick Start",
      description: "Use keyboard shortcuts for faster navigation through the workspace"
    },
    {
      id: 2,
      icon: <Sparkles className="w-4 h-4" />,
      title: "AI Features",
      description: "Enable AI suggestions to get automated meeting summaries and action items"
    },
    {
      id: 3,
      icon: <Target className="w-4 h-4" />,
      title: "Focus Mode",
      description: "Use the distraction-free mode during important meetings for better concentration"
    }
  ];

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gradient-to-b from-white to-gray-50 w-full"
    >
      {/* Header with Minimal Design - Enhanced */}
      <motion.div
        variants={fadeInUp}
        className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200/60 px-4 sm:px-6 md:px-8 lg:px-12 py-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Workspace Title with Vertical Line and Glow Effect */}
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
                
                <h1 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent relative z-10">
                  Workspace
                </h1>
              </div>
            </motion.div>
          </div>
          
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

      {/* Main Content - Responsive Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Quick Actions - Responsive Grid */}
        <motion.div variants={fadeInUp} className="mb-8 sm:mb-12">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 mb-2 sm:mb-3">
              Get Started
            </h2>
            <p className="text-gray-500 max-w-md mx-auto text-sm sm:text-base px-4">
              Choose your preferred way to begin your productive session
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-7xl mx-auto">
            {quickActions.map((action, index) => (
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
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-300"></div>

                <motion.div
                  variants={cardHover}
                  onClick={() => navigate(action.path)}
                  className={`relative ${action.bgColor} border border-gray-200/80 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-all duration-300 hover:border-cyan-400/50 group-hover:border-cyan-400/50 backdrop-blur-sm cursor-pointer`}
                >
                  {/* Gradient Border Top */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-t-xl"></div>

                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4 sm:mb-5">
                      <motion.div
                        variants={pulseAnimation}
                        className={`p-2 sm:p-3 rounded-xl bg-gradient-to-br ${action.gradient} ${action.iconColor} backdrop-blur-sm border border-cyan-200/30`}
                      >
                        {action.icon}
                      </motion.div>
                      <motion.div
                        initial={{ x: 0 }}
                        whileHover={{ x: 3 }}
                        className="text-gray-300 group-hover:text-cyan-600 transition-colors mt-1"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </motion.div>
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
                      <div className="text-xs font-medium text-cyan-600 flex items-center gap-1">
                        <span>Start session</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Workspace Tips - Responsive Design */}
        <motion.div variants={fadeInUp} className="max-w-7xl mx-auto">
          <div className="bg-white border border-gray-200/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8">
              <div className="flex items-center gap-3 mb-4 sm:mb-0">
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
                  className="p-2 sm:p-2.5 bg-gradient-to-br from-cyan-50 to-white rounded-lg sm:rounded-xl border border-cyan-100"
                >
                  <Clock className="w-4 sm:w-5 h-4 sm:h-5 text-cyan-600" />
                </motion.div>
                <div>
                  <h3 className="font-medium text-gray-900 text-base sm:text-lg">
                    Productivity Tips
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Enhance your workflow efficiency
                  </p>
                </div>
              </div>
              <motion.div
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
                className="text-gray-300 self-end sm:self-center"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-50 flex items-center justify-center">
                  <span className="text-xs font-semibold text-gray-400">?</span>
                </div>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {tips.map((tip, index) => (
                <motion.div
                  key={tip.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ y: -3 }}
                  className="group"
                >
                  <div className="bg-gradient-to-b from-gray-50 to-white border border-gray-200/60 rounded-xl p-4 sm:p-5 hover:border-cyan-200/60 transition-all duration-300 hover:shadow-md">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 ${tip.iconColor}`}>
                        {tip.icon}
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                          {tip.title}
                        </h4>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      {tip.description}
                    </p>

                    {/* Hover Indicator */}
                    <div className="mt-3 sm:mt-4 pt-3 border-t border-gray-100 group-hover:border-cyan-100 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <span className="text-xs text-gray-400 group-hover:text-cyan-600 transition-colors">
                          Try this tip →
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Empty State Art - Responsive */}
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

            <p className="text-xs sm:text-sm text-gray-400 italic px-4">
              Your workspace is ready. Begin with any action above.
            </p>
          </div>
        </motion.div>

        {/* Minimal Footer - Responsive */}
        <motion.div
          variants={fadeInUp}
          className="pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-gray-200/40"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
                <p className="text-xs text-gray-400 font-medium">
                  Workspace
                </p>
              </div>
              <div className="hidden sm:block w-px h-3 bg-gray-300"></div>
              <p className="text-xs text-gray-400">
                Status: <span className="text-cyan-600 font-medium">Active</span>
              </p>
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-2">
              <div className="hidden sm:block w-1 h-1 rounded-full bg-gray-300"></div>
              <span>
                {new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}