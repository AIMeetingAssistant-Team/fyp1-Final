import { motion } from 'framer-motion';
import { CheckCircle, Clock, AlertCircle, Target } from 'lucide-react';

export default function TaskAnalytics({ data }) {
  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100">
            <CheckCircle className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Task Analytics</h2>
            <p className="text-sm text-gray-500">No task data available</p>
          </div>
        </div>
        <div className="text-center py-12">
          <p className="text-gray-400">No tasks found in this period</p>
        </div>
      </div>
    );
  }

  const totalTasks = data.status?.reduce((sum, s) => sum + s.value, 0) || 0;
  const completedTasks = data.status?.find(s => s.name === 'completed')?.value || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100">
          <Target className="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Task Analytics</h2>
          <p className="text-sm text-gray-500">Progress and completion metrics</p>
        </div>
      </div>

      {/* Completion Rate */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Completion Rate</span>
          <span className="font-semibold text-gray-900">{completionRate}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionRate}%` }}
            transition={{ duration: 0.6 }}
            className="h-2 rounded-full bg-gradient-to-r from-green-500 to-green-600"
          />
        </div>
      </div>

      {/* Priority Distribution */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-3">Priority Breakdown</p>
        <div className="space-y-3">
          {data.priority?.map((priority, idx) => (
            <div key={priority.name}>
              <div className="flex justify-between text-xs mb-1">
                <span className="capitalize text-gray-600">{priority.name}</span>
                <span className="text-gray-500">{priority.value}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(priority.value / totalTasks) * 100}%` }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className={`h-1.5 rounded-full ${
                    priority.name === 'urgent' ? 'bg-red-500' :
                    priority.name === 'high' ? 'bg-orange-500' :
                    priority.name === 'medium' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status Distribution */}
      <div className="pt-4 border-t border-gray-100">
        <p className="text-sm font-medium text-gray-700 mb-3">Status Breakdown</p>
        <div className="grid grid-cols-2 gap-3">
          {data.status?.map((status) => (
            <div key={status.name} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="text-xs capitalize text-gray-600">{status.name}</span>
              <span className="text-sm font-semibold text-gray-900">{status.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Avg Completion Time */}
      {data.avgCompletionDays > 0 && (
        <div className="mt-4 p-3 bg-cyan-50 rounded-lg border border-cyan-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-600" />
            <span className="text-sm text-cyan-700">
              Average completion time: <strong>{data.avgCompletionDays} days</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}