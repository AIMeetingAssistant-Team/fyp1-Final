import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Files } from "lucide-react";

export default function JoinMeetingSection({ meetingId, showMessage }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState("");

  const videoLink = `${window.location.origin}/video-meeting/${meetingId}`;
  const joinLink = `${window.location.origin}/join-meeting/${meetingId}`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);

    if (showMessage) {
      showMessage("success", `${type} link copied!`);
    }

    setTimeout(() => setCopied(""), 1500);
  };

  return (
    <div className="my-10">
      <h3 className="text-2xl font-semibold mb-5">Meeting Access</h3>

      {/* JOIN BUTTON + JOIN PAGE LINK */}
      <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4 mb-6">
        
        {/* Join Meeting Now Button */}
        <button
          onClick={() => navigate(`/video-meeting/${meetingId}`)}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700 text-white rounded-lg shadow hover:bg-blue-700 transition flex items-center gap-2 justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Join Meeting
        </button>

        {/* Join Page Link */}
        <Link
          to={`/join-meeting/${meetingId}`}
          className="text-cyan-600 hover:underline text-sm font-medium"
        >
          Use Join Page →
        </Link>
      </div>

      {/* LINKS BLOCK */}
      <div className="p-5 bg-gray-50 border rounded-lg">
        <p className="text-sm text-gray-600 font-semibold mb-3">Meeting Links</p>

        <div className="space-y-4">

          {/* Video Meeting Link */}
          <div>
            <span className="text-sm font-medium">Video Meeting:</span>

            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => copyToClipboard(videoLink, "Video")}
                className="p-2 rounded hover:bg-gray-200 transition"
                title="Copy link"
              >
                <Files size={16} />
              </button>

              <code className="flex-1 bg-white border p-2 rounded text-xs break-all">
                {videoLink}
              </code>
            </div>
          </div>

          {/* Join Page Link */}
          <div>
            <span className="text-sm font-medium">Join Page:</span>

            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => copyToClipboard(joinLink, "Join")}
                className="p-2 rounded hover:bg-gray-200 transition"
                title="Copy link"
              >
                <Files size={16} />
              </button>

              <code className="flex-1 bg-white border p-2 rounded text-xs break-all">
                {joinLink}
              </code>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
