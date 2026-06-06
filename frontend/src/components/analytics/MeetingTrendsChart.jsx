import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar } from 'lucide-react';

export default function MeetingTrendsChart({ data, period }) {
  const [activeTab, setActiveTab] = useState('meetings');

  if (!data?.timeline) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100">
            <TrendingUp className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Meeting Trends</h2>
            <p className="text-sm text-gray-500">No meeting data available</p>
          </div>
        </div>
        <div className="text-center py-12">
          <p className="text-gray-400">No meetings found in this period</p>
        </div>
      </div>
    );
  }

  const timeline = data.timeline;
  const maxCount = Math.max(...timeline.map(d => d.count), 1);
  const maxMinutes = Math.max(...timeline.map(d => d.minutes), 1);

  const getBarHeight = (value, max) => (value / max) * 100;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100">
            <TrendingUp className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Meeting Trends</h2>
            <p className="text-sm text-gray-500">Activity over time</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('meetings')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              activeTab === 'meetings' 
                ? 'bg-cyan-50 text-cyan-600 font-medium' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Meetings
          </button>
          <button
            onClick={() => setActiveTab('minutes')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              activeTab === 'minutes' 
                ? 'bg-cyan-50 text-cyan-600 font-medium' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Minutes
          </button>
        </div>
      </div>

      <div className="relative h-64">
        <div className="absolute inset-0 flex items-end gap-1 pb-6">
          {timeline.slice(-14).map((day, idx) => {
            const value = activeTab === 'meetings' ? day.count : day.minutes;
            const max = activeTab === 'meetings' ? maxCount : maxMinutes;
            const height = getBarHeight(value, max);
            
            return (
              <motion.div
                key={idx}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.5, delay: idx * 0.02 }}
                className="flex-1 flex flex-col items-center group"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-full max-w-[40px] bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t-lg cursor-pointer relative"
                  style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap z-10">
                    {activeTab === 'meetings' ? `${value} meetings` : `${value} min`}
                  </div>
                </motion.div>
                <span className="text-xs text-gray-400 mt-2 rotate-45 origin-left translate-x-3">
                  {new Date(day.date).getDate()}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Showing last 14 days</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
              <span>{activeTab === 'meetings' ? 'Meetings per day' : 'Minutes per day'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}