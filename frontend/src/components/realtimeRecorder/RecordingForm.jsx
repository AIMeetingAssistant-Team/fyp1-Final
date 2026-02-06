import { useState } from "react";
import MeetingForm from "../meetings/MeetingForm";
import { apiRequest } from "../../utils/api";
import { CalendarDays } from "lucide-react";

export default function RecordingForm({ onCreated, onCancel }) {
  const token = localStorage.getItem("token");
  const today = new Date().toISOString().split("T")[0];

  const [meeting, setMeeting] = useState({
    title: "",
    agenda: "",
    description: "",
    emails: []
  });
  const [loading, setLoading] = useState(false);

  const handleCreateMeeting = async (payload) => {
    setLoading(true);

    const res = await apiRequest(
      "/meetings/recording-meeting",
      "POST",
      {
        title: payload.title,
        agenda: payload.agenda,
        description: payload.description,
        date: today,
        emails: payload.emails || [],
        meetingType: "recording",
      },
      token
    );

    setLoading(false);
    if (res.success) onCreated(res.meeting);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow">
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
                  Create Recording Meeting
                </h1>
                <p className="text-gray-500 text-sm sm:text-base mt-1 sm:mt-2">
                  Fill in the details below to create and schedule your meeting
                </p>
              </div>
            </div>
          </div>

          {/* Meeting Form */}
          <MeetingForm
            meeting={meeting}
            setMeeting={setMeeting}
            onSubmit={handleCreateMeeting}
            onCancel={onCancel}
            mode="recording"
            loading={loading}
            setLoading={setLoading}
          />
        </div>
      </div>
    </div>
  );
}
