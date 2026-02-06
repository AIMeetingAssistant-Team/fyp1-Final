import { useState, useEffect } from "react";
import { CalendarDays, ArrowLeft } from "lucide-react";
import { apiRequest } from "../utils/api";
import MeetingForm from "../components/meetings/MeetingForm";
import { useNavigate } from "react-router-dom";
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

export default function ScheduleMeeting() {
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [meeting, setMeeting] = useState({
    title: "",
    agenda: "",
    description: "",
    meetingType: "live",
    timezone: "UTC",
    date: "",
    time: "",
    duration: 30,
    participants: [],
    isPrivate: false,
  });
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: "", text: "" }), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSubmit = async (formData) => {
    console.log(formData, "formData");
    const data = await apiRequest("/meetings", "POST", formData, token);
    if (data.success) {
      const sendInvite = await apiRequest(
        `/invites/meetings/${data.meeting._id}/invites`,
        "POST",
        { participantEmails: formData.emails },
        token
      );
      setLoading(false);

      setMessage({ type: "success", text: "Meeting scheduled successfully!" });
      setMeeting({
        title: "",
        description: "",
        meetingType: "live",
        date: "",
        time: "",
        duration: 30,
        participants: [],
        agenda: "",
        timezone: "UTC",
        isPrivate: false,
      });
      navigate(`/meetings/${data.meeting._id}`);
    } else {
      setMessage({ type: "error", text: data.message });
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gradient-to-b from-white to-gray-50 w-full"
    >
      {/* Header with Minimal Design - Enhanced */}
      <motion.div
        variants={containerVariants}
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
                  Schedule Meeting
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 sm:px-8 pt-8 pb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl">
                <CalendarDays className="text-cyan-600 w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-3xl font-bold text-gray-900">
                  Meeting Details                
                </h1>
                <p className="text-gray-500 text-sm sm:text-base mt-1 sm:mt-2">
                  Fill in the details below to create and schedule your meeting
                </p>
              </div>
            </div>
          </div>

          {/* Message Alert */}
          {message.text && (
            <div
              className={`mx-6 sm:mx-8 lg:mx-10 mt-6 sm:mt-8 px-4 py-3 rounded-lg border ${message.type === "error"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-green-50 border-green-200 text-green-700"
                } transition-all duration-300`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${message.type === "error" ? "bg-red-500" : "bg-green-500"}`} />
                <span className="text-sm font-medium">{message.text}</span>
              </div>
            </div>
          )}
          {/* Meeting Form */}
          <MeetingForm
            meeting={meeting}
            setMeeting={setMeeting}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/dashboard")}
            mode="create"
            loading={loading}
            setLoading={setLoading}
          />
        </div>
      </div>
    </motion.div>
  );
}