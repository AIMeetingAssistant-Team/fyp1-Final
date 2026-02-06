import { useState, useEffect, useContext, useRef } from 'react';
import { apiRequest } from '../utils/api.js'
import { useAIContext } from '../context/AIContext';
import { AuthContext } from '../context/AuthContext.jsx';
import { motion } from "framer-motion";
import {
  Video,
  Music,
  Calendar,
  Users,
  FileText,
  CheckCircle,
  Download,
  Trash2,
  X,
  Plus,
  File,
  Check,
  XCircle,
  AlertCircle,
  Loader2,
  Mic,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const fadeInUp = {
  hidden: { y: 10, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};


const UploadRecordings = () => {
  const navigate = useNavigate()
  const { user } = useContext(AuthContext);
  const { transcribeRecording, generateMeetingMinutes } = useAIContext();

  const [loading, setLoading] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [errors, setErrors] = useState({});
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    agenda: '',
    date: new Date().toISOString().split('T')[0],
    participants: [],
  });
  const [newEmail, setNewEmail] = useState('');
  const [recordingFiles, setRecordingFiles] = useState([]);
  const [viewMode, setViewMode] = useState('create');
  const [uploadProgress, setUploadProgress] = useState({});
  const [currentUploadingFile, setCurrentUploadingFile] = useState(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [autoProcessAI, setAutoProcessAI] = useState(true);
  // ======== ADD THESE 2 LINES ========
  const [currentDownloadingFile, setCurrentDownloadingFile] = useState(null);
  const [showDownloadProgress, setShowDownloadProgress] = useState(false);
  const [transcribingRecordings, setTranscribingRecordings] = useState(new Set());
  // ======== END ADD ========

  // Add ref for the progress section
  const progressSectionRef = useRef(null);
  const [showProgressSection, setShowProgressSection] = useState(false);

  const ALLOWED_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"];
  const ALLOWED_FILE_TYPES = [
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/x-m4a', 'audio/aac', 'audio/flac'
  ];
  const MAX_TOTAL_SIZE = 1000 * 1024 * 1024;


  useEffect(() => {
    fetchMeetings();
  }, []);

  useEffect(() => {
    console.log('Current meetings in state:', meetings);
  }, [meetings]);

  // Auto-hide notifications after 5 seconds
  useEffect(() => {
    if (showSuccessNotification) {
      const timer = setTimeout(() => {
        setShowSuccessNotification(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessNotification]);

  useEffect(() => {
    if (showErrorNotification) {
      const timer = setTimeout(() => {
        setShowErrorNotification(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showErrorNotification]);

  const showNotification = (type, message) => {
    if (type === 'success') {
      setSuccessMessage(message);
      setShowSuccessNotification(true);
    } else {
      setErrorMessage(message);
      setShowErrorNotification(true);
    }
  };

  const getToken = () => {
    return localStorage.getItem('token');
  };

  const fetchMeetings = async () => {
    try {
      const token = getToken();
      // Add limit=50 to get more meetings
      const data = await apiRequest('/meetings?limit=50', 'GET', null, token);

      if (data.success) {
        const userId = user?.id || user?._id;

        const uploadMeetings = data.meetings.filter(meeting => {
          if (meeting.meetingType !== 'upload') return false;

          const isHost = meeting.host?._id === userId;
          const isParticipant = meeting.participants?.some(participant => {
            const participantId = participant?._id ||
              participant?.user?._id;
            return participantId === userId;
          });

          return isHost || isParticipant;
        });

        // Meetings are already sorted by createdAt DESC from backend
        setMeetings(uploadMeetings);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    }
  };
  const isValidEmail = (email) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) return false;
    const domain = email.split("@")[1].toLowerCase();
    return ALLOWED_DOMAINS.includes(domain);
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === "," || e.key === "Enter") {
      e.preventDefault();
      const email = newEmail.trim();
      if (!email) return;

      if (!isValidEmail(email)) {
        setErrors((prev) => ({ ...prev, participants: "Invalid email or domain" }));
        return;
      }

      if (newMeeting.participants?.includes(email)) {
        setErrors((prev) => ({ ...prev, participants: "Duplicate email" }));
        return;
      }

      setNewMeeting((prev) => ({
        ...prev,
        participants: [...(prev.participants || []), email],
      }));
      setNewEmail("");
      setErrors((prev) => ({ ...prev, participants: "" }));
    }
  };

  const removeParticipant = (email) => {
    setNewMeeting(prev => ({
      ...prev,
      participants: prev.participants.filter(e => e !== email)
    }));
  };

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    let totalSize = recordingFiles.reduce((sum, file) => sum + file.size, 0);
    const newErrors = { ...errors };

    for (const file of files) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        newErrors.files = 'Invalid file type. Allowed: MP4, MPEG, MOV, AVI, MKV, MP3, WAV, OGG, M4A, AAC, FLAC';
        setErrors(newErrors);
        return;
      }

      if (file.size > 500 * 1024 * 1024) {
        newErrors.files = `File "${file.name}" is too large. Maximum size per file is 500MB`;
        setErrors(newErrors);
        return;
      }

      totalSize += file.size;
      if (totalSize > MAX_TOTAL_SIZE) {
        newErrors.files = `Total files size exceeds 1GB limit. Current: ${formatFileSize(totalSize)}`;
        setErrors(newErrors);
        return;
      }
    }

    setRecordingFiles(prev => [...prev, ...files]);
    setErrors(prev => ({ ...prev, files: '' }));
  };

  const removeFile = (index) => {
    setRecordingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validateMeetingForm = () => {
    const newErrors = {};

    if (!newMeeting.title.trim()) newErrors.title = 'Title is required';
    if (newMeeting.title.length > 200) newErrors.title = 'Title must be less than 200 characters';
    if (!newMeeting.agenda.trim()) newErrors.agenda = 'Agenda is required';
    if (newMeeting.agenda.length > 2000) newErrors.agenda = 'Agenda must be less than 2000 characters';
    if (!newMeeting.date) newErrors.date = 'Date is required';
    if (recordingFiles.length === 0) newErrors.files = 'Please upload at least one recording file';
    if (newMeeting.participants.length === 0) newErrors.participants = 'At least one participant is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Function to scroll to progress section
  const scrollToProgressSection = () => {
    if (progressSectionRef.current) {
      progressSectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Add this helper function 
  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Updated uploadFileWithXHR function - uses your backend endpoint
  const uploadFileWithXHR = (file, meetingId, fileIndex, totalFiles) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('recordings', file);

      const token = getToken();

      xhr.open('POST', `${import.meta.env.VITE_BASE_URL}/recordings/${meetingId}/upload-multiple`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: {
              percent: percentComplete,
              loaded: event.loaded,
              total: event.total,
              fileIndex,
              totalFiles
            }
          }));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 207) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              resolve(response);
            } else {
              reject(new Error(response.message || 'Upload failed'));
            }
          } catch (error) {
            reject(new Error('Invalid server response'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.ontimeout = () => reject(new Error('Upload timeout - try a smaller file or better connection'));

      // Increase timeout for large files (5 minutes base + size based)
      const baseTimeout = 5 * 60 * 1000; // 5 minutes base
      const sizeTimeout = Math.ceil(file.size / (100 * 1024 * 1024)) * 60 * 1000;
      xhr.timeout = baseTimeout + sizeTimeout;

      // Set current uploading file for display
      setCurrentUploadingFile({
        name: file.name,
        size: file.size,
        index: fileIndex + 1,
        total: totalFiles
      });

      xhr.send(formData);
    });
  };

  const createUploadMeeting = async () => {
    if (!validateMeetingForm()) return;

    setLoading(true);
    setUploadProgress({});
    setCurrentUploadingFile(null);
    setShowProgressSection(true);

    setTimeout(() => {
      scrollToProgressSection();
    }, 100);

    try {
      const token = getToken();
      if (!token) throw new Error('No authentication token found. Please log in again.');

      // 1. FIRST: Create the meeting
      console.log('📝 Creating meeting...');
      const meetingResponse = await apiRequest('/meetings/upload', 'POST', {
        title: newMeeting.title,
        description: newMeeting.description || '',
        meetingType: 'upload',
        agenda: newMeeting.agenda,
        date: newMeeting.date,
        emails: newMeeting.participants,
        autoProcessAI: autoProcessAI // Send autoProcessAI setting
      }, token);

      if (!meetingResponse.success) {
        throw new Error(meetingResponse.message || 'Failed to create meeting');
      }

      const meetingId = meetingResponse.meeting._id;
      console.log('✅ Meeting created with ID:', meetingId);

      // 2. SECOND: Upload files (if any)
      if (recordingFiles.length > 0) {
        console.log(`📤 Uploading ${recordingFiles.length} files...`);

        const uploadResults = [];
        const failedUploads = [];

        for (let i = 0; i < recordingFiles.length; i++) {
          const file = recordingFiles[i];

          try {
            // Upload file
            const result = await uploadFileWithXHR(file, meetingId, i, recordingFiles.length);

            if (result.success) {
              uploadResults.push({
                fileName: file.name,
                success: true,
                message: 'Uploaded successfully'
              });
              
              // Note: Transcription is handled automatically by backend based on autoProcessAI setting
              // No need to manually trigger here
            }
          } catch (error) {
            console.error(`❌ Error uploading ${file.name}:`, error);
            failedUploads.push({
              fileName: file.name,
              error: error.message
            });
            showNotification('error', `Failed to upload "${file.name}": ${error.message}`);
          }
        }

        // Show summary of upload results
        if (uploadResults.length > 0) {
          const successMessage = failedUploads.length > 0
            ? `${uploadResults.length} file(s) uploaded successfully. ${failedUploads.length} failed.`
            : `All ${uploadResults.length} file(s) uploaded successfully!`;
          showNotification('success', successMessage);
        }

        // Clear progress after uploads complete
        setUploadProgress({});
        setCurrentUploadingFile(null);
        
        // Refresh meetings to show the newly uploaded meeting
        await fetchMeetings();
      } else {
        // No files, just refresh meetings
        await fetchMeetings();
        showNotification('success', 'Meeting created successfully!');
      }

      // 4. Reset form and switch view
      setNewMeeting({
        title: '',
        description: '',
        agenda: '',
        date: new Date().toISOString().split('T')[0],
        participants: [],
      });
      setRecordingFiles([]);
      setUploadProgress({});
      setCurrentUploadingFile(null);
      setShowProgressSection(false);
      setViewMode('view');
      
      // Scroll to top to show the meetings list
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error('❌ Error creating meeting:', error);
      showNotification('error', `Error: ${error.message}`);
      setErrors({ submit: error.message });
      setUploadProgress({});
      setCurrentUploadingFile(null);
      setShowProgressSection(false);
    } finally {
      setLoading(false);
      // Clear progress if all uploads are done
      if (Object.keys(uploadProgress).length === 0) {
        setShowProgressSection(false);
      }
    }
  };

  const handleDownloadRecording = async (meetingId, recordingIndex = 0, fileName = 'recording') => {
    try {
      const token = getToken();

      // ======== ADD THIS: Show downloading state ========
      setCurrentDownloadingFile({
        name: fileName,
        meetingId,
        index: recordingIndex
      });
      setShowDownloadProgress(true);
      // ======== END ADD ========

      // Start the download
      const response = await fetch(
        `${import.meta.env.VITE_BASE_URL}/recordings/${meetingId}/download/${recordingIndex}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Show success
      showNotification('success', `"${fileName}" downloaded successfully!`);

    } catch (error) {
      console.error('Download error:', error);
      showNotification('error', `Download failed: ${error.message}`);
    } finally {
      // ======== ADD THIS: Hide progress after 2 seconds ========
      setTimeout(() => {
        setCurrentDownloadingFile(null);
        setShowDownloadProgress(false);
      }, 2000);
      // ======== END ADD ========
    }
  };

  const handleDeleteRecording = async (meetingId) => {
    if (!window.confirm('Are you sure you want to delete this recorded meeting and all its files? This action cannot be undone.')) return;

    try {
      const token = getToken();
      const data = await apiRequest(`/recordings/${meetingId}`, 'DELETE', null, token);

      if (data.success) {
        await fetchMeetings();
        showNotification('success', 'Recorded meeting deleted successfully');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showNotification('error', 'Failed to delete recording');
    }
  };

  // Handle transcription for a specific recording
  const handleTranscribeRecording = async (meetingId, recordingIndex, fileName) => {
    const recordingKey = `${meetingId}-${recordingIndex}`;

    // Check if already transcribing
    if (transcribingRecordings.has(recordingKey)) {
      return;
    }

    try {
      // Add to transcribing set
      setTranscribingRecordings(prev => new Set(prev).add(recordingKey));
      showNotification('success', `Starting transcription for "${fileName}"...`);

      // Call transcription API with summary generation (language set to English)
      const result = await transcribeRecording(meetingId, recordingIndex, {
        generateMinutes: true, // This will generate summary
        language: 'en', // Ensure English language
        extractTasks: false,   // We can enable this if needed
      });

      if (result.success) {
        showNotification('success', `"${fileName}" transcription and summary generated successfully! Check the meeting details to view results.`);
        // Refresh meetings to get updated transcription status
        await fetchMeetings();
      } else {
        throw new Error(result.message || 'Transcription failed');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      showNotification('error', `Failed to transcribe "${fileName}": ${error.message || 'Unknown error'}`);
    } finally {
      // Remove from transcribing set after a delay
      setTimeout(() => {
        setTranscribingRecordings(prev => {
          const newSet = new Set(prev);
          newSet.delete(recordingKey);
          return newSet;
        });
      }, 1000);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Replace the formatMeetingDate function with this:
  const formatMeetingDate = (meeting) => {
    // Use startTime instead of date (your model doesn't have date field)
    const dateStr = meeting.startTime || meeting.createdAt;

    if (!dateStr) return 'Date not available';

    try {
      const dateObj = new Date(dateStr);
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const calculateTotalSize = () => {
    return recordingFiles.reduce((total, file) => total + file.size, 0);
  };

  // Function to get progress bar color based on percentage
  const getProgressColor = (percent) => {
    if (percent < 30) return 'bg-blue-500';
    if (percent < 70) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gradient-to-b from-white to-gray-50 w-full"
    >
      {/* Header with Minimal Design - Enhanced */}
      <motion.div
        variants={fadeInUp}
        className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200/60 px-4 sm:px-6 md:px-8 lg:px-12 py-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Workspace Title with Vertical Line and Glow Effect */}
            <motion.div
              className="relative group"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Vertical Thick Line */}
                <motion.div
                  className="hidden sm:block w-1 h-8 bg-gray-900/95 rounded-full origin-bottom"
                  whileHover={{ scaleY: 1.2 }}
                  transition={{ duration: 0.2 }}
                />

                {/* Cyan Glow Effect on Hover */}
                <motion.div
                  className="absolute -left-2 sm:left-1 top-1/2 -translate-y-1/2 w-0 h-0 rounded-full bg-cyan-500/20 blur-xl"
                  initial={{ width: 0, height: 0 }}
                  whileHover={{
                    width: "100px",
                    height: "100px",
                    opacity: [0, 0.3, 0.1]
                  }}
                  transition={{ duration: 0.3 }}
                />

                <h1 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent relative z-10">
                  Upload Recording
                </h1>
              </div>
            </motion.div>
          </div>

          <motion.button
            whileHover={{ x: -2, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors group"
          >
            <motion.div
              className="p-1.5 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors"
              whileHover={{ rotate: -5 }}
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.div>
            <span className="text-sm font-medium hidden sm:inline">Back</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Success Notification */}
      {showSuccessNotification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Check className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{successMessage}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setShowSuccessNotification(false)}
                  className="inline-flex text-green-400 hover:text-green-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {showErrorNotification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{errorMessage}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setShowErrorNotification(false)}
                  className="inline-flex text-red-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download Progress Notification */}
      {showDownloadProgress && currentDownloadingFile && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in">
          <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800">Downloading file</p>
                <p className="text-xs text-blue-600 truncate max-w-xs mt-1">
                  {currentDownloadingFile.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Upload Recorded Meetings</h1>
          <p className="text-gray-600 mt-2">
            Share pre-recorded audio/video meetings with participants
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setViewMode('create')}
            className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'create' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Create New Recorded Meeting
          </button>
          <button
            onClick={() => setViewMode('view')}
            className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'view' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            View Recordings
          </button>
        </div>

        {/* Upload Progress Indicator - Add ref here */}
        <div ref={progressSectionRef}>
          {(showProgressSection || Object.keys(uploadProgress).length > 0) && (
            <div className="mb-8 bg-white rounded-xl shadow-md p-6 border border-gray-200">
              {/* Show a loading state if no progress yet */}
              {Object.keys(uploadProgress).length === 0 && (
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Preparing upload...
                  </h3>
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                </div>
              )}

              {Object.keys(uploadProgress).length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Uploading Files
                      {currentUploadingFile && (
                        <span className="text-sm font-normal text-gray-600 ml-2">
                          ({currentUploadingFile.index} of {currentUploadingFile.total})
                        </span>
                      )}
                    </h3>
                    {loading && (
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    )}
                  </div>

                  {/* Current File Progress */}
                  {currentUploadingFile && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {currentUploadingFile.name.endsWith('.mp4') || currentUploadingFile.name.endsWith('.mov') ? (
                            <Video className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Music className="h-4 w-4 text-green-500" />
                          )}
                          <span className="text-sm font-medium text-gray-700 truncate max-w-xs">
                            {currentUploadingFile.name}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatFileSize(currentUploadingFile.size)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(uploadProgress[currentUploadingFile.name]?.percent || 0)}`}
                          style={{ width: `${uploadProgress[currentUploadingFile.name]?.percent || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500">
                          {uploadProgress[currentUploadingFile.name]?.percent || 0}%
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatFileSize(uploadProgress[currentUploadingFile.name]?.loaded || 0)} / {formatFileSize(uploadProgress[currentUploadingFile.name]?.total || 0)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Overall Progress */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                      <span className="text-sm text-gray-500">
                        {Object.values(uploadProgress).filter(p => p.percent === 100).length} of {recordingFiles.length} completed
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                        style={{
                          width: `${(Object.values(uploadProgress).filter(p => p.percent === 100).length / recordingFiles.length) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        {/* Create New Recorded Meeting */}
        {viewMode === 'create' && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-6">Create Recorded Meeting</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Meeting Details */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Title *
                  </label>
                  <input
                    type="text"
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, title: e.target.value }))}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.title ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'}`}
                    placeholder="Enter meeting title"
                    maxLength={200}
                  />
                  {errors.title && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.title}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agenda *
                  </label>
                  <textarea
                    value={newMeeting.agenda}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, agenda: e.target.value }))}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.agenda ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'}`}
                    rows="4"
                    placeholder="What was discussed in this recorded meeting..."
                    maxLength={2000}
                  />
                  <div className="flex justify-between mt-1.5">
                    {errors.agenda ? (
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.agenda}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">Describe what was discussed</p>
                    )}
                    <p className="text-sm text-gray-500">
                      {newMeeting.agenda.length}/2000
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newMeeting.description}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors hover:border-gray-400"
                    rows="3"
                    placeholder="Additional details about the recorded meeting..."
                    maxLength={1000}
                  />
                  {/* Participants */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="inline w-4 h-4 mr-1" />
                    Participants *
                  </label>
                  <div className={`border rounded-lg p-2 transition-colors ${errors.participants ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {newMeeting.participants.map((email, index) => (
                        <div
                          key={index}
                          className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full border border-blue-200"
                        >
                          <span className="text-sm">{email}</span>
                          <button
                            type="button"
                            onClick={() => removeParticipant(email)}
                            className="ml-1.5 text-blue-600 hover:text-blue-800 transition-colors"
                            disabled={loading}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={handleEmailKeyDown}
                      className="w-full px-3 py-2 border-0 focus:ring-0 focus:outline-none bg-transparent"
                      placeholder="Enter participant email and press comma or enter..."
                      disabled={loading}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    {errors.participants ? (
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.participants}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Enter email and press comma or enter to add
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      {newMeeting.participants.length} participant(s)
                    </p>
                  </div>
                </div>
                </div>

              </div>

              {/* Right Column - Date, Participants & File Upload */}
              <div className="space-y-6">
                {/* Date Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline w-4 h-4 mr-1" />
                    Meeting Date *
                  </label>
                  <input
                    type="date"
                    value={newMeeting.date}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, date: e.target.value }))}
                    onFocus={(e) => e.target.showPicker()}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.date ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'}`}
                  />
                  <p className="text-sm text-gray-500 mt-1.5">
                    Select the date when this meeting originally occurred (past dates allowed)
                  </p>
                  {errors.date && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.date}
                    </p>
                  )}
                </div>

                {/* Multiple File Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Recordings * (Multiple files allowed)
                  </label>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/50">
                    <input
                      type="file"
                      id="create-recordings"
                      className="hidden"
                      accept=".mp4,.mov,.avi,.mkv,.mp3,.wav,.ogg,.m4a,.aac,.flac"
                      onChange={handleFilesChange}
                      disabled={loading}
                      multiple
                    />
                    <label
                      htmlFor="create-recordings"
                      className="cursor-pointer inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Files
                    </label>

                    <p className="text-sm text-gray-500 mt-4">
                      Max 1GB total • Max 500MB per file
                    </p>
                    <p className="text-sm text-gray-500">
                      Supported: MP4, MOV, AVI, MKV, MP3, WAV, OGG, M4A, AAC, FLAC
                    </p>
                  </div>

                  {errors.files && (
                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg mt-3">
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1.5 flex-shrink-0" />
                        {errors.files}
                      </p>
                    </div>
                  )}

                  {/* Display selected files */}
                  {recordingFiles.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-gray-700">
                          Selected Files ({recordingFiles.length})
                        </h3>
                        <span className="text-sm text-gray-500">
                          Total: {formatFileSize(calculateTotalSize())}
                        </span>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {recordingFiles.map((file, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between border border-gray-200">
                            <div className="flex items-center flex-1 min-w-0">
                              {file.type.startsWith('video') ? (
                                <Video className="w-4 h-4 text-blue-600 mr-2.5 flex-shrink-0" />
                              ) : (
                                <Music className="w-4 h-4 text-green-600 mr-2.5 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                  {file.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(file.size)} • {file.type.split('/')[1].toUpperCase()}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="ml-2 text-gray-400 hover:text-red-500 transition-colors p-1"
                              disabled={loading}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>


                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div>
                    <h4 className="font-medium text-blue-700">AI Auto-processing</h4>
                    <p className="text-sm text-blue-600">Automatically transcribe and generate minutes after upload</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoProcessAI}
                      onChange={(e) => setAutoProcessAI(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Permissions Info */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="font-medium text-blue-700">Permissions</span>
                  </div>
                  <div className="mt-2 space-y-1.5 text-sm text-blue-600">
                    <p className="flex items-start">
                      <span className="mr-1.5">•</span>
                      All participants can view and download recordings
                    </p>
                    <p className="flex items-start">
                      <span className="mr-1.5">•</span>
                      Only the uploader/host can delete recordings
                    </p>
                    <p className="flex items-start">
                      <span className="mr-1.5">•</span>
                      Multiple audio/video files can be uploaded at once
                    </p>
                    <p className="flex items-start">
                      <span className="mr-1.5">•</span>
                      Past dates are allowed for historical meetings
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              {errors.submit && (
                <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1.5 flex-shrink-0" />
                    {errors.submit}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setNewMeeting({
                      title: '',
                      description: '',
                      agenda: '',
                      date: new Date().toISOString().split('T')[0],
                      participants: [],
                    });
                    setRecordingFiles([]);
                    setErrors({});
                  }}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                  disabled={loading}
                >
                  Clear Form
                </button>
                <button
                  onClick={createUploadMeeting}
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Recorded Meeting'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Recordings */}
        {viewMode === 'view' && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Recorded Meetings</h2>
              <button
                onClick={() => setViewMode('create')}
                className="flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Recorded Meeting
              </button>
            </div>

            {meetings.filter(m => m.meetingType === 'upload').length === 0 ? (
              <div className="text-center py-12">
                <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No recorded meetings available</p>
                <p className="text-sm text-gray-500 mb-6">
                  Create your first recorded meeting by clicking the button above
                </p>
                <button
                  onClick={() => setViewMode('create')}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Create New Recorded Meeting
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {meetings
                  .filter(m => m.meetingType === 'upload')
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Sort by newest first
                  .map(meeting => {
                    const isHost = meeting.host._id === user?._id;
                    const recordings = meeting.recordings || (meeting.recordingFile ? [meeting.recordingFile] : []);

                    return (
                      <div key={meeting._id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        {/* Meeting Header with Details */}
                        <div className="bg-gray-50 p-6 border-b border-gray-200">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <h3 className="text-xl font-semibold text-gray-800 mb-2">{meeting.title}</h3>

                              {/* Meeting Metadata */}
                              <div className="flex flex-wrap gap-4 items-center text-sm text-gray-600 mb-3">
                                <div className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-1.5" />
                                  <span>{formatMeetingDate(meeting)}</span>
                                </div>

                                <div className="flex items-center">
                                  <Users className="w-4 h-4 mr-1.5" />
                                  <span>{meeting.participants?.length || 0} participants</span>
                                </div>

                                <div className="flex items-center">
                                  <File className="w-4 h-4 mr-1.5" />
                                  <span>{recordings.length} recording{recordings.length !== 1 ? 's' : ''}</span>
                                </div>
                              </div>

                              {/* Agenda and Description */}
                              <div className="space-y-3">
                                {meeting.agenda && (
                                  <div>
                                    <h4 className="font-medium text-gray-700 mb-1">Agenda:</h4>
                                    <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                                      {meeting.agenda}
                                    </p>
                                  </div>
                                )}

                                {meeting.description && (
                                  <div>
                                    <h4 className="font-medium text-gray-700 mb-1">Description:</h4>
                                    <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                                      {meeting.description}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Delete button for host */}
                            {isHost && (
                              <button
                                onClick={() => handleDeleteRecording(meeting._id)}
                                className="flex items-center px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 border border-red-200 transition-colors ml-4"
                              >
                                <Trash2 className="w-4 h-4 mr-1.5" />
                                Delete Meeting
                              </button>
                            )}
                          </div>

                          {/* Participants List */}
                          {meeting.participants && meeting.participants.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                                <Users className="w-4 h-4 mr-1.5" />
                                Participants:
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {meeting.participants.map((participant, index) => {
                                  // Check if participant is an object with user property or just an email string
                                  const email = participant.email || participant.user?.email || participant;
                                  const name = participant.name || participant.user?.name || '';

                                  return (
                                    <div
                                      key={index}
                                      className="flex items-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100 text-sm"
                                    >
                                      {name && <span className="font-medium mr-1">{name}:</span>}
                                      <span>{email}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Recordings Section */}
                        <div className="p-6">
                          <h4 className="font-medium text-gray-700 mb-4 flex items-center">
                            <Video className="w-5 h-5 mr-2 text-blue-600" />
                            Recordings ({recordings.length})
                          </h4>

                          {recordings.length === 0 ? (
                            <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500">No recordings uploaded for this meeting</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {recordings.map((recording, index) => {
                                const isVideo = recording.fileType?.startsWith('video') ||
                                  recording.fileName?.match(/\.(mp4|mov|avi|mkv|webm)$/i);
                                const isAudio = recording.fileType?.startsWith('audio') ||
                                  recording.fileName?.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i);

                                return (
                                  <div key={index} className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center flex-1 min-w-0">
                                        {isVideo ? (
                                          <Video className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" />
                                        ) : isAudio ? (
                                          <Music className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                                        ) : (
                                          <File className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" />
                                        )}

                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-gray-800 truncate">
                                            {recording.fileName || `Recording ${index + 1}`}
                                          </p>
                                          <div className="flex items-center text-sm text-gray-500 mt-1">
                                            <span className="mr-3">
                                              {recording.fileSize ? formatFileSize(recording.fileSize) : 'Size not available'}
                                            </span>
                                            <span className="mr-3">•</span>
                                            <span>
                                              Uploaded: {recording.uploadedAt ?
                                                new Date(recording.uploadedAt).toLocaleDateString('en-US', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  year: 'numeric'
                                                }) : 'Date not available'}
                                            </span>
                                            {recording.duration && (
                                              <>
                                                <span className="mx-3">•</span>
                                                <span>Duration: {formatDuration(recording.duration)}</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center space-x-2 ml-4">
                                        {/* Transcribe button for audio files */}
                                        {(isAudio || isVideo) && (meeting.transcription?.status === 'failed') && (
                                          <button
                                            onClick={() => handleTranscribeRecording(
                                              meeting._id,
                                              index,
                                              recording.fileName || `Recording-${index + 1}`
                                            )}
                                            disabled={transcribingRecordings.has(`${meeting._id}-${index}`)}
                                            className="flex items-center px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-medium hover:shadow-large disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                            {transcribingRecordings.has(`${meeting._id}-${index}`) ? (
                                              <>
                                                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                                Transcribing...
                                              </>
                                            ) : (
                                              <>
                                                <Mic className="w-4 h-4 mr-1.5" />
                                                Transcribe
                                              </>
                                            )}
                                          </button>
                                        )}

                                        <button
                                          onClick={() => handleDownloadRecording(
                                            meeting._id,
                                            index,
                                            recording.fileName || `Recording-${index + 1}`
                                          )}
                                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                          disabled={showDownloadProgress && currentDownloadingFile?.meetingId === meeting._id && currentDownloadingFile?.index === index}
                                        >
                                          {showDownloadProgress && currentDownloadingFile?.meetingId === meeting._id && currentDownloadingFile?.index === index ? (
                                            <>
                                              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                              Downloading...
                                            </>
                                          ) : (
                                            <>
                                              <Download className="w-4 h-4 mr-1.5" />
                                              Download
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Meeting Footer */}
                          <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-500">
                            <div className="flex justify-between items-center">
                              <div>
                                Meeting created on: {new Date(meeting.createdAt).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                              {isHost && (
                                <span className="text-green-600 font-medium">
                                  You are the host of this meeting
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default UploadRecordings;