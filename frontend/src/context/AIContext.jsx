// src/context/AIContext.jsx - FIXED VERSION
import React, { createContext, useState, useContext, useCallback } from 'react';
import { apiRequest } from '../utils/api';

const AIContext = createContext();

export const useAIContext = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAIContext must be used within AIProvider');
  }
  return context;
};

export const AIProvider = ({ children }) => {
  const [aiState, setAiState] = useState({
    processing: false,
    currentStep: null,
    progress: 0,
    status: 'idle',
    error: null,
    result: null
  });

  const [meetingInsights, setMeetingInsights] = useState({});
  const [transcriptions, setTranscriptions] = useState({});
  const [meetingMinutes, setMeetingMinutes] = useState({});
  const [realTimeTranscripts, setRealTimeTranscripts] = useState({});
  const pollingIntervals = React.useRef({}); // Store polling intervals by meetingId
  const isPollingActive = React.useRef({}); // Track active polling status
  const pollTranscriptionStatusRef = React.useRef(null); // Ref to store polling function

  // Cleanup all polling intervals on unmount
  React.useEffect(() => {
    return () => {
      Object.values(pollingIntervals.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
      pollingIntervals.current = {};
      isPollingActive.current = {};
    };
  }, []);

  // ✅ Get token from localStorage
  const getToken = useCallback(() => {
    return localStorage.getItem('token');
  }, []);

  // ✅ Enhanced apiRequest with better error handling
  const aiRequest = useCallback(async (endpoint, method = 'GET', body = null) => {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    return apiRequest(endpoint, method, body, token);
  }, [getToken]);

  // Get meeting insights (DEFINE THIS FIRST!)
  const getMeetingInsights = useCallback(async (meetingId, checkTranscriptionStatus = false) => {
    try {
      console.log(`🔍 Fetching insights for meeting ${meetingId}`);
      const response = await aiRequest(`/ai/meetings/${meetingId}/insights`, 'GET');
      console.log('Insights response:', response);
      
      if (response.success) {
        const { insights } = response;
        setMeetingInsights(prev => ({
          ...prev,
          [meetingId]: insights
        }));

        if (insights.minutes) {
          setMeetingMinutes(prev => ({
            ...prev,
            [meetingId]: insights.minutes
          }));
        }

        if (insights.transcription) {
          setTranscriptions(prev => ({
            ...prev,
            [meetingId]: insights.transcription
          }));

          // If transcription is processing and we should check status, start polling
          if (checkTranscriptionStatus && insights.transcription.status === 'processing' && !isPollingActive.current[meetingId]) {
            console.log(`🔄 Transcription is processing, starting automatic polling...`);
            // Use ref to avoid circular dependency
            if (pollTranscriptionStatusRef.current) {
              pollTranscriptionStatusRef.current(meetingId);
            }
          }
        }

        return insights;
      } else {
        console.warn('No insights found for meeting:', meetingId);
        return null;
      }
    } catch (error) {
      console.error('Failed to get meeting insights:', error);
      return null;
    }
  }, [aiRequest]); // Removed pollTranscriptionStatus from deps to avoid circular dependency - using ref instead

  // Check AI service health
  const checkAIHealth = useCallback(async () => {
    try {
      console.log('🔍 Checking AI service health...');
      const response = await aiRequest('/ai/health', 'GET');
      console.log('AI Health Response:', response);
      return response;
    } catch (error) {
      console.error('AI health check failed:', error);
      return { 
        success: false, 
        message: 'AI service unavailable',
        error: error.message 
      };
    }
  }, [aiRequest]);

  // Poll transcription status with throttling and exponential backoff
  const pollTranscriptionStatus = useCallback(async (meetingId) => {
    // Prevent duplicate polling
    if (isPollingActive.current[meetingId]) {
      console.log(`⏸️ Polling already active for meeting ${meetingId}, skipping...`);
      return;
    }

    console.log(`🔄 Starting polling for meeting ${meetingId}`);
    
    // Mark as active
    isPollingActive.current[meetingId] = true;
    
    // Clear any existing polling for this meeting
    if (pollingIntervals.current[meetingId]) {
      console.log(`🔄 Clearing existing polling interval for meeting ${meetingId}`);
      clearInterval(pollingIntervals.current[meetingId]);
      delete pollingIntervals.current[meetingId];
    }
    
    // Get initial status and estimate file size to determine polling strategy
    let estimatedFileSizeMB = 0;
    let transcriptionStatus = null;
    
    try {
      const initialStatus = await aiRequest(`/ai/meetings/${meetingId}/transcription-status`, 'GET');
      transcriptionStatus = initialStatus.success ? initialStatus.transcription?.status : null;
      
      if (transcriptionStatus === 'completed') {
        console.log(`✅ Transcription already completed for meeting ${meetingId}, skipping polling`);
        delete isPollingActive.current[meetingId];
        setTranscriptions(prev => ({
          ...prev,
          [meetingId]: initialStatus.transcription
        }));
        await getMeetingInsights(meetingId);
        return;
      } else if (transcriptionStatus === 'pending' || !transcriptionStatus || transcriptionStatus === 'not_started') {
        // If not started yet, don't poll
        console.log(`⏸️ Transcription not started yet (status: ${transcriptionStatus}) for meeting ${meetingId}, skipping polling`);
        delete isPollingActive.current[meetingId];
        return;
      }
      
      // Try to estimate file size from recordings
      if (initialStatus.success && initialStatus.recordings?.length > 0) {
        // Estimate: roughly 1MB per minute of audio/video
        const recording = initialStatus.recordings[0];
        if (recording?.duration || recording?.fileSize) {
          estimatedFileSizeMB = recording.duration ? recording.duration / 60 : 
                                (recording.fileSize ? recording.fileSize / (1024 * 1024) : 0);
        }
      }
    } catch (error) {
      console.warn('Error checking initial transcription status:', error);
      // On error, continue with polling - it might be a temporary issue
    }
    
    // Adaptive polling interval - MUCH longer intervals to reduce API calls
    // Small files (<10MB): 60 seconds
    // Medium files (10-50MB): 120 seconds (2 minutes)
    // Large files (50-100MB): 180 seconds (3 minutes)
    // Very large files (>100MB): 300 seconds (5 minutes)
    let pollDelay = 60000; // Default 60 seconds (was 15s)
    if (estimatedFileSizeMB > 100) {
      pollDelay = 300000; // 5 minutes for very large files
    } else if (estimatedFileSizeMB > 50) {
      pollDelay = 180000; // 3 minutes for large files
    } else if (estimatedFileSizeMB > 10) {
      pollDelay = 120000; // 2 minutes for medium files
    }
    
    console.log(`📊 Estimated file size: ${estimatedFileSizeMB.toFixed(1)}MB, using ${pollDelay / 1000}s (${pollDelay / 60000}min) polling interval`);
    
    let pollCount = 0;
    // Calculate max polls based on estimated timeout (up to 60 minutes max)
    const estimatedMaxDuration = estimatedFileSizeMB > 100 ? 60 : estimatedFileSizeMB > 50 ? 45 : estimatedFileSizeMB > 10 ? 30 : 15;
    const maxPolls = Math.ceil((estimatedMaxDuration * 60 * 1000) / pollDelay);
    let isStopped = false;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;
    
    const poll = async () => {
      if (isStopped) {
        return;
      }
      
      pollCount++;
      
      // Stop polling after max polls
      if (pollCount > maxPolls) {
        isStopped = true;
        if (pollingIntervals.current[meetingId]) {
          clearInterval(pollingIntervals.current[meetingId]);
          delete pollingIntervals.current[meetingId];
        }
        delete isPollingActive.current[meetingId];
        setAiState(prev => ({
          ...prev,
          processing: false,
          status: 'timeout',
          error: 'Transcription timeout - taking longer than expected'
        }));
        console.log(`⏰ Polling timeout after ${maxPolls} attempts`);
        return;
      }
      
      try {
        const statusResponse = await aiRequest(`/ai/meetings/${meetingId}/transcription-status`, 'GET');
        
        // Reset error count on successful request
        consecutiveErrors = 0;
        
        if (statusResponse.success) {
          const { transcription } = statusResponse;
          
          if (transcription?.status === 'completed') {
            if (!isStopped) {
              isStopped = true;
              if (pollingIntervals.current[meetingId]) {
                clearInterval(pollingIntervals.current[meetingId]);
                delete pollingIntervals.current[meetingId];
              }
              delete isPollingActive.current[meetingId];
              
              setAiState(prev => ({
                ...prev,
                processing: false,
                progress: 100,
                status: 'completed',
                result: transcription
              }));
              
              // Update local state
              setTranscriptions(prev => ({
                ...prev,
                [meetingId]: transcription
              }));

              // Fetch updated insights
              await getMeetingInsights(meetingId);
              
              console.log(`✅ Transcription completed for meeting ${meetingId}, polling stopped`);
            }
          } else if (transcription?.status === 'processing') {
            setAiState(prev => ({
              ...prev,
              progress: Math.min(prev.progress + 2, 90),
              status: 'processing'
            }));
          } else if (transcription?.status === 'failed') {
            if (!isStopped) {
              isStopped = true;
              if (pollingIntervals.current[meetingId]) {
                clearInterval(pollingIntervals.current[meetingId]);
                delete pollingIntervals.current[meetingId];
              }
              delete isPollingActive.current[meetingId];
              
              setAiState(prev => ({
                ...prev,
                processing: false,
                status: 'error',
                error: 'Transcription failed'
              }));
              
              console.log(`❌ Transcription failed for meeting ${meetingId}, polling stopped`);
            }
          } else if (transcription?.status === 'pending') {
            // Still pending, continue polling
            setAiState(prev => ({
              ...prev,
              progress: Math.min(prev.progress + 1, 85),
              status: 'processing'
            }));
          }
        }
      } catch (error) {
        consecutiveErrors++;
        console.warn(`⚠️ Polling error (${consecutiveErrors}/${maxConsecutiveErrors}):`, error.message);
        
        // Stop polling after too many consecutive errors
        if (consecutiveErrors >= maxConsecutiveErrors) {
          if (!isStopped) {
            isStopped = true;
            if (pollingIntervals.current[meetingId]) {
              clearInterval(pollingIntervals.current[meetingId]);
              delete pollingIntervals.current[meetingId];
            }
            delete isPollingActive.current[meetingId];
            setAiState(prev => ({
              ...prev,
              processing: false,
              status: 'error',
              error: `Polling failed: ${error.message}`
            }));
            console.error(`❌ Stopped polling after ${maxConsecutiveErrors} consecutive errors`);
          }
        }
      }
    };

    // Initial poll
    await poll();

    // Set up adaptive polling with longer intervals for large files
    // This reduces server load significantly
    const pollInterval = setInterval(() => {
      poll();
    }, pollDelay);
    
    console.log(`⏱️ Polling will check status every ${pollDelay / 1000} seconds (max ${maxPolls} checks)`);

    // Store the interval reference
    pollingIntervals.current[meetingId] = pollInterval;
  }, [aiRequest, getMeetingInsights]);

  // Store the polling function in ref so it can be called from getMeetingInsights
  pollTranscriptionStatusRef.current = pollTranscriptionStatus;

  // Transcribe recording
  const transcribeRecording = useCallback(async (meetingId, recordingIndex = 0, options = {}) => {
    console.log(`🎙️ Starting transcription for meeting ${meetingId}, recording ${recordingIndex}`);
    
    setAiState(prev => ({ 
      ...prev, 
      processing: true, 
      currentStep: 'transcription', 
      progress: 0,
      status: 'processing'
    }));

    try {
      // Ensure language defaults to English
      const requestOptions = {
        ...options,
        language: options.language || 'en'
      };
      
      const response = await aiRequest(
        `/ai/meetings/${meetingId}/transcribe/${recordingIndex}`,
        'POST',
        requestOptions
      );

      console.log('Transcription response:', response);

      if (response.success) {
        // Start polling for progress
        pollTranscriptionStatus(meetingId);
        return response;
      } else {
        throw new Error(response.error || 'Transcription failed');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setAiState(prev => ({
        ...prev,
        processing: false,
        error: error.message,
        status: 'error'
      }));
      return { 
        success: false, 
        error: error.message,
        message: 'Failed to start transcription'
      };
    }
  }, [aiRequest, pollTranscriptionStatus]);

  // Generate minutes from transcription
  const generateMeetingMinutes = useCallback(async (meetingId, options = {}) => {
    console.log(`📝 Generating minutes for meeting ${meetingId}`);
    
    setAiState(prev => ({ 
      ...prev, 
      processing: true, 
      currentStep: 'summarization', 
      progress: 0,
      status: 'processing'
    }));

    try {
      const response = await aiRequest(
        `/ai/meetings/${meetingId}/regenerate-minutes`,
        'POST',
        options
      );

      console.log('Minutes generation response:', response);

      if (response.success) {
        // Update progress
        setAiState(prev => ({
          ...prev,
          progress: 100,
          status: 'completed'
        }));

        // Fetch updated meeting insights
        await getMeetingInsights(meetingId);
        return { success: true, message: 'Minutes generated successfully' };
      } else {
        throw new Error(response.error || 'Minutes generation failed');
      }
    } catch (error) {
      console.error('Minutes generation error:', error);
      setAiState(prev => ({
        ...prev,
        processing: false,
        error: error.message,
        status: 'error'
      }));
      return { success: false, error: error.message };
    }
  }, [aiRequest, getMeetingInsights]);

  // Extract tasks from minutes
  const extractTasksFromMinutes = useCallback(async (meetingId) => {
    console.log(`📋 Extracting tasks for meeting ${meetingId}`);
    
    setAiState(prev => ({ 
      ...prev, 
      processing: true, 
      currentStep: 'task_extraction', 
      progress: 0,
      status: 'processing'
    }));

    try {
      // First get insights
      const insights = await getMeetingInsights(meetingId);
      
      if (!insights?.minutes?.summary) {
        throw new Error('No meeting minutes available');
      }

      // In a real implementation, you would call your AI service here
      // For now, simulate task extraction
      setTimeout(() => {
        setAiState(prev => ({ 
          ...prev, 
          processing: false, 
          progress: 100,
          status: 'completed' 
        }));
      }, 2000);

      return {
        success: true,
        tasks: [],
        message: 'Task extraction completed'
      };
    } catch (error) {
      console.error('Task extraction error:', error);
      setAiState(prev => ({
        ...prev,
        processing: false,
        error: error.message,
        status: 'error'
      }));
      return { success: false, error: error.message };
    }
  }, [getMeetingInsights]);

  // Add real-time transcript
  const addRealTimeTranscript = useCallback((meetingId, transcript) => {
    console.log('📝 Adding real-time transcript:', transcript);
    setRealTimeTranscripts(prev => {
      const currentTranscripts = prev[meetingId] || [];
      return {
        ...prev,
        [meetingId]: [...currentTranscripts, transcript]
      };
    });
  }, []);

  // Clear real-time transcripts
  const clearRealTimeTranscripts = useCallback((meetingId) => {
    setRealTimeTranscripts(prev => {
      const newTranscripts = { ...prev };
      delete newTranscripts[meetingId];
      return newTranscripts;
    });
  }, []);

  // Reset AI state
  const resetAIState = useCallback(() => {
    setAiState({
      processing: false,
      currentStep: null,
      progress: 0,
      status: 'idle',
      error: null,
      result: null
    });
  }, []);

  // Clear meeting AI data
  const clearMeetingAIData = useCallback((meetingId) => {
    setMeetingInsights(prev => {
      const newInsights = { ...prev };
      delete newInsights[meetingId];
      return newInsights;
    });
    
    setTranscriptions(prev => {
      const newTranscriptions = { ...prev };
      delete newTranscriptions[meetingId];
      return newTranscriptions;
    });
    
    setMeetingMinutes(prev => {
      const newMinutes = { ...prev };
      delete newMinutes[meetingId];
      return newMinutes;
    });

    clearRealTimeTranscripts(meetingId);
  }, [clearRealTimeTranscripts]);

  const value = {
    aiState,
    meetingInsights,
    transcriptions,
    meetingMinutes,
    realTimeTranscripts,
    checkAIHealth,
    transcribeRecording,
    generateMeetingMinutes,
    getMeetingInsights,
    extractTasksFromMinutes,
    addRealTimeTranscript,
    clearRealTimeTranscripts,
    resetAIState,
    clearMeetingAIData,
    updateAIProgress: (progress) => {
      setAiState(prev => ({ ...prev, progress }));
    }
  };

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
};