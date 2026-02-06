import express from "express";
import {
  sendVerificationEmail,
  verifyEmail,
  forgotPassword,
  resetPassword
} from "../controllers/emailController.js";

const router = express.Router();

router.post("/send-verification", sendVerificationEmail);
router.get("/verify/:token", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

router.get("/test", async (req, res) => {
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      to: process.env.EMAIL_USER, // send to yourself
      subject: "✅ Test Email from AI-Meeting Backend",
      text: "If you received this, your Gmail App Password setup works perfectly!",
    });

    res.json({ success: true, message: "Test email sent successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
