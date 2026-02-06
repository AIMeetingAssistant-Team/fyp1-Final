import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../utils/api";
import RecordingForm from "../components/realtimeRecorder/RecordingForm";
import AudioRecorder from "../components/realtimeRecorder/AudioRecorder";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

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

export default function RealtimeRecorder() {
  const navigate = useNavigate();
  const { meetingId: paramMeetingId } = useParams();
  const token = localStorage.getItem("token");

  const [step, setStep] = useState(paramMeetingId ? "recorder" : "form");
  const [meetingData, setMeetingData] = useState(null);
  const [meetingId, setMeetingId] = useState(paramMeetingId || null);
  const [recordings, setRecordings] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);

  // Load meeting + recordings
  useEffect(() => {
    if (!paramMeetingId) return;

    (async () => {
      const meetingRes = await apiRequest(`/meetings/${paramMeetingId}`, "GET", null, token);
      const recRes = await apiRequest(`/recordings/${paramMeetingId}/all`, "GET", null, token);

      if (meetingRes.success) setMeetingData(meetingRes.meeting);
      if (recRes.success) setRecordings(recRes.recordings);
    })();
  }, [paramMeetingId]);

  const handleRecordingSaved = () => {
    // Show saving state briefly before navigation
    setIsSaving(true);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setSaveProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          
          // After showing 100%, navigate to meeting details
          setTimeout(() => {
            navigate(`/meetings/${meetingId}`);
          }, 500);
          
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-white w-full"
    >
      {/* Header */}
      <motion.div
        variants={fadeInUp}
        className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm px-4 sm:px-6 md:px-8 py-4"
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-gray-900/95 rounded-full hidden sm:block" />
            <h1 className="text-base sm:text-lg font-semibold text-gray-900">
              Real-Time Recording
            </h1>
          </div>

          <motion.button
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-900 hover:text-cyan-600 transition-colors duration-200 group"
          >
            <div className="p-1.5 rounded-lg bg-gray-50 group-hover:bg-cyan-50 transition-colors duration-200">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium hidden sm:inline">Back</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 rounded-lg border px-4 py-3 ${message.type === "error"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-green-50 border-green-200 text-green-700"
              }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${message.type === "error" ? "bg-red-500" : "bg-green-500"}`} />
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          </motion.div>
        )}

        {/* Saving Progress Overlay */}
        {isSaving && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl p-6 sm:p-8 max-w-md w-full mx-4"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-cyan-600 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Saving Recording</h3>
                <p className="text-gray-600 mb-4">Please wait while your recording is being saved...</p>
                
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-500 mb-2">
                    <span>Uploading</span>
                    <span>{saveProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-cyan-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${saveProgress}%` }}
                    ></div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-400">You will be redirected to the meeting page shortly</p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Meeting Details Card - Always Visible */}
        {meetingData && (
          <div className="mb-6 sm:mb-8">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Meeting Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Title</p>
                  <p className="font-medium text-gray-900">{meetingData.title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Agenda</p>
                  <p className="font-medium text-gray-900">{meetingData.agenda || "No agenda specified"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Description</p>
                  <p className="font-medium text-gray-900 line-clamp-2">{meetingData.description || "No description"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <motion.div variants={fadeInUp}>
          {step === "form" && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <RecordingForm
                onCreated={(meeting) => {
                  setMeetingData(meeting);
                  setMeetingId(meeting._id);
                  setStep("recorder");
                }}
                onCancel={() => navigate("/workspace")}
              />
            </div>
          )}

          {step === "recorder" && meetingData && (
            <AudioRecorder
              meeting={meetingData}
              meetingId={meetingId}
              recordings={recordings}
              setRecordings={setRecordings}
              onFinish={handleRecordingSaved}
              setMessage={setMessage}
            />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}