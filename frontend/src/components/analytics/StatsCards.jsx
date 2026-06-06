import { motion } from 'framer-motion';
import { Calendar, Clock, CheckCircle, Users, Video, FileText } from 'lucide-react';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function StatsCards({ data }) {
  if (!data) return null;

  const stats = [
    {
      title: 'Total Meetings',
      value: data.meetings?.total || 0,
      icon: Calendar,
      color: 'from-cyan-500 to-cyan-600',
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-600',
      trend: `${data.meetings?.completionRate || 0}% completed`
    },
    {
      title: 'Meeting Hours',
      value: data.meetings?.totalHours || 0,
      icon: Clock,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      trend: `${data.meetings?.averageDuration || 0} min avg`
    },
    {
      title: 'Total Tasks',
      value: data.tasks?.total || 0,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      trend: `${data.tasks?.completionRate || 0}% completed`
    },
    {
      title: 'Participants',
      value: data.meetings?.total ? Math.round(data.participation?.uniqueParticipants || 0) : 0,
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      trend: `${data.participation?.averagePerMeeting || 0} per meeting`
    },
    {
      title: 'Recordings',
      value: data.recordings?.total || 0,
      icon: Video,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      trend: `${data.recordings?.transcriptionRate || 0}% transcribed`
    },
    {
      title: 'Documents',
      value: data.meetings?.total || 0,
      icon: FileText,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      trend: 'Shared files'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: index * 0.05 }}
          whileHover={{ y: -4 }}
          className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-4 h-4 ${stat.textColor}`} />
            </div>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`text-xs font-medium px-2 py-1 rounded-full bg-gradient-to-r ${stat.color} text-white`}
            >
              {stat.trend}
            </motion.div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          <p className="text-xs text-gray-500 mt-1">{stat.title}</p>
        </motion.div>
      ))}
    </div>
  );
}