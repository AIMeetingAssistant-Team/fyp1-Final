import express from "express";
import {
  sendMeetingInvites,
  respondToInvite,
  getMeetingInvites,
  resendInvite,
  sendMeetingReminders,
  getUserInvites,
  cancelInvite
} from "../controllers/inviteController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// ==================== MEETING-SPECIFIC INVITE ROUTES ====================

// Send invites to a meeting
router.post("/meetings/:meetingId/invites", sendMeetingInvites);

// Get all invites for a meeting
router.get("/meetings/:meetingId/invites", getMeetingInvites);

// Send reminders for a meeting
router.post("/meetings/:meetingId/reminders", sendMeetingReminders);

// ==================== SINGLE INVITE MANAGEMENT ====================

// 🔥 FIXED: Respond to an invite (accept/decline/maybe)
router.put("/:token/respond", respondToInvite); // Changed from /invites/:token/respond

// Resend a specific invite
router.post("/:inviteId/resend", resendInvite);

// Cancel a specific invite
router.delete("/:inviteId/cancel", cancelInvite);

// ==================== USER INVITE MANAGEMENT ====================

// Get user's own invites
router.get("/users/me/invites", getUserInvites);

export default router;