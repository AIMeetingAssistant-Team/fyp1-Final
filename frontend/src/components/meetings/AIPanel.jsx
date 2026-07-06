import React, { useState, useEffect } from 'react';
import { useAIContext } from '../../context/AIContext';
import { downloadMeetingMinutesPDF, generatePDFBlob } from '../../utils/pdfGenerator';
import { aiApi } from '../../utils/api';
import { 
  Mic, 
  FileText, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Download,
  Play,
  Pause,
  RefreshCw,
  BookOpen,
  MessageSquare,
  Users,
  FileJson,
  BarChart,
  File,
  Video,
  Music,
  ChevronDown,
  Eye,
  X
} from 'lucide-react';

const AIPanel = ({ meetingId, meetingData }) => {
  const { 
    aiState, 
    transcribeRecording, 
    generateMeetingMinutes, 
    getMeetingInsights, 
    extractTasksFromMinutes,
    meetingInsights,
    transcriptions,
    meetingMinutes 
  } = useAIContext();

  const [activeTab, setActiveTab] = useState('transcription');
  const [selectedRecordingIndex, setSelectedRecordingIndex] = useState(0);
  const [autoProcess, setAutoProcess] = useState(true);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  // Load insights on mount - with debouncing to prevent excessive calls
  useEffect(() => {
    if (!meetingId) return;

    let isMounted = true;
    let timeoutId = null;

    const loadInsights = async () => {
      try {
        // Check transcription status when loading insights
        await getMeetingInsights(meetingId, true);
      } catch (error) {
        console.error('Failed to load insights:', error);
      }
    };

    // Debounce: wait 500ms before calling
    timeoutId = setTimeout(() => {
      if (isMounted) {
        loadInsights();
      }
    }, 500);

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [meetingId]); // Removed getMeetingInsights from dependencies to prevent re-triggers

  // Update selected recording index when recordings change
  useEffect(() => {
    const insights = meetingInsights[meetingId];
    if (insights?.recordings && insights.recordings.length > 0) {
      // Ensure selected index is valid
      if (selectedRecordingIndex >= insights.recordings.length) {
        setSelectedRecordingIndex(0);
      }
    }
  }, [meetingInsights, meetingId, selectedRecordingIndex]);

  const handleTranscribe = async () => {
    await transcribeRecording(meetingId, selectedRecordingIndex, {
      generateMinutes: true,
      extractTasks: true,
      language: 'en-ur',
    });
  };

  const handleGenerateMinutes = async () => {
    // Generate minutes from the selected recording's transcription
    if (selectedRecording && currentTranscription) {
      // Generate minutes using the selected recording's transcription
      await generateMeetingMinutes(meetingId, {
        extractTasks: true,
        recordingIndex: selectedRecordingIndex,
        transcriptionText: currentTranscription.text || currentTranscription
      });
    } else {
      await generateMeetingMinutes(meetingId, {
        extractTasks: true
      });
    }
  };

  const handleExtractTasks = async () => {
    await extractTasksFromMinutes(meetingId);
  };


  const handleViewPDF = async () => {
    if (!currentMinutes) {
      setPdfError('No meeting minutes available. Please generate minutes first.');
      return;
    }

    setPdfLoading(true);
    setPdfError(null);
    setPdfPreviewUrl(null);

    try {
      const token = localStorage.getItem('token');
      
      // Try backend first
      try {
        const response = await aiApi.generatePDF(
          meetingId,
          selectedRecording ? selectedRecordingIndex : undefined,
          token
        );

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/pdf')) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setPdfPreviewUrl(url);
            setShowPDFPreview(true);
            setPdfLoading(false);
            return;
          } else {
            // Error response
            const errorData = await response.json().catch(() => ({ message: 'Failed to generate PDF' }));
            throw new Error(errorData.message || errorData.error || 'Backend PDF generation failed');
          }
        } else {
          const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}: Failed to generate PDF` }));
          throw new Error(errorData.message || errorData.error || `Backend PDF generation failed (${response.status})`);
        }
      } catch (backendError) {
        console.warn('Backend PDF generation failed, using client-side fallback:', backendError);
        
        // Fallback to client-side generation
        try {
          const url = generatePDFBlob(meetingData || {}, currentMinutes, {
            recordingName: selectedRecording?.fileName
          });
          setPdfPreviewUrl(url);
          setShowPDFPreview(true);
        } catch (clientError) {
          console.error('Client-side PDF generation failed:', clientError);
          setPdfError('Failed to generate PDF. Please try again.');
        }
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      setPdfError(error.message || 'Failed to generate PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleClosePDFPreview = () => {
    if (pdfPreviewUrl && pdfPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }
    setPdfPreviewUrl(null);
    setShowPDFPreview(false);
    setPdfError(null);
  };

  const downloadMinutes = async () => {
    if (!currentMinutes) {
      setPdfError('No meeting minutes available');
      return;
    }

    setPdfLoading(true);
    setPdfError(null);

    try {
      const token = localStorage.getItem('token');
      
      // Try backend first
      try {
        const response = await aiApi.generatePDF(
          meetingId,
          selectedRecording ? selectedRecordingIndex : undefined,
          token
        );

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/pdf')) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Try to get filename from Content-Disposition header
            const contentDisposition = response.headers.get('content-disposition');
            let fileName = selectedRecording 
              ? `meeting-minutes-${selectedRecording.fileName.replace(/\.[^/.]+$/, '')}-${meetingId}.pdf`
              : `meeting-minutes-${meetingData?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || meetingId}.pdf`;
            
            if (contentDisposition) {
              const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/i);
              if (fileNameMatch) {
                fileName = fileNameMatch[1];
              }
            }
            
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setPdfLoading(false);
            return;
          } else {
            // Error response
            const errorData = await response.json().catch(() => ({ message: 'Failed to generate PDF' }));
            throw new Error(errorData.message || errorData.error || 'Backend PDF generation failed');
          }
        } else {
          const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}: Failed to generate PDF` }));
          throw new Error(errorData.message || errorData.error || `Backend PDF generation failed (${response.status})`);
        }
      } catch (backendError) {
        console.warn('Backend PDF generation failed, using client-side fallback:', backendError);
        
        // Fallback to client-side generation
        try {
          downloadMeetingMinutesPDF(meetingData || {}, currentMinutes, {
            recordingName: selectedRecording?.fileName,
            fileName: selectedRecording 
              ? `meeting-minutes-${selectedRecording.fileName.replace(/\.[^/.]+$/, '')}-${meetingId}.pdf`
              : `meeting-minutes-${meetingData?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || meetingId}.pdf`
          });
        } catch (clientError) {
          console.error('Client-side PDF generation failed:', clientError);
          setPdfError('Failed to generate PDF. Please try again.');
        }
      }
    } catch (error) {
      console.error('PDF download error:', error);
      setPdfError(error.message || 'Failed to download PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  const renderStatusBadge = (status) => {
    const statusConfig = {
      completed: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" /> },
      processing: { color: 'bg-blue-100 text-blue-800', icon: <Clock className="w-4 h-4 animate-spin" /> },
      failed: { color: 'bg-red-100 text-red-800', icon: <AlertCircle className="w-4 h-4" /> },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-4 h-4" /> }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const insights = meetingInsights[meetingId];
  const recordings = insights?.recordings || [];
  const selectedRecording = recordings[selectedRecordingIndex] || null;
  const selectedTranscription = selectedRecording?.transcription || null;
  const selectedMinutes = selectedRecording?.minutes || null;
  const selectedInsights = selectedRecording?.aiInsights || null;
  const globalTranscription = transcriptions[meetingId];
  const globalMinutes = meetingMinutes[meetingId];
  const globalInsights = insights?.aiInsights || null;

  // Use per-recording data if available, otherwise fall back to global
  const currentTranscription = selectedTranscription || globalTranscription;
  const currentMinutes = selectedMinutes || globalMinutes;
  const currentInsights = selectedInsights || globalInsights;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="border-b border-gray-200">
        <div className="flex items-center gap-2 p-6">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Meeting Assistant</h2>
            <p className="text-sm text-gray-600">Transcription, summarization & insights</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('transcription')}
            className={`flex-1 py-3 text-center font-medium ${activeTab === 'transcription' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <Mic className="w-4 h-4" />
              Transcription
            </div>
          </button>
          <button
            onClick={() => setActiveTab('minutes')}
            className={`flex-1 py-3 text-center font-medium ${activeTab === 'minutes' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />
              Minutes
            </div>
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex-1 py-3 text-center font-medium ${activeTab === 'insights' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <BarChart className="w-4 h-4" />
              Insights
            </div>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Progress Indicator */}
        {aiState.processing && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {aiState.currentStep === 'transcription' && 'Transcribing audio...'}
                {aiState.currentStep === 'summarization' && 'Generating minutes...'}
                {aiState.currentStep === 'task_extraction' && 'Extracting tasks...'}
              </span>
              <span className="text-sm text-gray-500">{aiState.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${aiState.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Recording Selector - Show only if multiple recordings */}
        {recordings.length > 1 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Recording to View:
            </label>
            <div className="relative">
              <select
                value={selectedRecordingIndex}
                onChange={(e) => setSelectedRecordingIndex(parseInt(e.target.value))}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer"
              >
                {recordings.map((recording, index) => (
                  <option key={index} value={index}>
                    {recording.fileName} ({formatFileSize(recording.fileSize)}) - {recording.transcriptionStatus || 'Not transcribed'}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Selected Recording Info Card */}
        {selectedRecording && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-lg shadow-sm">
                {selectedRecording.fileType?.startsWith('video') ? (
                  <Video className="w-6 h-6 text-blue-600" />
                ) : (
                  <Music className="w-6 h-6 text-purple-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{selectedRecording.fileName}</h3>
                  {renderStatusBadge(selectedRecording.transcriptionStatus || 'pending')}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <File className="w-4 h-4" />
                    {formatFileSize(selectedRecording.fileSize)}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {selectedRecording.fileType || 'Unknown'}
                  </span>
                  {selectedRecording.uploadedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(selectedRecording.uploadedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transcription Tab */}
        {activeTab === 'transcription' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Audio Transcription</h3>
                <p className="text-sm text-gray-600">
                  {selectedRecording 
                    ? `Transcription for: ${selectedRecording.fileName}`
                    : 'Convert speech to text with timestamps'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {currentTranscription && renderStatusBadge(currentTranscription.status || selectedRecording?.transcriptionStatus || 'pending')}
                {selectedRecording && (
                  <button
                    onClick={handleTranscribe}
                    disabled={aiState.processing || selectedRecording.transcriptionStatus === 'processing'}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    {selectedRecording.transcriptionStatus === 'completed' ? 'Retranscribe' : 'Transcribe'}
                  </button>
                )}
              </div>
            </div>

            {currentTranscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <span className="text-gray-600">Language: </span>
                      <span className="font-medium">{currentTranscription.language || 'en'}</span>
                    </div>
                    {currentTranscription.confidence && (
                      <div className="text-sm">
                        <span className="text-gray-600">Confidence: </span>
                        <span className="font-medium">{(currentTranscription.confidence * 100).toFixed(1)}%</span>
                      </div>
                    )}
                    {currentTranscription.duration && (
                      <div className="text-sm">
                        <span className="text-gray-600">Duration: </span>
                        <span className="font-medium">{Math.floor(currentTranscription.duration / 60)}:{(currentTranscription.duration % 60).toString().padStart(2, '0')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transcription Text */}
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto border border-gray-200">
                  {currentTranscription.segments?.length > 0 ? (
                    currentTranscription.segments.map((segment, index) => (
                      <div key={index} className="mb-3 pb-3 border-b border-gray-200 last:border-b-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                            {new Date(segment.start * 1000).toISOString().substr(11, 8)} - {new Date(segment.end * 1000).toISOString().substr(11, 8)}
                          </span>
                          {segment.speaker && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {segment.speaker}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-800">{segment.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-800 whitespace-pre-wrap">{currentTranscription.text || 'No transcription text available'}</p>
                  )}
                </div>
              </div>
            ) : selectedRecording ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <Mic className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No transcription available for this recording</p>
                <p className="text-sm text-gray-500 mt-1">Click the "Transcribe" button above to generate transcription</p>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <Mic className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No recordings available</p>
                <p className="text-sm text-gray-500 mt-1">Upload recordings to generate transcriptions</p>
              </div>
            )}
          </div>
        )}

        {/* Minutes Tab */}
        {activeTab === 'minutes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Meeting Minutes</h3>
                <p className="text-sm text-gray-600">AI-generated summary with key points</p>
              </div>
              <div className="flex items-center gap-3">
                {currentMinutes && renderStatusBadge('completed')}
                {selectedRecording && (
                  <button
                    onClick={handleGenerateMinutes}
                    disabled={aiState.processing || !currentTranscription}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    {currentMinutes ? 'Regenerate' : 'Generate Minutes'}
                  </button>
                )}
                {currentMinutes && (
                  <>
                    {pdfError && (
                      <div className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {pdfError}
                      </div>
                    )}
                    <button
                      onClick={handleViewPDF}
                      disabled={pdfLoading}
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {pdfLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          View PDF
                        </>
                      )}
                    </button>
                    <button
                      onClick={downloadMinutes}
                      disabled={pdfLoading}
                      className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {pdfLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Download PDF
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {currentMinutes ? (
              <div className="space-y-6">
                {/* Summary */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    Summary
                  </h4>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <p className="text-gray-800">{currentMinutes.summary}</p>
                  </div>
                </div>

                {/* Key Points */}
                {currentMinutes.keyPoints && currentMinutes.keyPoints.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      Key Points
                    </h4>
                    <div className="space-y-2">
                      {currentMinutes.keyPoints.map((point, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-semibold">
                            {index + 1}
                          </div>
                          <p className="text-gray-800 flex-1">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Decisions */}
                {currentMinutes.decisions && currentMinutes.decisions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Decisions
                    </h4>
                    <div className="space-y-2">
                      {currentMinutes.decisions.map((decision, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                          <p className="text-gray-800">{decision}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Items */}
                {currentMinutes.actionItems && currentMinutes.actionItems.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-orange-600" />
                      Action Items
                    </h4>
                    <div className="space-y-3">
                      {currentMinutes.actionItems.map((item, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-medium text-gray-900">{item.text}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${item.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {item.status || 'pending'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            {item.deadline && (
                              <span>Deadline: {new Date(item.deadline).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extract Tasks Button */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={handleExtractTasks}
                    disabled={aiState.processing}
                    className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Users className="w-5 h-5" />
                    Extract Tasks from Minutes
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No meeting minutes generated</p>
                <p className="text-sm text-gray-500 mt-1">
                  Generate transcription first to create minutes
                </p>
              </div>
            )}
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Meeting Insights</h3>
                <p className="text-sm text-gray-600">Analytics and intelligence</p>
              </div>
              <button
                onClick={() => getMeetingInsights(meetingId)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {(currentInsights || insights) ? (
              <div className="space-y-6">
                {/* Statistics */}
                {insights && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Mic className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Recordings</p>
                          <p className="text-xl font-bold text-gray-900">
                            {insights.statistics?.recordingCount || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Key Points</p>
                          <p className="text-xl font-bold text-gray-900">
                            {currentMinutes?.keyPoints?.length || insights.minutes?.keyPoints?.length || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                          <Users className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Action Items</p>
                          <p className="text-xl font-bold text-gray-900">
                            {currentMinutes?.actionItems?.length || insights.minutes?.actionItems?.length || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Insights */}
                {currentInsights && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">AI Analysis</h4>
                    
                    {/* Sentiment */}
                    {currentInsights.sentiment && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">Sentiment Analysis</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            currentInsights.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                            currentInsights.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {currentInsights.sentiment}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Overall tone of the recording was {currentInsights.sentiment}
                        </p>
                      </div>
                    )}

                    {/* Topics */}
                    {currentInsights.topics && currentInsights.topics.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="font-medium text-gray-900 mb-2">Key Topics</div>
                        <div className="flex flex-wrap gap-2">
                          {currentInsights.topics.map((topic, index) => (
                            <span key={index} className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-gray-700">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <BarChart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No insights available</p>
                <p className="text-sm text-gray-500 mt-1">
                  Generate transcription and minutes to get insights
                </p>
              </div>
            )}
          </div>
        )}

        {/* Auto-process setting */}
        <div className="pt-6 mt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Auto-process recordings</h4>
              <p className="text-sm text-gray-600">Automatically transcribe and generate minutes for new recordings</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoProcess}
                onChange={(e) => setAutoProcess(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {showPDFPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Meeting Minutes - PDF Preview
              </h3>
              <div className="flex items-center gap-2">
                {pdfPreviewUrl && (
                  <button
                    onClick={downloadMinutes}
                    disabled={pdfLoading}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {pdfLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={handleClosePDFPreview}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PDF Preview Content */}
            <div className="flex-1 overflow-hidden flex items-center justify-center p-8">
              {pdfLoading ? (
                <div className="text-center">
                  <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Generating PDF...</p>
                </div>
              ) : pdfError ? (
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600 font-medium mb-2">Failed to generate PDF</p>
                  <p className="text-gray-600 text-sm mb-4">{pdfError}</p>
                  <button
                    onClick={handleViewPDF}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                </div>
              ) : pdfPreviewUrl ? (
                <iframe
                  src={pdfPreviewUrl}
                  className="w-full h-full border-0"
                  title="Meeting Minutes PDF Preview"
                />
              ) : (
                <div className="text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No PDF available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIPanel;