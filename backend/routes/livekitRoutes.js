import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import livekitController from '../controllers/livekitController.js';

const router = express.Router();

router.use(protect);

router.get('/test', livekitController.testSetup);
router.post('/meetings/:meetingId/token', livekitController.generateMeetingToken);
router.post('/meetings/:meetingId/start', livekitController.startVideoMeeting);
router.post('/meetings/:meetingId/end', livekitController.endVideoMeeting);
router.post('/meetings/:meetingId/recording/start', livekitController.startRecording);
router.post('/meetings/:meetingId/recording/stop', livekitController.stopRecording);
router.get('/meetings/:meetingId/recording/status', livekitController.getRecordingStatus);

export default router;
