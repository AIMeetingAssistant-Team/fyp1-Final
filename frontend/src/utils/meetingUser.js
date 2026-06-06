/** Resolve current user id from localStorage (supports id or _id). */
export function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const id = user?.id ?? user?._id;
    return id != null ? String(id) : '';
  } catch {
    return '';
  }
}

/** Compare logged-in user to meeting host (populated object or raw id). */
export function isMeetingHost(meeting, userId = getCurrentUserId()) {
  if (!meeting?.host || !userId) return false;
  const host = meeting.host;
  const hostId = String(host._id ?? host.id ?? host);
  return hostId === userId;
}
