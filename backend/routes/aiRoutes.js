import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  checkAIHealth,
  transcribeRecording,
  getTranscriptionStatus,
  regenerateMinutes,
  getMeetingInsights,
  processMultipleMeetings,
  updateAIConfig,
  generateMinutesPDF
} from '../controllers/aiController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ==================== AI SERVICE MANAGEMENT ====================

// Check AI service health
router.get('/health', checkAIHealth);

// Update AI configuration (admin only)
router.put('/config', updateAIConfig);

// ==================== TRANSCRIPTION ROUTES ====================

// Transcribe specific recording
router.post('/meetings/:meetingId/transcribe/:recordingIndex?', transcribeRecording);

// Get transcription status
router.get('/meetings/:meetingId/transcription-status', getTranscriptionStatus);

// ==================== MINUTES & INSIGHTS ====================

// Regenerate minutes
router.post('/meetings/:meetingId/regenerate-minutes', regenerateMinutes);

// Get meeting insights
router.get('/meetings/:meetingId/insights', getMeetingInsights);

// Generate PDF for meeting minutes
router.get('/meetings/:meetingId/pdf', generateMinutesPDF);

// ==================== BULK PROCESSING ====================

// Process multiple meetings
router.post('/bulk-process', processMultipleMeetings);

export default router;