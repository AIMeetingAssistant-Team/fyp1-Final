import { useState, useEffect } from "react";
import { apiRequest } from "../utils/api";
import moment from "moment";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function MeetingCalendarPage() {
  const [calendarData, setCalendarData] = useState({});
  const [hoveredMeeting, setHoveredMeeting] = useState(null);
  const [loading, setLoading] = useState(false);

  const [monthYear, setMonthYear] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const token = localStorage.getItem("token");

  // Pad single digit month/day with leading zero
  const pad = (num) => String(num).padStart(2, "0");

  // Fetch calendar data
  const fetchCalendar = async () => {
    try {
      setLoading(true);
      const { month, year } = monthYear;

      const data = await apiRequest(
        `/meetings/calendar?month=${month}&year=${year}`,
        "GET",
        null,
        token
      );

      if (data.success) setCalendarData(data.calendar || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [monthYear]);

  const goToPrevMonth = () => {
    setMonthYear((prev) => ({
      month: prev.month === 1 ? 12 : prev.month - 1,
      year: prev.month === 1 ? prev.year - 1 : prev.year,
    }));
  };

  const goToNextMonth = () => {
    setMonthYear((prev) => ({
      month: prev.month === 12 ? 1 : prev.month + 1,
      year: prev.month === 12 ? prev.year + 1 : prev.year,
    }));
  };

  const firstDay = moment(`${monthYear.year}-${pad(monthYear.month)}-01`, "YYYY-MM-DD");
  const daysInMonth = firstDay.daysInMonth();
  const startWeekday = firstDay.day();
  const todayStr = moment().format("YYYY-MM-DD");

  const renderCalendarGrid = () => {
    const cells = [];

    // Empty cells for starting weekday
    for (let i = 0; i < startWeekday; i++) cells.push(<div key={`empty-${i}`} />);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = moment(`${monthYear.year}-${pad(monthYear.month)}-${pad(day)}`, "YYYY-MM-DD").format("YYYY-MM-DD");
      const meetings = calendarData[dateStr] || [];
      const isToday = dateStr === todayStr;

      cells.push(
        <div
          key={dateStr}
          className={`p-2 md:p-3 border border-gray-200 min-h-[100px] md:min-h-[120px] rounded-xl relative transition-all ${
            isToday 
              ? "bg-gradient-to-br from-primary-50 to-primary-100/50 border-primary-400 shadow-sm" 
              : "bg-white hover:bg-gray-50"
          }`}
        >
          <div className={`font-bold mb-2 text-sm md:text-base ${isToday ? "text-primary-700" : "text-gray-900"}`}>
            {day}
          </div>

          <div className="space-y-1">
            {meetings.map((m) => (
              <div
                key={m._id}
                onMouseEnter={(e) => setHoveredMeeting({ meeting: m, x: e.pageX, y: e.pageY })}
                onMouseLeave={() => setHoveredMeeting(null)}
                className={`text-xs px-2 py-1 rounded-lg mb-1 truncate cursor-pointer transition-all ${
                  m.meetingType === "recording" 
                    ? "bg-red-500 text-white hover:bg-red-600" 
                    : m.meetingType === "upload" 
                    ? "bg-purple-500 text-white hover:bg-purple-600" 
                    : "bg-primary-500 text-white hover:bg-primary-600"
                }`}
              >
                {m.title}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return cells;
  };

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Calendar</h1>
        <p className="text-lg text-gray-600">View all your meetings in one place</p>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6 md:p-8 relative">
        {/* Month Header */}
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={goToPrevMonth} 
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft size={24} className="text-gray-700" />
          </button>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{firstDay.format("MMMM YYYY")}</h2>

          <button 
            onClick={goToNextMonth} 
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Next month"
          >
            <ChevronRight size={24} className="text-gray-700" />
          </button>
        </div>

        {/* Meeting Type Legend */}
        <div className="flex gap-6 mb-8 justify-center flex-wrap">
          <div className="flex items-center gap-2 bg-primary-50 px-4 py-2 rounded-lg border border-primary-200">
            <span className="w-4 h-4 rounded bg-primary-500 border border-primary-600"></span>
            <span className="text-sm font-medium text-gray-700">Live Meeting</span>
          </div>

          <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
            <span className="w-4 h-4 rounded bg-red-500 border border-red-600"></span>
            <span className="text-sm font-medium text-gray-700">Real-time Recording</span>
          </div>

          <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-lg border border-purple-200">
            <span className="w-4 h-4 rounded bg-purple-500 border border-purple-600"></span>
            <span className="text-sm font-medium text-gray-700">Uploaded Meeting</span>
          </div>
        </div>

        {/* Week Labels */}
        <div className="grid grid-cols-7 gap-2 text-center font-semibold text-gray-600 mb-3">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2 text-sm md:text-base">{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">{renderCalendarGrid()}</div>

        {/* Tooltip */}
        {hoveredMeeting && (
          <div
            className="fixed bg-white shadow-large p-4 rounded-xl border border-gray-200 w-72 z-50"
            style={{
              top: hoveredMeeting.y - 140,
              left: hoveredMeeting.x - 150,
              pointerEvents: "none",
            }}
          >
            <div className="font-bold text-gray-900 text-base mb-2">{hoveredMeeting.meeting.title}</div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Type:</span>
                <span className="font-medium text-gray-900 capitalize">{hoveredMeeting.meeting.meetingType}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Time:</span>
                <span className="font-medium text-gray-900">
                  {moment(hoveredMeeting.meeting.startTime).format("hh:mm A")} -{" "}
                  {moment(hoveredMeeting.meeting.endTime).format("hh:mm A")}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className="font-medium text-gray-900 capitalize">{hoveredMeeting.meeting.status}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Participants:</span>
                <span className="font-medium text-gray-900">{hoveredMeeting.meeting.participants?.length || 0}</span>
              </div>

              {hoveredMeeting.meeting.description && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-600 line-clamp-3">
                    {hoveredMeeting.meeting.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
            <p className="text-gray-500">Loading calendar...</p>
          </div>
        )}
      </div>
    </div>
  );
}
