import path from 'path';
import Meeting from '../models/Meeting.js';
import { recordingUpload } from '../config/cloudinary.js';
import User from '../models/User.js';
import { triggerTranscriptionForRecording } from './aiController.js';
import { getTranscriptionLanguage } from '../utils/transcriptionConfig.js';

/** Multer on Windows often reports webm uploads as text/plain — infer from filename. */
function resolveRecordingFileType(file) {
  const mime = file.mimetype || '';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (['.webm', '.mp4', '.mov', '.avi', '.mkv', '.mpeg', '.m4v'].includes(ext)) return 'video';
  return 'audio';
}

// Middleware for authorization check before file upload
export const checkUploadAuthorization = async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if user is host or has permission
    const isHost = meeting.host.toString() === userId;
    const isParticipant = meeting.participants.some(p =>
      p.user.toString() === userId
    );

    if (!isHost && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload recordings'
      });
    }

    // Attach meeting to request for use in the handler
    req.meeting = meeting;
    req.isHost = isHost;
    next();
  } catch (error) {
    console.error('Authorization check error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Handler for multiple file uploads (runs after authorization and multer middleware)
export const uploadMultipleRecordingsHandler = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const meeting = req.meeting;
    const userId = req.user.id;
    const isHost = req.isHost;

    const uploadedRecordings = [];

    for (const file of req.files) {
      console.log('Uploaded file info:', {
        originalName: file.originalname,
        cloudinaryName: file.filename,
        size: file.size,
        type: file.mimetype
      });

      const recordingData = {
        url: file.path,
        publicId: file.filename,
        fileName: file.originalname,
        fileType: resolveRecordingFileType(file),
        fileSize: file.size,
        uploadedAt: new Date(),
        uploadedBy: userId,
        permissions: {
          canDownload: true,
          canDelete: isHost
        }
      };

      uploadedRecordings.push(recordingData);
    }

    // Fetch fresh meeting document to avoid stale data
    const meetingDoc = await Meeting.findById(meeting._id);
    if (!meetingDoc) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Initialize recordings array if not exists
    if (!meetingDoc.recordings) {
      meetingDoc.recordings = [];
    }

    // Add new recordings
    meetingDoc.recordings.push(...uploadedRecordings);
    // Update meeting status
    meetingDoc.status = 'completed';
    
      try {
      await meetingDoc.save();
      console.log(`Successfully uploaded ${uploadedRecordings.length} files to meeting ${meetingDoc._id}`);
      
      // Auto-transcribe only if autoProcessAI is enabled
      if (meetingDoc.autoProcessAI !== false) { // Default to true if not set
        // Scenario 1: Auto-transcribe all uploaded recordings (in English, generate minutes)
        // Stagger the transcription starts to avoid overwhelming the system
        const startIndex = meetingDoc.recordings.length - uploadedRecordings.length;
        setTimeout(() => {
          uploadedRecordings.forEach((recording, i) => {
            const recordingIndex = startIndex + i;
            // Stagger each transcription start by 2 seconds
            setTimeout(() => {
              triggerTranscriptionForRecording(meetingDoc._id, recordingIndex, {
                language: getTranscriptionLanguage(),
                generateMinutes: true,
                extractTasks: false,
                userId: userId
              }).catch(error => {
                console.error(`Failed to trigger transcription for recording ${recordingIndex}:`, error);
              });
            }, i * 2000); // 2 second delay between each transcription start
          });
        }, 3000); // Initial delay to ensure Cloudinary files are ready
        console.log(`🤖 Auto-transcription enabled: Starting transcription for ${uploadedRecordings.length} recording(s)`);
      } else {
        console.log(`⏸️ Auto-transcription disabled: Skipping transcription for ${uploadedRecordings.length} recording(s)`);
      }
    } catch (saveError) {
      console.error('Meeting save error:', saveError);
      // Log validation errors if any
      if (saveError.name === 'ValidationError') {
        console.error('Validation errors:', saveError.errors);
      }
      throw saveError;
    }

    const message = meetingDoc.autoProcessAI !== false
      ? `${req.files.length} recording(s) uploaded successfully. Transcription started automatically for all recordings.`
      : `${req.files.length} recording(s) uploaded successfully.`;
    
    res.status(200).json({
      success: true,
      message: message,
      recordings: uploadedRecordings
    });
  } catch (error) {
    console.error('Upload handler error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      errors: error.errors
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save recording info',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// For single file upload
export const uploadRecording = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if user is host or has permission
    const isHost = meeting.host.toString() === userId;
    const isParticipant = meeting.participants.some(p =>
      p.user.toString() === userId
    );

    if (!isHost && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload recordings'
      });
    }

    // Use single file upload middleware
    const uploadSingle = recordingUpload.single('recording');

    uploadSingle(req, res, async (err) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      try {
        console.log('Uploaded single file:', {
          originalName: req.file.originalname,
          cloudinaryName: req.file.filename,
          size: req.file.size,
          type: req.file.mimetype
        });

        const fileType = resolveRecordingFileType(req.file);

        const recordingData = {
          url: req.file.path,
          publicId: req.file.filename,
          fileName: req.file.originalname,
          fileType,
          fileSize: req.file.size,
          uploadedAt: new Date(),
          uploadedBy: userId,
          permissions: {
            canDownload: true,
            canDelete: isHost
          }
        };

        // Initialize recordings array if not exists
        if (!meeting.recordings) {
          meeting.recordings = [];
        }

        // Add recording
        meeting.recordings.push(recordingData);
        // Update meeting status
        meeting.status = 'completed';
        await meeting.save();

        console.log(`Successfully uploaded file to meeting ${meetingId} (${fileType}, ${req.file.mimetype})`);

        // Auto-transcribe only if autoProcessAI is enabled
        // Fetch fresh meeting to get autoProcessAI setting
        const freshMeeting = await Meeting.findById(meetingId);
        if (freshMeeting && freshMeeting.autoProcessAI !== false) { // Default to true if not set
          // Scenario 1: Auto-transcribe after upload (in English, generate minutes)
          // Wait a bit longer to ensure Cloudinary file is ready
          const recordingIndex = meeting.recordings.length - 1;
          setTimeout(() => {
            triggerTranscriptionForRecording(meetingId, recordingIndex, {
                language: getTranscriptionLanguage(),
              generateMinutes: true,
              extractTasks: false,
              userId: userId
            }).catch(error => {
              console.error('Failed to trigger auto-transcription:', error);
            });
          }, 3000); // Increased delay to ensure Cloudinary file is ready
          console.log(`🤖 Auto-transcription enabled: Starting transcription for recording`);
        } else {
          console.log(`⏸️ Auto-transcription disabled: Skipping transcription`);
        }

        const message = freshMeeting && freshMeeting.autoProcessAI !== false
          ? 'Recording uploaded successfully. Transcription started automatically.'
          : 'Recording uploaded successfully.';
        
        res.status(200).json({
          success: true,
          message: message,
          recording: recordingData
        });
      } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to save recording info: ' + error.message
        });
      }
    });
  } catch (error) {
    console.error('Upload recording error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update downloadRecording function
export const downloadRecording = async (req, res) => {
  try {
    const { meetingId, recordingIndex = 0 } = req.params;
    const userId = req.user.id;

    const meeting = await Meeting.findById(meetingId);

    if (!meeting || !meeting.recordings || meeting.recordings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found'
      });
    }

    const recording = meeting.recordings[recordingIndex];
    if (!recording) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found'
      });
    }

    // Check permissions
    const canDownload = meeting.host.toString() === userId ||
      meeting.participants.some(p =>
        p.user.toString() === userId
      );

    if (!canDownload) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download recording'
      });
    }

    // Redirect to Cloudinary URL
    res.redirect(recording.url);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteRecording = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    const meeting = await Meeting.findById(meetingId);

    if (!meeting || !meeting.recordings || meeting.recordings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No recordings found'
      });
    }

    // Check permissions - only host can delete all recordings
    const isHost = meeting.host.toString() === userId;

    if (!isHost) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete all recordings'
      });
    }

    // Clear all recordings
    meeting.recordings = [];
    await meeting.save();

    res.status(200).json({
      success: true,
      message: 'All recordings deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getRecordingInfo = async (req, res) => {
  try {
    const { meetingId, recordingIndex = 0 } = req.params;
    const userId = req.user.id;

    const meeting = await Meeting.findById(meetingId)
      .populate('recordings.uploadedBy', 'name email profilePicture')
      .populate('host', 'name email profilePicture')
      .populate('participants.user', 'name email profilePicture');

    if (!meeting || !meeting.recordings || meeting.recordings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found'
      });
    }

    const recording = meeting.recordings[recordingIndex];
    if (!recording) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found'
      });
    }

    // Check if user can view
    const canView = meeting.host.toString() === userId ||
      meeting.participants.some(p => p.user.toString() === userId);

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view recording'
      });
    }

    res.status(200).json({
      success: true,
      recording: recording,
      permissions: {
        canDownload: meeting.host.toString() === userId ||
          recording.uploadedBy.toString() === userId ||
          meeting.participants.some(p =>
            p.user.toString() === userId
          ),
        canDelete: meeting.host.toString() === userId ||
          (recording.uploadedBy.toString() === userId && recording.permissions.canDelete)
      },
      meeting: {
        _id: meeting._id,
        title: meeting.title,
        host: meeting.host
      }
    });
  } catch (error) {
    console.error('Get recording error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// NEW: Get all recordings for a meeting
export const getAllRecordings = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    const meeting = await Meeting.findById(meetingId)
      .populate('recordings.uploadedBy', 'name email profilePicture')
      .populate('host', 'name email profilePicture')
      .populate('participants.user', 'name email profilePicture');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if user can view
    const canView = meeting.host.toString() === userId ||
      meeting.participants.some(p => p.user.toString() === userId);

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view recordings'
      });
    }

    // Add permissions to each recording
    const recordingsWithPermissions = meeting.recordings.map((recording, index) => ({
      ...recording.toObject(),
      index: index,
      permissions: {
        canDownload: meeting.host.toString() === userId ||
          recording.uploadedBy.toString() === userId ||
          meeting.participants.some(p => p.user.toString() === userId),
        canDelete: meeting.host.toString() === userId ||
          (recording.uploadedBy.toString() === userId && recording.permissions.canDelete)
      }
    }));

    // Sort by upload date (newest first)
    recordingsWithPermissions.sort((a, b) =>
      new Date(b.uploadedAt) - new Date(a.uploadedAt)
    );

    res.status(200).json({
      success: true,
      recordings: recordingsWithPermissions,
      totalRecordings: recordingsWithPermissions.length,
      meeting: {
        _id: meeting._id,
        title: meeting.title,
        host: meeting.host,
        participants: meeting.participants
      }
    });
  } catch (error) {
    console.error('Get all recordings error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// NEW: Update recording info (rename)
export const updateRecordingInfo = async (req, res) => {
  try {
    const { meetingId, recordingIndex } = req.params;
    const userId = req.user.id;
    const { fileName } = req.body;

    // Validate fileName
    if (!fileName || fileName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'File name is required'
      });
    }

    const meeting = await Meeting.findById(meetingId);

    if (!meeting || !meeting.recordings || meeting.recordings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found'
      });
    }

    const recording = meeting.recordings[recordingIndex];
    if (!recording) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found'
      });
    }

    // Check if user can modify
    const canModify = meeting.host.toString() === userId ||
      recording.uploadedBy.toString() === userId;

    if (!canModify) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify recording'
      });
    }

    // Update file name
    recording.fileName = fileName.trim();

    // Update the recording in the array
    meeting.recordings[recordingIndex] = recording;
    await meeting.save();

    res.status(200).json({
      success: true,
      message: 'Recording updated successfully',
      recording: recording
    });
  } catch (error) {
    console.error('Update recording error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// NEW: Delete specific recording
export const deleteSpecificRecording = async (req, res) => {
  try {
    const { meetingId, recordingIndex } = req.params;
    const userId = req.user.id;

    const meeting = await Meeting.findById(meetingId);

    if (!meeting || !meeting.recordings || meeting.recordings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found'
      });
    }

    if (recordingIndex >= meeting.recordings.length) {
      return res.status(404).json({
        success: false,
        message: 'Recording index out of bounds'
      });
    }

    const recording = meeting.recordings[recordingIndex];
    if (!recording) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found'
      });
    }

    // Check if user can delete
    const canDelete = meeting.host.toString() === userId ||
      (recording.uploadedBy.toString() === userId && recording.permissions.canDelete);

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete recording'
      });
    }

    // Remove the recording from array
    meeting.recordings.splice(recordingIndex, 1);
    await meeting.save();

    res.status(200).json({
      success: true,
      message: 'Recording deleted successfully',
      remainingRecordings: meeting.recordings.length
    });
  } catch (error) {
    console.error('Delete specific recording error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// NEW: Get recording statistics
export const getRecordingStatistics = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if user can view
    const canView = meeting.host.toString() === userId ||
      meeting.participants.some(p => p.user.toString() === userId);

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view statistics'
      });
    }

    if (!meeting.recordings || meeting.recordings.length === 0) {
      return res.status(200).json({
        success: true,
        statistics: {
          totalRecordings: 0,
          totalSize: 0,
          audioCount: 0,
          videoCount: 0,
          earliestRecording: null,
          latestRecording: null
        }
      });
    }

    // Calculate statistics
    const totalSize = meeting.recordings.reduce((sum, rec) => sum + rec.fileSize, 0);
    const audioCount = meeting.recordings.filter(rec => rec.fileType === 'audio').length;
    const videoCount = meeting.recordings.filter(rec => rec.fileType === 'video').length;

    const uploadDates = meeting.recordings.map(rec => new Date(rec.uploadedAt));
    const earliestRecording = new Date(Math.min(...uploadDates));
    const latestRecording = new Date(Math.max(...uploadDates));

    res.status(200).json({
      success: true,
      statistics: {
        totalRecordings: meeting.recordings.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        audioCount: audioCount,
        videoCount: videoCount,
        earliestRecording: earliestRecording,
        latestRecording: latestRecording,
        fileTypes: {
          audio: audioCount,
          video: videoCount
        }
      }
    });
  } catch (error) {
    console.error('Get recording statistics error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// NEW: Search recordings by name
export const searchRecordings = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { query } = req.query;
    const userId = req.user.id;

    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const meeting = await Meeting.findById(meetingId)
      .populate('recordings.uploadedBy', 'name email profilePicture');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if user can view
    const canView = meeting.host.toString() === userId ||
      meeting.participants.some(p => p.user.toString() === userId);

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to search recordings'
      });
    }

    // Search recordings by fileName
    const searchTerm = query.toLowerCase().trim();
    const searchResults = meeting.recordings.filter(recording =>
      recording.fileName.toLowerCase().includes(searchTerm)
    ).map((recording, index) => ({
      ...recording.toObject(),
      index: index,
      permissions: {
        canDownload: meeting.host.toString() === userId ||
          recording.uploadedBy.toString() === userId ||
          meeting.participants.some(p => p.user.toString() === userId),
        canDelete: meeting.host.toString() === userId ||
          (recording.uploadedBy.toString() === userId && recording.permissions.canDelete)
      }
    }));

    res.status(200).json({
      success: true,
      results: searchResults,
      totalResults: searchResults.length,
      searchQuery: query
    });
  } catch (error) {
    console.error('Search recordings error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};