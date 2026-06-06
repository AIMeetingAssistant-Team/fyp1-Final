/**
 * Upload a meeting recording blob to Cloudinary via the existing recordings API.
 * Triggers the server-side AI pipeline when autoProcessAI is enabled.
 */
export function uploadMeetingRecording(meetingId, blob, { onProgress } = {}) {
  const token = localStorage.getItem('token');
  const baseUrl = (import.meta.env.VITE_BASE_URL || 'http://localhost:5000/api').trim().replace(/\/$/, '');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    const recorderMime = blob.type || '';
    const isMp4 = recorderMime.includes('mp4');
    const ext = isMp4 ? 'mp4' : 'webm';
    const mime = recorderMime.startsWith('video/') ? recorderMime : `video/${ext}`;
    const filename = `livekit-meeting-${meetingId}-${Date.now()}.${ext}`;

    const file = new File([blob], filename, { type: mime });
    formData.append('recording', file, filename);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          resolve(data);
        } else {
          reject(new Error(data.message || 'Failed to upload recording'));
        }
      } catch {
        reject(new Error('Invalid server response while uploading recording'));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error while uploading recording')));
    xhr.open('POST', `${baseUrl}/recordings/${meetingId}/upload`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}
