import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Users, ChevronRight, Video, FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function MeetingCard({ meeting }) {
  const navigate = useNavigate();

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'in-progress': return 'bg-amber-100 text-amber-700';
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getMeetingIcon = () => {
    if (meeting.meetingType === 'recording') return <FileText className="w-4 h-4" />;
    if (meeting.meetingType === 'upload') return <FileText className="w-4 h-4" />;
    return <Video className="w-4 h-4" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ x: 4 }}
      onClick={() => navigate(`/meetings/${meeting._id}`)}
      className="bg-white border border-gray-200 rounded-xl p-4 hover:border-cyan-300 hover:shadow-sm transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg">
                {getMeetingIcon()}
              </div>
              <h3 className="font-medium text-gray-900 group-hover:text-cyan-700 transition-colors">
                {meeting.title}
              </h3>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(meeting.status)}`}>
              {meeting.status}
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {new Date(meeting.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                {new Date(meeting.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {new Date(meeting.startTime).toLocaleDateString()}
              </span>
            </div>

            {meeting.participants && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {meeting.participants.length} participants
                </span>
              </div>
            )}

            {meeting.meetingID && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">ID: {meeting.meetingID}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/meetings/${meeting._id}`);
          }}
          className="ml-4 p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}