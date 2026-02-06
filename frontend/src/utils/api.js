const baseurl = import.meta.env.VITE_BASE_URL;

export async function apiRequest(endpoint, method = "GET", body, token) {
  // Get token from localStorage if not provided
  if (!token) {
    token = localStorage.getItem('token');
  }

  console.log(`🌐 API Request: ${method} ${baseurl}${endpoint}`);
  console.log('Token present:', token ? 'Yes' : 'No');

  try {
    const res = await fetch(`${baseurl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log(`📊 Response Status: ${res.status} ${res.statusText}`);

    // Handle 401 specifically
    if (res.status === 401) {
      console.error('❌ 401 Unauthorized - Token invalid or missing');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/signin';
      throw new Error('Session expired. Please login again.');
    }

    const text = await res.text();
    
    try {
      const data = text ? JSON.parse(text) : {};
      console.log('📦 Response Data:', data);
      return data;
    } catch (err) {
      console.error("Failed to parse JSON:", text);
      return { 
        success: false, 
        error: 'Invalid server response',
        rawResponse: text 
      };
    }
  } catch (error) {
    console.error('🚨 Fetch error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Network error - check connection'
    };
  }
}
// AI specific API calls
export const aiApi = {
  health: (token) => apiRequest('/ai/health', 'GET', null, token),
  
  transcribe: (meetingId, recordingIndex, options, token) =>
    apiRequest(`/ai/meetings/${meetingId}/transcribe/${recordingIndex}`, 'POST', options, token),
  
  getTranscriptionStatus: (meetingId, token) =>
    apiRequest(`/ai/meetings/${meetingId}/transcription-status`, 'GET', null, token),
  
  generateMinutes: (meetingId, options, token) =>
    apiRequest(`/ai/meetings/${meetingId}/regenerate-minutes`, 'POST', options, token),
  
  getInsights: (meetingId, token) =>
    apiRequest(`/ai/meetings/${meetingId}/insights`, 'GET', null, token),
  
  bulkProcess: (meetingIds, options, token) =>
    apiRequest('/ai/bulk-process', 'POST', { meetingIds, options }, token),
  
  generatePDF: (meetingId, recordingIndex, token) => {
    const url = recordingIndex !== undefined 
      ? `/ai/meetings/${meetingId}/pdf?recordingIndex=${recordingIndex}`
      : `/ai/meetings/${meetingId}/pdf`;
    return fetch(`${import.meta.env.VITE_BASE_URL}${url}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },
};