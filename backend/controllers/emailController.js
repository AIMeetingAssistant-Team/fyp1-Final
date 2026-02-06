import crypto from "crypto";
import nodemailer from "nodemailer";
import VerificationToken from "../models/VerificationToken.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// transport using env creds
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// -------- Registration Verification --------
export const sendVerificationEmail = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const token = crypto.randomBytes(32).toString("hex");
  await VerificationToken.create({ userId: user._id, token });

  const link = `${process.env.CLIENT_URL}/verify-email/${token}`;
  await transporter.sendMail({
    to: email,
    subject: "Verify your email",
    html: `<p>Please verify your email by clicking <a href="${link}">here</a>. Link expires in 1 hour.</p>`
  });

  res.json({ message: "Verification email sent" });
};

// -------- Verify --------
export const verifyEmail = async (req, res) => {
  const tokenDoc = await VerificationToken.findOne({ token: req.params.token });
  if (!tokenDoc || tokenDoc.expiresAt < Date.now())
    return res.status(400).json({ message: "Token invalid or expired" });

  await User.findByIdAndUpdate(tokenDoc.userId, { isVerified: true });
  await VerificationToken.deleteOne({ _id: tokenDoc._id });
  res.json({ message: "Email verified successfully" });
};

// -------- Forgot Password --------
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Generate token that expires in 15 min
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });

    const resetLink = `http://localhost:3000/reset-password/${token}`;

    // send email
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      to: email,
      subject: "Reset Your Password",
      html: `
        <p>Click below to reset your password:</p>
        <a href="${resetLink}" target="_blank" style="color:#2563eb;">Reset Password</a>
        <p>This link will expire in 15 minutes.</p>
      `,
    });

    res.json({ success: true, message: "Password reset email sent!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error sending reset email" });
  }
};

// -------- Reset Password --------
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) return res.status(400).json({ message: "Missing token" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(400).json({ message: "User not found or token invalid" });

    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters long" });

    // ✅ Let schema pre-save hook handle hashing
    user.password = password;
    await user.save();

    res.json({ success: true, message: "Password reset successful! You can now log in." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error resetting password" });
  }
};
