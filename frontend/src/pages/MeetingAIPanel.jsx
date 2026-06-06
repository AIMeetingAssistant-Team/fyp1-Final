import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAIContext } from '../context/AIContext';
import AIPanel from '../components/meetings/AIPanel';
import { ArrowLeft, Download, Share2, Printer, Settings, X, Video, Music } from 'lucide-react';

const MeetingAIPanel = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { meetingInsights } = useAIContext();

  const [meetingData, setMeetingData] = useState(null);

  useEffect(() => {
    // Fetch meeting data
    const fetchMeeting = async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/meetings/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setMeetingData(data.meeting);
      }
    };

    fetchMeeting();
  }, [id]);

  const exportAll = () => {
    // Export transcription, minutes, and insights as a package
    const exportData = {
      meeting: meetingData,
      insights: meetingInsights[id],
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-ai-export-${id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareInsights = async () => {
    const insights = meetingInsights[id];
    if (!insights) return;

    const shareText = `Meeting Insights for ${meetingData?.title}\n\nSummary: ${insights.minutes?.summary?.substring(0, 200)}...\n\nKey Points: ${insights.minutes?.keyPoints?.length || 0}\nAction Items: ${insights.minutes?.actionItems?.length || 0}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${meetingData?.title} - AI Insights`,
          text: shareText,
          url: window.location.href
        });
      } catch (error) {
        console.log('Share cancelled:', error);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Insights copied to clipboard!');
    }
  };

  if (!meetingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading meeting AI insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => navigate(`/meetings/${id}`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Meeting
            </button>

            <div className="flex items-center gap-4">
              <button
                onClick={shareInsights}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={exportAll}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
              >
                <Download className="w-4 h-4" />
                Export All
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Meeting Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{meetingData.title}</h1>
              <p className="text-gray-600 mt-1">{meetingData.description}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Meeting Date</p>
              <p className="font-semibold text-gray-900">
                {new Date(meetingData.startTime).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Meeting Type</p>
              <p className="font-semibold text-gray-900 capitalize">{meetingData.meetingType}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              {/* <p className="text-sm text-gray-500">Duration</p>
              <p className="font-semibold text-gray-900">
                {Math.round((new Date(meetingData.endTime) - new Date(meetingData.startTime)) / 60000)} minutes
              </p> */}
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-semibold text-gray-900 capitalize">{meetingData.status}</p>
            </div>
          </div>
        </div>

        {/* AI Panel */}
        <AIPanel
          meetingId={id}
          meetingData={meetingData}
        />

        {/* Recording List */}
        {meetingData.recordings && meetingData.recordings.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Recordings</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">Click on a recording to view its transcription, minutes, and insights</p>
            <div className="space-y-4">
              {meetingData.recordings.map((recording, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 cursor-pointer transition-all border-gray-200 hover:bg-gray-50 hover:border-gray-300`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100`}>
                        {recording.fileType?.includes('video') ? (<Video className="w-6 h-6 text-blue-600" />) : (
                          <Music className="w-6 h-6 text-purple-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-mediumtext-gray-900`}>
                          {recording.fileName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {(recording.fileSize / (1024 * 1024)).toFixed(2)} MB • {recording.fileType}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {recording.transcriptionStatus && (
                        <span className={`px-2 py-1 rounded-full text-xs ${recording.transcriptionStatus === 'completed' ? 'bg-green-100 text-green-800' :
                            recording.transcriptionStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
                              recording.transcriptionStatus === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                          }`}>
                          {recording.transcriptionStatus}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(recording.url, '_blank');
                        }}
                        className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingAIPanel;