import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import zegoController from '../controllers/zegoController.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// ✅ Test endpoint - Check if ZEGOCLOUD is configured
router.get('/test', zegoController.testSetup);

// ✅ Generate token for joining video meeting (MAIN ENDPOINT)
router.post('/meetings/:meetingId/token', zegoController.generateMeetingToken);

// ✅ Start video meeting (host only)
router.post('/meetings/:meetingId/start', zegoController.startVideoMeeting);

// ✅ End video meeting (host only)
router.post('/meetings/:meetingId/end', zegoController.endVideoMeeting);

// ✅ Get meeting recordings
router.get('/meetings/:meetingId/recordings', zegoController.getMeetingRecordings);

export default router;