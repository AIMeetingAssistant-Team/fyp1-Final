import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import LoginHistory from "../models/LoginHistory.js";
import { OAuth2Client } from 'google-auth-library';
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/emailService.js";
import { deleteFromCloudinary } from '../config/cloudinary.js';
import { validatePasswordStrength, isCommonPassword } from '../utils/passwordValidator.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

// Send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: 'strict'
  };

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture?.url || null,
      isVerified: user.isVerified,
    },
  });
};

// Create login history
export const createLoginHistory = async (userId, action, req = null) => {
  try {
    await LoginHistory.create({
      user: userId,
      action,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent')
    });
  } catch (error) {
    console.error('Login history error:', error);
    // Don't fail the request if login history fails
  }
};

// REGISTER USER
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Password is too weak",
        errors: passwordValidation.errors
      });
    }

    // Check for common passwords
    if (isCommonPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Password is too common. Please choose a more secure password."
      });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      role: role || "user",
      isVerified: false,
    });

    // Generate Email Verification Token
    const verifyToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "2min",
    });

    // Send Verification Email
    try {
      await sendVerificationEmail(user, verifyToken);
      console.log(`✅ Verification email sent to: ${user.email}`);
    } catch (emailError) {
      console.error("❌ Email sending failed:", emailError);
      // Continue even if email fails
    }

    res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email to verify your account.",
      userId: user._id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// VERIFY EMAIL
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required"
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID from token
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification token"
      });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.status(200).json({
        success: true,
        message: "Email already verified"
      });
    }

    // Mark as verified
    user.isVerified = true;
    await user.save();

    console.log(`✅ Email verified for user: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Email verification error:", error);

    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: "Verification token has expired"
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        message: "Invalid verification token"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error during email verification"
    });
  }
};

// RESEND VERIFICATION EMAIL
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified"
      });
    }

    // Generate new verification token
    const verifyToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "2min",
    });

    // Send verification email
    await sendVerificationEmail(user, verifyToken);

    res.status(200).json({
      success: true,
      message: "Verification email sent successfully"
    });

  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// LOGIN USER
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email and password",
      });
    }

    const user = await User.findOne({ email }).select("+password");
    if (user.authProvider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'Please sign in using Google'
      });
    }

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated. Please contact administrator.",
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in.",
        needsVerification: true,
        email: user.email
      });
    }

    await user.updateLastLogin();
    await createLoginHistory(user._id, "login", req);

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GOOGLE OAUTH (ID TOKEN) - SPA flow: frontend sends Google ID token
export const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'idToken is required' });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    console.log(payload, "::payload")
    const { sub: googleId, email, name, picture, email_verified } = payload;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account has no email' });
    }

    if (!email_verified) {
      return res.status(401).json({
        success: false,
        message: 'Google email not verified'
      });
    }

    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: name || 'Google User',
        email,
        password: crypto.randomBytes(20).toString('hex'), // random password, not used
        isVerified: true,
        profilePicture: picture ? { url: picture } : undefined,
        authProvider: 'google',
        googleId
      });
    } else {
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      if (user && user.authProvider === 'local') {
        return res.status(400).json({
          success: false,
          message: 'This email is registered with login and password. Please use that method to log in.'
        });
      }

      // Update profile picture/name if not set
      let changed = false;
      if (!user.isVerified) { user.isVerified = true; changed = true; }
      if (!user.profilePicture?.url && picture) { user.profilePicture = { url: picture }; changed = true; }
      if (!user.name && name) { user.name = name; changed = true; }
      if (changed) await user.save();
    }

    await user.updateLastLogin?.();
    await createLoginHistory(user._id, "login_google", req);

    return sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// GET CURRENT USER
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture?.url || null,
        bio: user.bio,
        phone: user.phone,
        organization: user.organization,
        jobTitle: user.jobTitle,
        department: user.department,
        timezone: user.timezone,
        isVerified: user.isVerified,
        isActive: user.isActive,
        emailNotifications: user.emailNotifications,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// UPDATE ENHANCED PROFILE
export const updateEnhancedProfile = async (req, res) => {
  try {
    const {
      name,
      bio,
      phone,
      organization,
      jobTitle,
      department,
      timezone,
      emailNotifications
    } = req.body;

    const user = await User.findById(req.user.id);

    // Allowed fields to update
    const allowedUpdates = [
      'name', 'bio', 'phone', 'organization', 'jobTitle', 'department',
      'timezone', 'emailNotifications'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save({ validateBeforeSave: true });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        phone: user.phone,
        organization: user.organization,
        jobTitle: user.jobTitle,
        department: user.department,
        timezone: user.timezone,
        profilePicture: user.profilePicture?.url || null,
        role: user.role,
        isVerified: user.isVerified,
        emailNotifications: user.emailNotifications
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// UPLOAD PROFILE PICTURE
export const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an image file to upload'
      });
    }

    const user = await User.findById(req.user.id);

    // Delete old profile picture from Cloudinary if exists
    if (user.profilePicture?.publicId) {
      try {
        await deleteFromCloudinary(user.profilePicture.publicId);
      } catch (cloudinaryError) {
        console.error('Error deleting old profile picture:', cloudinaryError);
        // Continue with upload even if deletion fails
      }
    }

    // Update user with new profile picture
    user.profilePicture = {
      url: req.file.path,
      publicId: req.file.filename,
      uploadedAt: new Date()
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      profilePicture: user.profilePicture.url
    });

  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE PROFILE PICTURE
export const deleteProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.profilePicture?.publicId) {
      return res.status(400).json({
        success: false,
        message: 'No profile picture to delete'
      });
    }

    // Delete from Cloudinary
    try {
      await deleteFromCloudinary(user.profilePicture.publicId);
    } catch (cloudinaryError) {
      console.error('Error deleting profile picture from Cloudinary:', cloudinaryError);
      // Continue with database update even if Cloudinary deletion fails
    }

    // Remove from user profile
    user.profilePicture = {
      url: null,
      publicId: null,
      uploadedAt: null
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture deleted successfully'
    });

  } catch (error) {
    console.error('Profile picture deletion error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// CHANGE PASSWORD
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'New password is too weak',
        errors: passwordValidation.errors
      });
    }

    // Check for common passwords
    if (isCommonPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password is too common. Please choose a more secure password.'
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is different from current
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Create login history for password change
    await createLoginHistory(user._id, "password_change", req);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// DEACTIVATE ACCOUNT
export const deactivateAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to deactivate account'
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    // Deactivate account
    user.isActive = false;
    user.deactivatedAt = new Date();
    await user.save();

    // Create login history for account deactivation
    await createLoginHistory(user._id, "account_deactivated", req);

    // Clear cookie
    res.cookie("token", "none", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: 'Account deactivated successfully. You can reactivate by logging in within 30 days.'
    });

  } catch (error) {
    console.error('Account deactivation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE ACCOUNT PERMANENTLY
export const deleteAccount = async (req, res) => {
  try {
    const { password, confirmation } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to delete account'
      });
    }

    if (confirmation !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({
        success: false,
        message: 'Please type "DELETE MY ACCOUNT" to confirm permanent deletion'
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    // Delete profile picture from Cloudinary if exists
    if (user.profilePicture?.publicId) {
      try {
        await deleteFromCloudinary(user.profilePicture.publicId);
      } catch (cloudinaryError) {
        console.error('Error deleting profile picture during account deletion:', cloudinaryError);
      }
    }

    // TODO: Add cleanup for user's meetings, documents, etc.
    // This would require additional business logic based on your app's requirements

    // Delete user from database
    await User.findByIdAndDelete(req.user.id);

    // Create login history for account deletion
    await createLoginHistory(user._id, "account_deleted", req);

    // Clear cookie
    res.cookie("token", "none", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: 'Account permanently deleted successfully'
    });

  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET PROFILE COMPLETENESS
export const getProfileCompleteness = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const profileFields = [
      user.name ? 1 : 0,
      user.profilePicture?.url ? 1 : 0,
      user.bio ? 1 : 0,
      user.phone ? 1 : 0,
      user.organization ? 1 : 0,
      user.jobTitle ? 1 : 0,
      user.department ? 1 : 0
    ];

    const completeness = {
      percentage: Math.round((profileFields.reduce((a, b) => a + b, 0) / profileFields.length) * 100),
      missingFields: [
        !user.name && 'name',
        !user.profilePicture?.url && 'profile picture',
        !user.bio && 'bio',
        !user.phone && 'phone number',
        !user.organization && 'organization',
        !user.jobTitle && 'job title',
        !user.department && 'department'
      ].filter(Boolean)
    };

    res.status(200).json({
      success: true,
      completeness
    });

  } catch (error) {
    console.error('Profile completeness error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// LOGOUT USER
export const logout = async (req, res) => {
  try {
    res.cookie("token", "none", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    await createLoginHistory(req.user.id, "logout", req);

    res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// FORGOT PASSWORD
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const user = await User.findOne({ email });
    if (user.authProvider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'Please sign in using Google'
      });
    }

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        success: true,
        message: "If the email exists, a password reset link has been sent"
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash the token and save to database
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes

    await user.save({ validateBeforeSave: false });

    // Send password reset email
    try {
      await sendPasswordResetEmail(user, resetToken);

      res.status(200).json({
        success: true,
        message: "Password reset email sent successfully"
      });
    } catch (emailError) {
      // Reset the token if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      console.error("Password reset email error:", emailError);
      res.status(500).json({
        success: false,
        message: "Email could not be sent"
      });
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required"
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Password is too weak",
        errors: passwordValidation.errors
      });
    }

    // Hash the token to compare with stored hash
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token"
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    await createLoginHistory(user._id, "password_reset", req);

    res.status(200).json({
      success: true,
      message: "Password reset successfully"
    });

  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};