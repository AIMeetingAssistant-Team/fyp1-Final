import MeetingCard from "./MeetingCard";
import { Calendar } from "lucide-react";

export default function MeetingsList({ meetings }) {
  const meetingsWithDateKey = meetings.map((m) => {
    const start = new Date(m.startTime);
    return {
      ...m,
      dateKey: start.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    };
  });

  const groups = meetingsWithDateKey.reduce((acc, m) => {
    if (!acc[m.dateKey]) acc[m.dateKey] = [];
    acc[m.dateKey].push(m);
    return acc;
  }, {});

  if (Object.keys(groups).length === 0) {
    return (
      <div className="py-16 text-center">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No meetings found</h3>
        <p className="text-gray-500">No meetings scheduled for the selected filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.keys(groups).map((dateKey) => (
        <div key={dateKey} className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-200" />
            <div className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              {dateKey}
            </div>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="space-y-3">
            {groups[dateKey].map((m, idx) => (
              <MeetingCard key={m._id || idx} meeting={m} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}