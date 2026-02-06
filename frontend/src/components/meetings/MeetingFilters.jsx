import { Filter, RefreshCw, Calendar, Type, Clock } from "lucide-react";

export default function MeetingFilters({
  filterType,
  setFilterType,
  filterStatus,
  setFilterStatus,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  handleClearFilters
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Meeting Type Filter */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Type className="w-4 h-4" />
            Meeting Type
          </label>
          <select
            value={filterType}
            onChange={(e) => (setFilterType(e.target.value), setFilterStatus("all"))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition"
          >
            <option value="live">Live Meetings</option>
            <option value="recording">Recordings</option>
            <option value="upload">Uploads</option>
          </select>
        </div>

        {/* Status Filter */}
        {filterType === "live" && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4" />
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition"
            >
              <option value="all">All Meetings</option>
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        )}

        {/* Date Range Filters */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4" />
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4" />
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition"
          />
        </div>
      </div>
    </div>
  );
}