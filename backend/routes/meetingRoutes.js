import express from "express";
import {
  createMeeting,
  getMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
  addParticipant,
  removeParticipant,
  getCalendar,
  updateMeetingStatus,
  getMeetingStats,
  createUploadMeeting,
  createRecordingMeeting
} from "../controllers/meetingController.js";
// Import instant meeting controllers
import {
  createInstantMeeting,
  joinMeetingByCode,
  getMeetingShareInfo,
  copyMeetingLink,
  validateMeetingCode
} from "../controllers/instantMeetingController.js";

// Import task controller functions
import {
  // createMeetingTask,
  getMeetingTasks,
  getMeetingTaskStats
} from "../controllers/taskController.js";

import { protect } from "../middleware/authMiddleware.js";
import { canAccessMeeting, isMeetingHost, checkTimeConflict } from "../middleware/meetingMiddleware.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// ==================== MEETING CRUD ROUTES ====================

router.route("/")
  .post(checkTimeConflict, createMeeting)
  .get(getMeetings);

router.route("/calendar")
  .get(getCalendar);

router.route("/stats")
  .get(getMeetingStats);

router.route("/:id")
  .get(canAccessMeeting, getMeeting)
  .put(canAccessMeeting, isMeetingHost, checkTimeConflict, updateMeeting)
  .delete(canAccessMeeting, isMeetingHost, deleteMeeting);

router.route("/:id/status")
  .patch(canAccessMeeting, isMeetingHost, updateMeetingStatus);

// ==================== PARTICIPANT MANAGEMENT ROUTES ====================

router.route("/:id/participants")
  .post(canAccessMeeting, isMeetingHost, addParticipant);

router.route("/:id/participants/:participantId")
  .delete(canAccessMeeting, isMeetingHost, removeParticipant);

// ==================== MEETING TASK ROUTES ====================

// Create task for a specific meeting
// router.post("/:meetingId/tasks", createMeetingTask);

// Get all tasks for a meeting
router.get("/:meetingId/tasks", getMeetingTasks);

// Get task statistics for a meeting
router.get("/:meetingId/tasks/stats", getMeetingTaskStats);
// ==================== MEETING UPLOAD ROUTE ====================
router.post('/upload', protect, createUploadMeeting);
router.post('/recording-meeting', protect, createRecordingMeeting)
// ==================== INSTANT MEETING ROUTES ====================

// Create instant meeting
router.post("/instant", createInstantMeeting);

// Join meeting by code
router.get("/code/:code", joinMeetingByCode);

// Get meeting share info
router.get("/:id/share", canAccessMeeting, getMeetingShareInfo);

// Copy meeting link
router.post("/:id/copy-link", canAccessMeeting, copyMeetingLink);

// Validate meeting code
router.get("/validate-code/:code", validateMeetingCode);

export default router;