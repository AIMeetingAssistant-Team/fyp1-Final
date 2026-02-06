import { useState } from "react";
import { motion } from "framer-motion";
import { Link2, ArrowLeft, Video, AlertCircle, Users, Shield, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../utils/api";

export default function JoinMeeting() {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const extractMeetingIdFromLink = (url) => {
    if (!url) return null;

    const patterns = [
      /\/meetings\/([a-f0-9]{24})/,
      /\/video-meeting\/([a-f0-9]{24})/,
      /\/join-meeting\/([a-f0-9]{24})/,
      /meetingId=([a-f0-9]{24})/,
      /id=([a-f0-9]{24})/,
      /([a-f0-9]{24})/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }

    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];

    if (lastPart && lastPart.match(/^[a-f0-9]{24}$/)) {
      return lastPart;
    }

    return null;
  };

  const handleJoin = async () => {
    if (!link.trim()) {
      setError("Please enter a meeting link or ID");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      let meetingId = extractMeetingIdFromLink(link);

      if (!meetingId) {
        meetingId = link.trim();
        if (!meetingId.match(/^[a-f0-9]{24}$/)) {
          throw new Error("Invalid meeting link or ID format");
        }
      }

      const meetingRes = await apiRequest(
        `/meetings/${meetingId}`,
        'GET',
        null,
        token
      );

      if (!meetingRes.success) throw new Error(meetingRes.message || 'Meeting not found');

      const meeting = meetingRes.meeting;

      if (meeting.status === 'cancelled') {
        throw new Error("This meeting has been cancelled");
      }

      if (meeting.status === 'completed') {
        throw new Error("This meeting has already ended");
      }

      if (meeting.status === 'scheduled' && !meetingRes.isHost) {
        throw new Error("Waiting for host to start the meeting...");
      }

      navigate(`/video-meeting/${meetingId}`, {
        state: {
          meetingInfo: meeting,
          isHost: meetingRes.isHost || false
        }
      });

    } catch (err) {
      setError(err.message || 'Unable to join meeting. Please check the link.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/dashboard");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleJoin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header - Matching MeetingDetails style */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/60 px-4 sm:px-6 py-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="relative group"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <motion.div
                  className="hidden sm:block w-1 h-8 bg-gray-900/95 rounded-full origin-bottom"
                  whileHover={{ scaleY: 1.2 }}
                  transition={{ duration: 0.2 }}
                />

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
                  Join Meeting
                </h1>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ x: -2, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors group"
            >
              <motion.div
                className="p-1.5 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors"
                whileHover={{ rotate: -5 }}
              >
                <ArrowLeft className="w-4 h-4" />
              </motion.div>
              <span className="text-sm font-medium">Back to Dashboard</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Form */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-b from-white to-gray-50/50 border border-gray-200/80 rounded-xl sm:rounded-2xl p-6 shadow-sm"
            >
              {/* Card Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100">
                  <Video className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Join Video Meeting</h2>
                  <p className="text-sm text-gray-500">Connect with your team instantly</p>
                </div>
              </div>

              {/* Input Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Meeting Link or ID
                  </label>
                  <span className="text-xs text-gray-400">Paste or type</span>
                </div>

                <div className="relative group">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                    <Link2 size={18} className="text-gray-400 group-focus-within:text-cyan-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={link}
                    onChange={(e) => {
                      setLink(e.target.value);
                      setError("");
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="https://app.com/meetings/abc123..."
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-300/80 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition-all"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-start gap-3 text-red-600 text-sm bg-gradient-to-r from-red-50 to-white border border-red-100/60 rounded-xl p-4 mt-3"
                  >
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </div>

              {/* Examples */}
              <div className="mb-8">
                <p className="text-xs font-medium text-gray-500 mb-3">Valid formats:</p>
                <div className="space-y-3">
                  <div className="bg-gradient-to-b from-gray-50/50 to-white p-4 rounded-lg border border-gray-200/60">
                    <code className="text-xs text-gray-600 break-all">
                      https://app.com/video-meeting/507f1f77bcf86cd799439011
                    </code>
                  </div>
                  <div className="bg-gradient-to-b from-gray-50/50 to-white p-4 rounded-lg border border-gray-200/60">
                    <code className="text-xs text-gray-600">507f1f77bcf86cd799439011</code>
                  </div>
                </div>
              </div>

              {/* Join Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleJoin}
                disabled={loading || !link.trim()}
                className={`w-full py-3.5 px-4 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all ${loading || !link.trim()
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 active:shadow-sm'
                  }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Connecting to Meeting...</span>
                  </>
                ) : (
                  <>
                    <Video size={16} />
                    <span>Join Video Meeting Now</span>
                  </>
                )}
              </motion.button>

              {/* Quick Tips */}
              <div className="mt-6 p-4 bg-gradient-to-r from-cyan-50 to-white rounded-xl border border-cyan-100/60">
                <p className="text-xs text-cyan-700 font-medium mb-2">
                  Quick Tip
                </p>
                <p className="text-xs text-cyan-600">
                  You can paste the full meeting URL or just the meeting ID
                </p>
              </div>
            </motion.div>

            {/* Feature Cards - Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-b from-white to-gray-50/50 p-4 rounded-xl border border-gray-200/80"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 rounded-lg border border-cyan-100">
                    <Users size={14} className="text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Multi-Platform</h3>
                    <p className="text-xs text-gray-500">Join from any device</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600">Works on desktop, tablet, and mobile devices</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-b from-white to-gray-50/50 p-4 rounded-xl border border-gray-200/80"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 rounded-lg border border-cyan-100">
                    <Shield size={14} className="text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Secure & Encrypted</h3>
                    <p className="text-xs text-gray-500">End-to-end security</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600">Your meetings are protected with encryption</p>
              </motion.div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Instructions Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-b from-white to-gray-50/50 border border-gray-200/80 rounded-xl p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100">
                  <Zap className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">How to Join</h3>
                  <p className="text-sm text-gray-500">Quick steps</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    step: "1",
                    title: "Copy the Link",
                    description: "Get the meeting link from your invitation"
                  },
                  {
                    step: "2",
                    title: "Paste or Type",
                    description: "Enter it in the field on the left"
                  },
                  {
                    step: "3",
                    title: "Click Join",
                    description: "Enter the meeting room instantly"
                  }
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gradient-to-b from-gray-50/50 to-white rounded-lg border border-gray-200/60">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600 text-white text-xs font-semibold flex items-center justify-center">
                      {item.step}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-1">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Requirements Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-b from-white to-gray-50/50 border border-gray-200/80 rounded-xl p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Requirements</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-b from-gray-50/50 to-white rounded-lg border border-gray-200/60">
                  <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                  <span className="text-sm text-gray-700">Stable internet connection</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gradient-to-b from-gray-50/50 to-white rounded-lg border border-gray-200/60">
                  <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                  <span className="text-sm text-gray-700">Webcam & microphone</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gradient-to-b from-gray-50/50 to-white rounded-lg border border-gray-200/60">
                  <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                  <span className="text-sm text-gray-700">Modern web browser</span>
                </div>
              </div>
            </motion.div>

          </div>
        </div>

        {/* Footer Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 pt-6 border-t border-gray-200/40"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
              <p className="text-xs text-gray-400 font-medium">
                Join Meeting
              </p>
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-2">
              <div className="hidden sm:block w-1 h-1 rounded-full bg-gray-300"></div>
              <span>
                Ready to connect
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}