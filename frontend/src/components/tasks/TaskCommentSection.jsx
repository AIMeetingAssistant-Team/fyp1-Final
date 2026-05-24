import { useState } from 'react';
import { MessageSquare, Send, User } from 'lucide-react';


const TaskCommentSection = ({ taskId, comments, onAddComment, user }) => {
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    const result = await onAddComment(taskId, newComment.trim());

    if (result.success) {
      setNewComment('');
    } else {
      console.error('Failed to add comment:', result.message);
    }

    setLoading(false);
  };

  // Helper to get user display name
  const getUserDisplayName = (commentUser) => {
    if (!commentUser) return 'Unknown User';

    // Check different possible structures
    if (typeof commentUser === 'string') {
      return commentUser; // If it's just a string ID
    }

    if (commentUser.name) {
      return commentUser.name;
    }

    if (commentUser.email) {
      return commentUser.email.split('@')[0]; // Use first part of email
    }

    return 'User';
  };

  // Helper to get user avatar
  const getUserAvatar = (commentUser) => {
    if (!commentUser) return null;

    if (typeof commentUser === 'object' && commentUser.profilePicture) {
      return commentUser.profilePicture;
    }

    return null;
  };

  // Helper to get user initials
  const getUserInitials = (commentUser) => {
    const name = getUserDisplayName(commentUser);
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
        <MessageSquare className="w-4 h-4 mr-2" />
        Comments ({comments.length})
      </h4>

      {/* Add Comment */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex items-start space-x-2">
          <div className="flex-shrink-0 mt-1">
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt="You"
                className="w-8 h-8 rounded-full object-cover border-2 border-white"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 items-center justify-center text-white text-xs font-medium border-2 border-white"
              style={{ display: user?.profilePicture ? 'none' : 'flex' }}
            >
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={loading || !newComment.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Send className="w-3 h-3 mr-1" />
                {loading ? 'Posting...' : 'Comment'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {comments.length > 0 ? (
          comments.map((comment, index) => {
            const commentUser = comment.user;
            const displayName = getUserDisplayName(commentUser);
            const avatarUrl = getUserAvatar(commentUser);
            const initials = getUserInitials(commentUser);

            return (
              <div key={index} className="flex items-start space-x-2">
                <div className="flex-shrink-0" style={{ marginTop: '16px' }}>
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-7 h-7 rounded-full object-cover border-2 border-white"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 items-center justify-center text-white text-xs font-medium border-2 border-white"
                    style={{ display: avatarUrl ? 'none' : 'flex' }}
                  >
                    {initials}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium text-gray-800">
                        {displayName}
                        {commentUser?._id === user?.id && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">You</span>
                        )}
                      </span>
                      <span className="text-xs text-gray-500">
                        {comment.createdAt ? (
                          new Date(comment.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })
                        ) : (
                          'Just now'
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{comment.text}</p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-4 border border-dashed border-gray-300 rounded-lg">
            <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No comments yet. Be the first to comment!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCommentSection;