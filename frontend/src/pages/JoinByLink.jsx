import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Video, Users, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { apiRequest } from "../utils/api";

export default function JoinByLink() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading"); // loading | ready | joining | error
  const [error, setError] = useState("");
  const [meetingInfo, setMeetingInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchMeeting = async () => {
      setStatus("loading");
      setError("");

      const token = localStorage.getItem("token");
      if (!token) {
        // Preserve the destination so we can bounce back here after sign-in.
        navigate("/signin", { state: { from: `/join/${code}` } });
        return;
      }

      try {
        const response = await apiRequest(`/meetings/code/${code}`, "GET", null, token);
        if (cancelled) return;

        if (!response.success) {
          setError(response.message || "Meeting not found");
          setStatus("error");
          return;
        }

        setMeetingInfo(response.meeting);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "Failed to fetch meeting information");
        setStatus("error");
      }
    };

    if (code) fetchMeeting();
    return () => {
      cancelled = true;
    };
  }, [code, navigate]);

  const joinMeeting = async () => {
    if (!meetingInfo) return;
    setStatus("joining");
    setError("");

    try {
      const token = localStorage.getItem("token");
      const tokenRes = await apiRequest(
        `/livekit/meetings/${meetingInfo._id}/token`,
        "POST",
        { role: "participant" },
        token,
      );

      if (!tokenRes.success) {
        throw new Error(tokenRes.message || "Failed to get video token");
      }

      navigate(`/video-meeting/${meetingInfo._id}`, {
        state: { tokenData: tokenRes, meetingInfo, isHost: false },
      });
    } catch (err) {
      setError(err.message || "Failed to join meeting");
      setStatus("ready");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-gray-50 to-white">
        <Loader2 className="w-10 h-10 text-cyan-600 animate-spin" />
        <p className="text-gray-600">Looking up meeting {code}…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-gray-50 to-white px-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Couldn't join meeting</h1>
        <p className="text-gray-600 text-center max-w-sm">{error}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/join")}
            className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Enter a different code
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg font-medium hover:shadow-md transition-all"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  // status === "ready" or "joining"
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white px-4">
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-cyan-50 border border-cyan-100 flex items-center justify-center">
            <Video className="w-7 h-7 text-cyan-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">{meetingInfo.title}</h1>
          <p className="text-sm text-gray-600">Hosted by {meetingInfo.host?.name || "Unknown"}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            {new Date(meetingInfo.startTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            {meetingInfo.participants?.length || 0} participants
          </div>
        </div>

        {(meetingInfo.status === "cancelled" || meetingInfo.status === "completed") ? (
          <div className="flex items-center gap-2 justify-center text-sm text-gray-500 py-3">
            <XCircle className="w-4 h-4" />
            {meetingInfo.status === "cancelled" ? "This meeting was cancelled." : "This meeting has ended."}
          </div>
        ) : (
          <button
            type="button"
            onClick={joinMeeting}
            disabled={status === "joining"}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              status === "joining"
                ? "bg-gray-100 text-gray-400 cursor-wait"
                : "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:shadow-md"
            }`}
          >
            {status === "joining" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Joining…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Join meeting
              </>
            )}
          </button>
        )}

        {error && status === "ready" && (
          <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}