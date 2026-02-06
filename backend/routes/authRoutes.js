import express from "express";
import {
  register,
  login,
  googleLogin,
  getMe,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  // New profile management functions
  uploadProfilePicture,
  deleteProfilePicture,
  updateEnhancedProfile,
  changePassword,
  deactivateAccount,
  deleteAccount,
  getProfileCompleteness
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { uploadProfilePicture as uploadMiddleware, handleProfileUploadErrors } from "../middleware/profileUploadMiddleware.js";

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

// Authentication
router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);
router.get("/verify-email", verifyEmail); // GET - token from query string
router.post("/resend-verification", resendVerification);

// Password Recovery
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);

// ==================== PROTECTED ROUTES ====================

// Basic Auth
router.get("/logout", protect, logout);
router.get("/me", protect, getMe);

// 🔥 FIXED: Profile Update Routes
router.put("/profile/enhanced", protect, updateEnhancedProfile); // New consistent naming

// Profile Picture Management
router.post(
  "/profile/picture",
  protect,
  uploadMiddleware,
  handleProfileUploadErrors,
  uploadProfilePicture
);
router.delete("/profile/picture", protect, deleteProfilePicture);

// Password Management
router.put("/profile/password", protect, changePassword);

// Account Management
router.post("/profile/deactivate", protect, deactivateAccount);
router.post("/profile/delete", protect, deleteAccount);

// Profile Analytics
router.get("/profile/completeness", protect, getProfileCompleteness);

export default router;