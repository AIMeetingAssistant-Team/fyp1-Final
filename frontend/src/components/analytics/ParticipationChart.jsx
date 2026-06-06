import { motion } from 'framer-motion';
import { Users, UserCheck, UserX, TrendingUp } from 'lucide-react';

export default function ParticipationChart({ data }) {
  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100">
            <Users className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Participation</h2>
            <p className="text-sm text-gray-500">Team engagement metrics</p>
          </div>
        </div>
        <div className="text-center py-12">
          <p className="text-gray-400">No participation data available</p>
        </div>
      </div>
    );
  }

  const acceptanceRate = data.acceptanceRate || 0;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (acceptanceRate / 100) * circumference;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100">
          <Users className="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Participation</h2>
          <p className="text-sm text-gray-500">Team engagement metrics</p>
        </div>
      </div>

      <div className="flex flex-col items-center">
        {/* Donut Chart */}
        <div className="relative w-48 h-48 mb-6">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="12"
            />
            <motion.circle
              cx="96"
              cy="96"
              r={radius}
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="12"
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut" }}
              strokeDasharray={circumference}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#0891b2" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900">{acceptanceRate}%</span>
            <span className="text-xs text-gray-500">Acceptance</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 w-full mt-4">
          <div className="text-center p-3 bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200">
            <UserCheck className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">{data.totalAccepted || 0}</p>
            <p className="text-xs text-gray-500">Accepted</p>
          </div>
          <div className="text-center p-3 bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200">
            <UserX className="w-5 h-5 text-red-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">{data.totalDeclined || 0}</p>
            <p className="text-xs text-gray-500">Declined</p>
          </div>
          <div className="text-center p-3 bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200">
            <Users className="w-5 h-5 text-cyan-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">{data.uniqueParticipants || 0}</p>
            <p className="text-xs text-gray-500">Unique</p>
          </div>
        </div>

        {/* Top Participants */}
        {data.topParticipants?.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100 w-full">
            <p className="text-sm font-medium text-gray-700 mb-3">Top Participants</p>
            <div className="space-y-2">
              {data.topParticipants.slice(0, 3).map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 truncate max-w-[150px]">{p.name || p.email}</span>
                  <span className="font-medium text-gray-900">{p.meetingsAttended} meetings</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}