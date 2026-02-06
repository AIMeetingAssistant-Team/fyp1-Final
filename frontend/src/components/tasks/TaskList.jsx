import TaskCard from './TaskCard';
import { List, Grid } from 'lucide-react';

const TaskList = ({ tasks, viewMode, onUpdateTask, onDeleteTask, onAssignUser, onAddComment,  onEditTask, user }) => {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map(task => (
          <TaskCard
            key={task._id}
            task={task}
            viewMode="grid"
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onAssignUser={onAssignUser}
            onAddComment={onAddComment}
            user={user}
          />
        ))}
      </div>
    );
  }

  // List view (table)
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meeting</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tasks.map(task => (
              <TaskCard
                key={task._id}
                task={task}
                viewMode="list"
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                onAssignUser={onAssignUser}
                onAddComment={onAddComment}
                onEditTask={onEditTask} // ← Pass it down here
                user={user}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskList;