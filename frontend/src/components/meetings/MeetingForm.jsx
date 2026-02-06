import { useState } from "react";

const TIMEZONES = [
  { value: "UTC", label: "UTC (GMT+0:00)" },
  { value: "America/New_York", label: "Eastern Time (GMT-5:00)" },
  { value: "America/Chicago", label: "Central Time (GMT-6:00)" },
  { value: "America/Denver", label: "Mountain Time (GMT-7:00)" },
  { value: "America/Los_Angeles", label: "Pacific Time (GMT-8:00)" },
  { value: "Europe/London", label: "London (GMT+0:00)" },
  { value: "Europe/Paris", label: "Paris (GMT+1:00)" },
  { value: "Europe/Berlin", label: "Berlin (GMT+1:00)" },
  { value: "Europe/Moscow", label: "Moscow (GMT+3:00)" },
  { value: "Asia/Dubai", label: "Dubai (GMT+4:00)" },
  { value: "Asia/Karachi", label: "Karachi (GMT+5:00)" },
  { value: "Asia/Kolkata", label: "Kolkata (GMT+5:30)" },
  { value: "Asia/Singapore", label: "Singapore (GMT+8:00)" },
  { value: "Asia/Tokyo", label: "Tokyo (GMT+9:00)" },
  { value: "Asia/Shanghai", label: "Shanghai (GMT+8:00)" },
  { value: "Australia/Sydney", label: "Sydney (GMT+10:00)" },
  { value: "Australia/Melbourne", label: "Melbourne (GMT+10:00)" },
  { value: "Pacific/Auckland", label: "Auckland (GMT+12:00)" },
  { value: "Pacific/Honolulu", label: "Honolulu (GMT-10:00)" },
];

const ALLOWED_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"];

export default function MeetingForm({ meeting, setMeeting, onSubmit, onCancel, mode, loading, setLoading }) {
  const [errors, setErrors] = useState({});
  const [newEmail, setNewEmail] = useState("");

  const isValidEmail = (email) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) return false;
    const domain = email.split("@")[1].toLowerCase();
    return ALLOWED_DOMAINS.includes(domain);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMeeting((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (name === "title")
      setErrors((prev) => ({ ...prev, title: value.trim() ? "" : "Title is required" }));
    if (name === "date" || name === "time")
      validateDateTime(
        name === "date" ? value : meeting.date,
        name === "time" ? value : meeting.time
      );
    if (name === "participants") setErrors((prev) => ({ ...prev, participants: "" }));
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === "," || e.key === "Enter") {
      e.preventDefault();
      const email = newEmail.trim();
      if (!email) return;

      if (!isValidEmail(email)) {
        setErrors((prev) => ({ ...prev, participants: "Invalid email or domain not allowed" }));
        return;
      }

      if (meeting.participants?.includes(email)) {
        setErrors((prev) => ({ ...prev, participants: "Email already added" }));
        return;
      }

      setMeeting((prev) => ({
        ...prev,
        participants: [...(prev.participants || []), email],
      }));
      setNewEmail("");
      setErrors((prev) => ({ ...prev, participants: "" }));
    }
  };

  const removeEmail = (index) => {
    setMeeting((prev) => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== index),
    }));
  };

  const validateDateTime = (date, time) => {
    if (!date) return setErrors((prev) => ({ ...prev, date: "Date is required" }));
    if (!time) return setErrors((prev) => ({ ...prev, time: "Time is required" }));

    const selected = new Date(`${date}T${time}`);
    if (selected <= new Date()) setErrors((prev) => ({ ...prev, time: "Time cannot be in the past" }));
    else setErrors((prev) => ({ ...prev, date: "", time: "" }));
  };

  const handleSubmit = (e) => {
    setLoading(true);
    e.preventDefault();
    const newErrors = {};

    if (!meeting.title.trim()) newErrors.title = "Title is required";
    if ((mode === "create" || mode === "edit") && !meeting.date) newErrors.date = "Date is required";
    if ((mode === "create" || mode === "edit") && !meeting.time) newErrors.time = "Time is required";
    if (
      (mode === "create" || mode === "recording") &&
      (!meeting.participants || meeting.participants.length === 0)
    )
      newErrors.participants = "At least one participant email is required";

    if (Object.keys(newErrors).length) return (setErrors(newErrors), setLoading(false));

    const startTime = new Date(`${meeting.date}T${meeting.time}`);
    const endTime = new Date(
      startTime.getTime() + ((meeting.duration && mode === "create" ? meeting.duration : 5) * 60000)
    );

    const payload = {
      title: meeting.title,
      description: meeting.description,
      isPrivate: meeting.isPrivate,
      agenda: meeting.agenda,
    };

    if (mode === "create") {
      payload.timezone = meeting.timezone;
      payload.startTime = startTime;
      payload.endTime = endTime;
      payload.emails = meeting.participants;
      payload.duration = meeting.duration;
    } else if (mode === "recording") {
      payload.emails = meeting.participants;
    } else if (mode === "edit") {
      payload.id = meeting.id;
    }

    onSubmit(payload);
  };

  return (
    <div className="shadow-sm p-4 sm:p-6 lg:p-8">
      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        {/* Title */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Title <span className="text-cyan-600">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={meeting.title}
            onChange={handleChange}
            className={`w-full px-4 py-3 rounded-lg border focus:ring-1 focus:outline-none transition-all duration-200 ${errors.title
              ? "border-red-300 focus:ring-red-500 focus:border-red-500"
              : "border-gray-300 focus:ring-cyan-500 "
              } placeholder-gray-400`}
            placeholder="Enter meeting title"
          />
          {errors.title && (
            <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {errors.title}
            </div>
          )}
        </div>

        {/* Agenda */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Agenda</label>
          <textarea
            name="agenda"
            rows="2"
            value={meeting.agenda}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-1 focus:ring-cyan-500  focus:outline-none transition-all duration-200 placeholder-gray-400"
            placeholder="Brief agenda or topics to be discussed"
          />
        </div>

        {/* Timezone */}
        {(mode === "create" || mode === "edit") && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Timezone</label>
            <div className="relative">
              <select
                name="timezone"
                value={meeting.timezone}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-1 focus:ring-cyan-500  focus:outline-none appearance-none transition-all duration-200 bg-white"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value} className="bg-white">
                    {tz.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Date & Time */}
        {(mode === "create" || mode === "edit") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Date <span className="text-cyan-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="date"
                  value={meeting.date}
                  onChange={handleChange}
                  onFocus={(e) => e.target.showPicker?.()}
                  className={`w-full px-4 py-3 rounded-lg border focus:ring-1 focus:outline-none transition-all duration-200 ${errors.date
                    ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 focus:ring-cyan-500 "
                    }`}
                />
              </div>
              {errors.date && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.date}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Time <span className="text-cyan-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  name="time"
                  value={meeting.time}
                  onChange={handleChange}
                  onFocus={(e) => e.target.showPicker?.()}
                  className={`w-full px-4 py-3 rounded-lg border focus:ring-1 focus:outline-none transition-all duration-200 ${errors.time
                    ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 focus:ring-cyan-500 "
                    }`}
                />
              </div>
              {errors.time && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.time}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Duration */}
        {mode === "create" && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Duration</label>
            <div className="relative w-full">
              <input
                type="number"
                name="duration"
                min="5"
                step="5"
                value={meeting.duration || 5}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-1 focus:ring-cyan-500  focus:outline-none transition-all duration-200"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-500 text-sm">minutes</span>
              </div>
            </div>
          </div>
        )}

        {/* Participants */}
        {(mode === "create" || mode === "recording") && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Participants <span className="text-cyan-600">*</span>
              <span className="text-xs text-gray-500 ml-2">(Enter email and press Enter or comma)</span>
            </label>
            <div
              className={`border rounded-lg p-3 transition-all duration-200 ${errors.participants ? "border-red-300" : "border-gray-300"
                }`}
            >
              <div className="flex flex-wrap gap-2 mb-2">
                {meeting.participants?.map((email, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-2 bg-cyan-50 border border-cyan-200 px-3 py-1.5 rounded-lg"
                  >
                    <svg
                      className="w-4 h-4 text-cyan-600 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span className="text-cyan-700 text-sm">{email}</span>
                    <button
                      type="button"
                      onClick={() => removeEmail(index)}
                      className="text-red-400 hover:text-red-600 transition-colors duration-200 ml-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <input
                type="text"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, participants: "" }));
                }}
                onKeyDown={handleEmailKeyDown}
                className="w-full bg-transparent border-0 focus:ring-0 placeholder-gray-400 px-0 py-1"
                placeholder="participant@example.com"
              />
            </div>
            {errors.participants && (
              <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {errors.participants}
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            rows="3"
            value={meeting.description}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-1 focus:ring-cyan-500  focus:outline-none transition-all duration-200 placeholder-gray-400"
            placeholder="Detailed description, agenda items, or special instructions..."
          />
        </div>

        {/* Private Meeting */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              name="isPrivate"
              checked={meeting.isPrivate}
              onChange={handleChange}
              className="sr-only peer"
              id="private-checkbox"
            />
            <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:border-cyan-600 peer-checked:bg-cyan-600 transition-all duration-200 flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div>
            <label htmlFor="private-checkbox" className="text-sm font-medium text-gray-700 cursor-pointer">
              Private Meeting
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Only invited participants will be able to join this meeting
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-6">
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {mode === "create"
                    ? "Schedule Meeting"
                    : mode === "edit"
                      ? "Update Meeting"
                      : "Share Recording"}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}