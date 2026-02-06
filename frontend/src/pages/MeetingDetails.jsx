import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiRequest } from "../utils/api";
import MeetingForm from "../components/meetings/MeetingForm";
import ParticipantsSection from "../components/meetings/ParticipantsSection";
import { CalendarDays, Clock, Trash2, Pencil, ArrowLeft, Users, FileText, Video, Tag, Brain, Shield, Globe, UserCircle, Calendar } from "lucide-react";
import Modal from "../components/layout/Modal";
import DocumentsSection from "../components/meetings/DocumentsSection";
import JoinMeetingSection from "../components/meetings/JoinMeetingSection";
import RecordingSection from "../components/meetings/RecordingSection";
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

const slideIn = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

export default function MeetingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [meetingData, setMeetingData] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [participantId, setParticipantId] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const showMessage = (type, text, duration = 5000) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, duration);
  };

  const fetchMeeting = async () => {
    setLoading(true);
    const data = await apiRequest(`/meetings/${id}`, "GET", null, token);
    if (data.success) {
      const m = data.meeting;
      const now = new Date();
      const meetingStart = new Date(m.startTime);

      setSelected({
        ...m,
        canEdit: data.isHost && meetingStart > now,
        isHost: data.isHost,
      });

      setMeetingData({
        title: m.title,
        description: m.description,
        date: m.startTime.slice(0, 10),
        time: m.startTime.slice(11, 16),
        duration: Math.round((new Date(m.endTime) - new Date(m.startTime)) / 60000),
        agenda: m.agenda,
        tags: Array.isArray(m.tags) ? m.tags.join(",") : m.tags || "",
        timezone: m.timezone,
        isPrivate: m.isPrivate,
        meetingType: m.meetingType,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMeeting();
  }, []);

  const updateMeeting = async (updated) => {
    const data = await apiRequest(`/meetings/${id}`, "PUT", updated, token);
    if (data.success) {
      setEditMode(false);
      setShowEditModal(false);
      fetchMeeting();
      showMessage("success", "Meeting updated successfully");
    }
  };

  const deleteMeeting = async () => {
    const data = await apiRequest(`/meetings/${id}`, "DELETE", null, token);
    if (data.success) {
      setShowDeleteModal(false);
      navigate("/meetings");
    }
  };

  const updateStatus = async (status) => {
    const data = await apiRequest(`/meetings/${id}/status`, "PATCH", { status }, token);
    if (data.success) fetchMeeting();
  };

  const addParticipant = async () => {
    if (!participantId) return;

    const email = participantId.trim().toLowerCase();

    const exists = selected.participants.some(
      (p) => p.user.email.toLowerCase() === email
    );
    if (exists) {
      showMessage("error", "Participant is already added.");
      return;
    }

    const data = await apiRequest(`/meetings/${id}/participants`, "POST", { email }, token);

    if (data.success) {
      setParticipantId("");
      fetchMeeting();
      showMessage("success", data.message || "Participant added successfully.");
    } else {
      showMessage("error", data.message || "Failed to add participant.");
    }
  };

  const removeParticipant = async (pid) => {
    const data = await apiRequest(`/meetings/${id}/participants/${pid}`, "DELETE", null, token);
    if (data.success) {
      fetchMeeting();
      showMessage("success", data.message || "Participant removed successfully.");
    } else {
      showMessage("error", data.message || "Failed to remove participant.");
    }
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block mb-4">
            <div className="w-12 h-12 border-3 border-cyan-200 border-t-cyan-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-cyan-600 animate-pulse" />
            </div>
          </div>
          <p className="text-sm text-gray-500">Loading meeting details...</p>
        </div>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-white to-gray-50 border border-gray-200/60 flex items-center justify-center">
            <CalendarDays className="w-8 h-8 text-cyan-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Meeting Not Found</h2>
          <p className="text-gray-600 mb-6">The requested meeting could not be found.</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/meetings")}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-md"
          >
            Back to Meetings
          </motion.button>
        </motion.div>
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
            <motion.button
              whileHover={{ x: -2, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/meetings")}
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
            
            {/* Vertical Line Separator */}
            <div className="hidden sm:block w-px h-6 bg-gray-300/60"></div>
            
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
                  Meeting Details
                </h1>
              </div>
            </motion.div>
          </div>
          
          <div className="flex items-center gap-3">
            {selected.isHost && (
              <div className="px-3 py-1 bg-gradient-to-r from-cyan-500/10 to-cyan-600/5 border border-cyan-200/30 text-cyan-600 rounded-full text-sm font-medium">
                Host
              </div>
            )}
            <div className={`px-3 py-1 border rounded-full text-sm font-medium ${
              selected.status === 'scheduled' 
                ? 'bg-gradient-to-r from-blue-500/10 to-blue-600/5 border-blue-200/30 text-blue-600'
                : selected.status === 'in-progress'
                ? 'bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border-yellow-200/30 text-yellow-600'
                : selected.status === 'completed'
                ? 'bg-gradient-to-r from-green-500/10 to-green-600/5 border-green-200/30 text-green-600'
                : 'bg-gradient-to-r from-gray-500/10 to-gray-600/5 border-gray-200/30 text-gray-600'
            }`}>
              {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message Alert */}
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-xl border ${message.type === "error"
              ? "bg-gradient-to-r from-red-50 to-white border-red-100/60 text-red-700"
              : "bg-gradient-to-r from-cyan-50 to-white border-cyan-100/60 text-cyan-700"
              }`}
          >
            <p className="text-sm font-medium flex items-center gap-2">
              {message.type === "error" ? "⚠️" : "✅"} {message.text}
            </p>
          </motion.div>
        )}

        {/* Meeting Header Card */}
        <motion.div variants={fadeInUp} className="mb-8">
          <div className="bg-gradient-to-b from-white to-gray-50/50 border border-gray-200/80 rounded-xl sm:rounded-2xl p-6 shadow-sm">
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">{selected.title}</h1>
            <p className="text-gray-600 leading-relaxed mb-6">{selected.description}</p>
            
            {selected.canEdit && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Status:</span>
                <select
                  value={selected.status}
                  onChange={(e) => updateStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 bg-white"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Meeting Details Card */}
            <motion.div variants={fadeInUp}>
              <div className="bg-gradient-to-b from-white to-gray-50/50 border border-gray-200/80 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100">
                    <CalendarDays className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Meeting Details</h2>
                    <p className="text-sm text-gray-500">Schedule and timing information</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    {
                      icon: CalendarDays,
                      label: "Date",
                      value: new Date(selected.startTime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    },
                    {
                      icon: Clock,
                      label: "Time",
                      value: `${new Date(selected.startTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })} – ${new Date(selected.endTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}`
                    },
                    {
                      icon: Clock,
                      label: "Duration",
                      value: `${Math.round((new Date(selected.endTime) - new Date(selected.startTime)) / 60000)} minutes`
                    },
                    {
                      icon: Video,
                      label: "Type",
                      value: (selected.meetingType || 'General').charAt(0).toUpperCase() + (selected.meetingType || 'General').slice(1)
                    },
                    {
                      icon: Globe,
                      label: "Timezone",
                      value: selected.timezone || 'UTC'
                    },
                    {
                      icon: Shield,
                      label: "Visibility",
                      value: selected.isPrivate ? 'Private' : 'Public'
                    }
                  ].map((detail, index) => (
                    <motion.div
                      key={index}
                      variants={slideIn}
                      custom={index}
                      className="flex items-start gap-4 p-4 bg-gradient-to-b from-gray-50/50 to-white rounded-lg border border-gray-200/60"
                    >
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${detail.icon === CalendarDays ? 'from-cyan-500/10 to-cyan-600/5 text-cyan-600' : 'from-gray-500/10 to-gray-600/5 text-gray-600'}`}>
                        <detail.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-1">{detail.label}</p>
                        <p className="font-medium text-gray-900">{detail.value}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {selected.tags && selected.tags.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200/60">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-4 h-4 text-gray-500" />
                      <p className="text-sm font-medium text-gray-500">Tags</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selected.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 border border-gray-200/60 text-gray-700 rounded-lg text-sm font-medium hover:border-cyan-300/50 hover:text-cyan-600 transition-colors"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Participants Card */}
            <motion.div variants={fadeInUp}>
              <div className="bg-gradient-to-b from-white to-gray-50/50 border border-gray-200/80 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100">
                    <Users className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Participants</h2>
                    <p className="text-sm text-gray-500">{selected.participants?.length || 0} attendees</p>
                  </div>
                </div>
                <ParticipantsSection
                  selected={selected}
                  participantId={participantId}
                  setParticipantId={setParticipantId}
                  addParticipant={addParticipant}
                  removeParticipant={removeParticipant}
                  editMode={editMode}
                  isValidEmail={isValidEmail}
                />
              </div>
            </motion.div>

            {/* Documents Card */}
            <motion.div variants={fadeInUp}>
              <div className="bg-gradient-to-b from-white to-gray-50/50 border border-gray-200/80 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100">
                    <FileText className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
                    <p className="text-sm text-gray-500">Meeting files and resources</p>
                  </div>
                </div>
                <DocumentsSection selected={selected} />
              </div>
            </motion.div>

            {/* Recordings Card */}
            <motion.div variants={fadeInUp}>
              <div className="bg-gradient-to-b from-white to-gray-50/50 border border-gray-200/80 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100">
                    <Video className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Recordings</h2>
                    <p className="text-sm text-gray-500">Meeting recordings</p>
                  </div>
                </div>
                <RecordingSection
                  isHost={selected.isHost}
                  selected={selected}
                />
              </div>
            </motion.div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Join Meeting Card */}
            {selected.meetingType === "live" && (
              <motion.div variants={fadeInUp}>
                <div className="bg-gradient-to-b from-white to-gray-50/50 border border-gray-200/80 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100">
                      <Video className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Join Meeting</h2>
                      <p className="text-sm text-gray-500">Video conference</p>
                    </div>
                  </div>
                  <JoinMeetingSection
                    meetingId={selected._id}
                    showMessage={showMessage}
                  />
                </div>
              </motion.div>
            )}

            {/* Actions Card */}
            <motion.div variants={fadeInUp}>
              <div className="bg-gradient-to-b from-white to-gray-50/50 border border-gray-200/80 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Actions</h3>
                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setEditMode(true); setShowEditModal(true); }}
                    disabled={!selected.canEdit}
                    className={`w-full py-2.5 px-4 rounded-lg flex items-center justify-center gap-3 transition-all duration-300 ${selected.canEdit
                      ? "bg-gradient-to-r from-cyan-500/10 to-cyan-600/5 border border-cyan-200/30 text-cyan-600 hover:border-cyan-400/50 hover:shadow-sm"
                      : "bg-gradient-to-r from-gray-50 to-white border border-gray-200/30 text-gray-400 cursor-not-allowed"
                      }`}
                  >
                    <Pencil className="w-4 h-4" />
                    <span className="font-medium">Edit Meeting</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowDeleteModal(true)}
                    disabled={!selected.canEdit}
                    className={`w-full py-2.5 px-4 rounded-lg flex items-center justify-center gap-3 transition-all duration-300 ${selected.canEdit
                      ? "bg-gradient-to-r from-red-500/10 to-red-600/5 border border-red-200/30 text-red-600 hover:border-red-400/50 hover:shadow-sm"
                      : "bg-gradient-to-r from-gray-50 to-white border border-gray-200/30 text-gray-400 cursor-not-allowed"
                      }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="font-medium">Delete Meeting</span>
                  </motion.button>

                  <Link
                    to={`/meetings/${id}/ai`}
                    className="block"
                  >
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-2.5 px-4 rounded-lg flex items-center justify-center gap-3 transition-all duration-300 bg-gradient-to-r from-cyan-500/10 to-cyan-600/5 border border-cyan-200/30 text-cyan-600 hover:border-cyan-400/50 hover:shadow-sm"
                    >
                      <Brain className="w-4 h-4" />
                      <span className="font-medium">AI Insights</span>
                    </motion.div>
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Meeting Info Card */}
            <motion.div variants={fadeInUp}>
              <div className="bg-gradient-to-b from-white to-gray-50/50 border border-gray-200/80 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
                    <FileText className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Meeting Info</h3>
                    <p className="text-sm text-gray-500">Additional details</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-gradient-to-b from-gray-50/50 to-white rounded-lg border border-gray-200/60">
                    <UserCircle className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Host</p>
                      <p className="font-medium text-gray-900">{selected.isHost ? "You" : "Organizer"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gradient-to-b from-gray-50/50 to-white rounded-lg border border-gray-200/60">
                    <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Created</p>
                      <p className="font-medium text-gray-900">
                        {new Date(selected.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gradient-to-b from-gray-50/50 to-white rounded-lg border border-gray-200/60">
                    <Users className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Participants</p>
                      <p className="font-medium text-gray-900">{selected.participants?.length || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Empty State Art - Minimal Visual */}
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
              Meeting details loaded successfully.
            </p>
          </div>
        </motion.div>

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
                  Meeting Details
                </p>
              </div>
              <div className="hidden sm:block w-px h-3 bg-gray-300"></div>
              <p className="text-xs text-gray-400">
                ID: <span className="text-cyan-600 font-medium">{id.slice(0, 8)}...</span>
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

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        title="Delete Meeting"
        onClose={() => setShowDeleteModal(false)}
        size="sm"
        actions={[
          {
            label: "Cancel",
            onClick: () => setShowDeleteModal(false),
            className: "px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          },
          {
            label: "Delete",
            onClick: deleteMeeting,
            className: "px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-md transition-all duration-300"
          },
        ]}
      >
        <div className="text-center py-4">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-50 to-white border border-red-100 flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete this meeting?</h3>
          <p className="text-gray-600 mb-4">This action cannot be undone.</p>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal && editMode}
        title="Edit Meeting"
        onClose={() => { setShowEditModal(false); setEditMode(false); }}
        size="lg"
      >
        <div className="max-h-[70vh] overflow-y-auto">
          <MeetingForm
            meeting={meetingData}
            setMeeting={setMeetingData}
            mode="edit"
            onSubmit={updateMeeting}
            onCancel={() => { setEditMode(false); setShowEditModal(false); }}
          />
        </div>
      </Modal>
    </motion.div>
  );
}