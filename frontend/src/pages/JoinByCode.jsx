import { useState } from "react";
import { motion } from "framer-motion";
import { Video, Users, Clock, Copy, ArrowRight, Shield, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../utils/api";

export default function JoinByCode() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [meetingInfo, setMeetingInfo] = useState(null);
  const [showTips, setShowTips] = useState(false);
  const navigate = useNavigate();

  // Handle code input with auto-format
  const handleCodeChange = (e) => {
    let value = e.target.value.toUpperCase();
    
    // Remove any non-alphanumeric characters
    value = value.replace(/[^A-Z0-9-]/g, '');
    
    // Auto-format as abc-defg-hij
    if (value.length > 3 && value[3] !== '-') {
      value = value.substring(0, 3) + '-' + value.substring(3);
    }
    if (value.length > 7 && value[7] !== '-') {
      value = value.substring(0, 7) + '-' + value.substring(7);
    }
    
    // Limit to 12 characters (3-4-3 format)
    value = value.substring(0, 12);
    
    setCode(value);
    setError("");
    
    // Clear meeting info if code changes
    if (meetingInfo) {
      setMeetingInfo(null);
    }
  };

  // Validate code format
  const validateCode = () => {
    const codePattern = /^[A-Z0-9]{3}-[A-Z0-9]{4}-[A-Z0-9]{3}$/;
    return codePattern.test(code);
  };

  // Fetch meeting info by code
  const fetchMeetingInfo = async () => {
    if (!validateCode()) {
      setError("Please enter a valid meeting code (format: abc-defg-hij)");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/signin', { state: { from: '/join' } });
        return;
      }

      const response = await apiRequest(`/meetings/code/${code}`, 'GET', null, token);
      
      if (response.success) {
        setMeetingInfo(response.meeting);
      } else {
        setError(response.message || "Meeting not found");
      }
    } catch (err) {
      console.error('Fetch meeting info error:', err);
      setError(err.message || "Failed to fetch meeting information");
    } finally {
      setLoading(false);
    }
  };

  // Join meeting
  const joinMeeting = async () => {
    if (!meetingInfo) {
      setError("Please fetch meeting information first");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Get ZEGO token
      const tokenRes = await apiRequest(
        `/zego/meetings/${meetingInfo._id}/token`, 
        'POST', 
        { role: 'participant' }, 
        token
      );
      
      if (!tokenRes.success) {
        throw new Error(tokenRes.message || 'Failed to get video token');
      }

      const roomId = meetingInfo._id.toString();
      
      // Navigate to video room
      navigate(`/video-room/${roomId}`, { 
        state: { 
          tokenData: tokenRes.tokenData,
          meetingInfo: meetingInfo,
          isHost: false
        } 
      });

    } catch (err) {
      console.error('Join meeting error:', err);
      setError(err.message || "Failed to join meeting");
      setLoading(false);
    }
  };

  // Copy code to clipboard
  const copyCode = () => {
    navigator.clipboard.writeText(code);
    
    // Show toast
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = 'Code copied to clipboard!';
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="border-b border-gray-200/60 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors group"
            >
              <div className="p-1.5 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors">
                <ArrowRight className="w-4 h-4 rotate-180" />
              </div>
              <span className="text-sm font-medium">Back</span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
                <p className="text-xs text-gray-400 font-medium">
                  Join Meeting
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 sm:px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-block p-4 rounded-2xl bg-gradient-to-br from-cyan-50 to-white border border-cyan-100 shadow-sm mb-6">
            <Video className="w-12 h-12 text-cyan-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Join a Meeting
          </h1>
          <p className="text-gray-600">
            Enter the meeting code shared by the host
          </p>
        </motion.div>

        {/* Code Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {/* Code Input */}
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl blur opacity-20"></div>
            <div className="relative bg-white border border-gray-200/80 rounded-xl p-2">
              <div className="flex items-center">
                <div className="flex-1">
                  <input
                    type="text"
                    value={code}
                    onChange={handleCodeChange}
                    placeholder="Enter meeting code (abc-defg-hij)"
                    className="w-full px-4 py-4 bg-transparent text-2xl font-bold text-center tracking-widest placeholder-gray-400 focus:outline-none"
                    maxLength={12}
                  />
                </div>
                {code && (
                  <button
                    onClick={copyCode}
                    className="p-3 text-gray-400 hover:text-cyan-600 transition-colors"
                    title="Copy code"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Code Format Hint */}
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-500">
                Format: <span className="font-mono font-semibold">abc-defg-hij</span>
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-sm"
            >
              ⚠️ {error}
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={fetchMeetingInfo}
              disabled={!code || loading || validateCode() === false}
              className={`px-6 py-4 rounded-xl font-medium transition-all ${!code || loading || validateCode() === false
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:shadow-md'
                }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Checking...</span>
                </div>
              ) : (
                'Check Meeting'
              )}
            </button>
            
            <button
              onClick={() => setShowTips(!showTips)}
              className="px-6 py-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Need Help?
            </button>
          </div>

          {/* Meeting Info Card */}
          {meetingInfo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-b from-white to-gray-50/50 border border-gray-200/60 rounded-xl p-6 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg mb-1">
                    {meetingInfo.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Hosted by {meetingInfo.host?.name}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${meetingInfo.status === 'in-progress'
                    ? 'bg-green-100 text-green-700'
                    : meetingInfo.status === 'scheduled'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                  }`}>
                  {meetingInfo.status === 'in-progress' ? 'Live Now' : meetingInfo.status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {new Date(meetingInfo.startTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {meetingInfo.participants?.length || 0} participants
                  </span>
                </div>
              </div>

              <button
                onClick={joinMeeting}
                disabled={loading || meetingInfo.status === 'cancelled' || meetingInfo.status === 'completed'}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${loading || meetingInfo.status === 'cancelled' || meetingInfo.status === 'completed'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:shadow-md'
                  }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Joining...</span>
                  </div>
                ) : meetingInfo.status === 'cancelled' ? (
                  'Meeting Cancelled'
                ) : meetingInfo.status === 'completed' ? (
                  'Meeting Ended'
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Video className="w-5 h-5" />
                    <span>Join Meeting</span>
                  </div>
                )}
              </button>
            </motion.div>
          )}

          {/* Help Tips */}
          {showTips && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-gradient-to-b from-cyan-50 to-white border border-cyan-100 rounded-xl p-5"
            >
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-600" />
                How to join a meeting
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5"></div>
                  <span>Get the meeting code from the host (format: <code className="font-mono">abc-defg-hij</code>)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5"></div>
                  <span>Enter the code exactly as provided</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5"></div>
                  <span>Click "Check Meeting" to verify</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5"></div>
                  <span>Join when the meeting information appears</span>
                </li>
              </ul>
              
              <div className="mt-4 pt-4 border-t border-cyan-100">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Shield className="w-4 h-4" />
                  <span>All meetings are secured with end-to-end encryption</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Quick Stats */}
          <div className="text-center pt-6 border-t border-gray-200/40">
            <p className="text-xs text-gray-400">
              Secure • Encrypted • No installation required
            </p>
          </div>
        </motion.div>
      </div>

      {/* Toast Styles */}
      <style jsx>{`
        .copy-toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%) translateY(100px);
          background: #06b6d4;
          color: white;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 10px 25px rgba(6, 182, 212, 0.3);
          z-index: 1000;
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
          opacity: 0;
        }
        
        .copy-toast.show {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      `}</style>
    </div>
  );
}