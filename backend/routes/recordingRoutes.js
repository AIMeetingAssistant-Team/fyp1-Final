import express from 'express';
import {
  uploadRecording,
  downloadRecording,
  deleteRecording,
  getRecordingInfo,
  uploadMultipleRecordingsHandler,
  checkUploadAuthorization,
  getAllRecordings,
  updateRecordingInfo,
  deleteSpecificRecording
} from '../controllers/recordingController.js';
import { protect } from '../middleware/authMiddleware.js';
import { recordingUpload } from '../config/cloudinary.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Upload recordings
router.post('/:meetingId/upload', uploadRecording);
// Apply middlewares in correct order: auth check, then multer, then handler
router.post('/:meetingId/upload-multiple', checkUploadAuthorization, recordingUpload.array('recordings', 10), uploadMultipleRecordingsHandler);

// Get all recordings for a meeting
router.get('/:meetingId/all', getAllRecordings);

// Download recording
router.get('/:meetingId/download/:recordingIndex?', downloadRecording);

// Get recording info
router.get('/:meetingId/:recordingIndex?', getRecordingInfo);

// Update recording info
router.put('/:meetingId/:recordingIndex', updateRecordingInfo);

// Delete specific recording
router.delete('/:meetingId/:recordingIndex', deleteSpecificRecording);

// Delete all recordings (old route)
router.delete('/:meetingId', deleteRecording);

export default router;