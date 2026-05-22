import nodemailer from "nodemailer";
import User from '../models/User.js';

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send email utility
 */
export const sendEmail = async (to, subject, html) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"AI Meeting Assistant" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("❌ Email error:", error.message);
    throw new Error("Email could not be sent");
  }
};

/**
 * Send verification email
 */
export const sendVerificationEmail = async (user, token) => {
  const frontendUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const verificationLink = `${frontendUrl}/verify-email?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #000000; margin: 0; font-size: 28px;">Welcome to AI Meeting Assistant!</h1>
          <p style="color: #6b7280; margin: 10px 0 0 0;">Verify your email to get started</p>
        </div>

        <!-- Welcome Message -->
        <div style="text-align: center; margin-bottom: 25px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hello <strong>${user.name}</strong>,<br>
            Thank you for joining AI Meeting Assistant! Please verify your email address to activate your account and start scheduling meetings.
          </p>
        </div>

        <!-- Action Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" 
             style="background-color: #06b6d4; color: white; padding: 14px 28px; 
                    text-decoration: none; border-radius: 6px; font-size: 16px;
                    display: inline-block; font-weight: 500; box-shadow: 0 2px 4px rgba(6, 182, 212, 0.3);">
            Verify Email Address
          </a>
        </div>

        <!-- Security Note -->
        <div style="background: #fef3c7; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            <strong>Security Note:</strong> This verification link will expire in 2 minutes for your security.
          </p>
        </div>

        <!-- Additional Info -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
            If the button doesn't work, copy and paste this link in your browser:
          </p>
          <p style="background: #f8fafc; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px; color: #374151; margin: 0;">
            ${verificationLink}
          </p>
        </div>

        <!-- Footer -->
        <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            If you didn't create this account, you can safely ignore this email.<br>
            © 2024 AI Meeting Assistant. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

  await sendEmail(user.email, "Verify Your Email - AI Meeting Assistant", html);
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (user, resetToken) => {
  const frontendUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="color: #000000; margin: 0; font-size: 24px;">Reset Your Password</h1>
          <p style="color: #6b7280; margin: 10px 0 0 0;">You requested to reset your password</p>
        </div>

        <!-- Instructions -->
        <div style="text-align: center; margin-bottom: 25px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hello <strong>${user.name}</strong>,<br>
            We received a request to reset your password. Click the button below to create a new secure password.
          </p>
        </div>

        <!-- Action Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #06b6d4; color: white; padding: 14px 28px; 
                    text-decoration: none; border-radius: 6px; font-size: 16px;
                    display: inline-block; font-weight: 500; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.3);">
            Reset Password
          </a>
        </div>

        <!-- Security Notes -->
        <div style="background: #fef3c7; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            <strong>Important:</strong> This password reset link will expire in 30 minutes.<br>
            <strong>Security:</strong> If you didn't request this reset, please ignore this email and ensure your account is secure.
          </p>
        </div>

        <!-- Additional Info -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
            If the button doesn't work, copy and paste this link in your browser:
          </p>
          <p style="background: #f8fafc; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px; color: #374151; margin: 0;">
            ${resetLink}
          </p>
        </div>

        <!-- Footer -->
        <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            This is an automated security email from AI Meeting Assistant.<br>
            © 2024 AI Meeting Assistant. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

  await sendEmail(user.email, "Reset Your Password - AI Meeting Assistant", html);
};

/**
 * Send meeting invitation email
 */
export const sendMeetingInviteEmail = async (inviteeEmail, meeting, invite, customMessage = '') => {
  const { token } = invite;
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';

  const acceptUrl = `${baseUrl}/meeting-invite/${token}?action=accept`;
  const declineUrl = `${baseUrl}/meeting-invite/${token}?action=decline`;
  const maybeUrl = `${baseUrl}/meeting-invite/${token}?action=maybe`;

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: meeting.timezone || 'UTC'
    });
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #06b6d4; margin: 0; font-size: 28px;">🎯 Meeting Invitation</h1>
          <p style="color: #6b7280; margin: 10px 0 0 0;">You've been invited to a meeting</p>
        </div>

        <!-- Meeting Details -->
        <div style="background: #f8fafc; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
          <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 20px;">${meeting.title}</h2>
          
          <div style="display: grid; gap: 10px;">
            <div style="display: flex; align-items: center;">
              <span style="color: #6b7280; min-width: 80px;">📅 When:</span>
              <span style="color: #1f2937; font-weight: 500;">${formatDate(meeting.startTime)}</span>
            </div>
            
            <div style="display: flex; align-items: center;">
              <span style="color: #6b7280; min-width: 80px;">⏰ Duration:</span>
              <span style="color: #1f2937; font-weight: 500;">${meeting.duration} minutes</span>
            </div>
            
            <div style="display: flex; align-items: center;">
              <span style="color: #6b7280; min-width: 80px;">👤 Host:</span>
              <span style="color: #1f2937; font-weight: 500;">${meeting.host?.name || 'Meeting Host'}</span>
            </div>
            
            ${meeting.description ? `
            <div style="display: flex; align-items: flex-start;">
              <span style="color: #6b7280; min-width: 80px;">📝 Agenda:</span>
              <span style="color: #1f2937;">${meeting.description}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Custom Message -->
        ${customMessage ? `
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
          <p style="color: #92400e; margin: 0; font-style: italic;">"${customMessage}"</p>
        </div>
        ` : ''}

        <!-- Action Buttons -->
        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #6b7280; margin-bottom: 20px;">Please respond to this invitation:</p>
          
          <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
            <a href="${acceptUrl}" 
               style="background-color: #10b981; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-size: 16px;
                      display: inline-block; font-weight: 500;">
              ✅ Accept
            </a>
            
            <a href="${maybeUrl}" 
               style="background-color: #f59e0b; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-size: 16px;
                      display: inline-block; font-weight: 500;">
              🤔 Maybe
            </a>
            
            <a href="${declineUrl}" 
               style="background-color: #ef4444; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-size: 16px;
                      display: inline-block; font-weight: 500;">
              ❌ Decline
            </a>
          </div>
        </div>

        <!-- Additional Info -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            This meeting invitation was sent via AI Meeting Assistant.<br>
            You can also join directly: <a href="${baseUrl}/meetings/${meeting._id}" style="color: #06b6d4;">View Meeting</a>
          </p>
        </div>
      </div>
    </div>
  `;

  await sendEmail(inviteeEmail, `Meeting Invitation: ${meeting.title}`, html);
};
/**
 * Meeting Email Templates
 */

export const generateMeetingInviteEmail = (meeting, invite, customMessage = '') => {
  const { invitedUser, token } = invite;
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';

  const acceptUrl = `${baseUrl}/meeting-invite/${token}?action=accept`;
  const declineUrl = `${baseUrl}/meeting-invite/${token}?action=decline`;
  const maybeUrl = `${baseUrl}/meeting-invite/${token}?action=maybe`;

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: meeting.timezone || 'UTC'
    });
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #06b6d4; margin: 0; font-size: 28px;">Meeting Invitation</h1>
          <p style="color: #6b7280; margin: 10px 0 0 0;">You've been invited to a meeting</p>
        </div>

        <!-- Meeting Details -->
        <div style="background: #f8fafc; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
          <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 20px;">${meeting.title}</h2>
          
          <div style="display: grid; gap: 10px;">
            <div style="display: flex; align-items: center;">
              <span style="color: #6b7280; min-width: 80px;">When:</span>
              <span style="color: #1f2937; font-weight: 500;">${formatDate(meeting.startTime)}</span>
            </div>
            
            <div style="display: flex; align-items: center;">
              <span style="color: #6b7280; min-width: 80px;">Duration:</span>
              <span style="color: #1f2937; font-weight: 500;">${meeting.duration} minutes</span>
            </div>
            
            <div style="display: flex; align-items: center;">
              <span style="color: #6b7280; min-width: 80px;">Host:</span>
              <span style="color: #1f2937; font-weight: 500;">${meeting.host?.name || 'Meeting Host'}</span>
            </div>
            
            ${meeting.agenda ? `
            <div style="display: flex; align-items: flex-start;">
              <span style="color: #6b7280; min-width: 80px;">Agenda:</span>
              <span style="color: #1f2937;">${meeting.agenda}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Custom Message -->
        ${customMessage ? `
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
          <p style="color: #92400e; margin: 0; font-style: italic;">"${customMessage}"</p>
        </div>
        ` : ''}

        <!-- Action Buttons -->
        <div style="text-align: center; margin: 30px 10px;">
          <p style="color: #6b7280; margin-bottom: 20px;">Please respond to this invitation:</p>
          
          <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
            <a href="${acceptUrl}" 
               style="background-color: #10b981; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-size: 16px;
                      display: inline-block; font-weight: 500;">
              Accept
            </a>
            
            <a href="${maybeUrl}" 
               style="background-color: #f59e0b; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-size: 16px;
                      display: inline-block; font-weight: 500;">
              Maybe
            </a>
            
            <a href="${declineUrl}" 
               style="background-color: #ef4444; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-size: 16px;
                      display: inline-block; font-weight: 500;">
              Decline
            </a>
          </div>
        </div>

        <!-- Additional Info -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            This meeting invitation was sent via AI Meeting Assistant.<br>
            You can also join directly: <a href="${baseUrl}/meetings/${meeting._id}" style="color: #06b6d4;">View Meeting</a>
          </p>
        </div>
      </div>
    </div>
  `;
};

export const generateMeetingReminderEmail = (meeting, invite) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: meeting.timezone || 'UTC'
    });
  };

  const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const meetingUrl = `${baseUrl}/meetings/${meeting._id}`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">⏰ Meeting Reminder</h1>
          <p style="color: #6b7280; margin: 10px 0 0 0;">Your meeting is coming up soon!</p>
        </div>

        <!-- Meeting Details -->
        <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">${meeting.title}</h2>
          
          <div style="display: grid; gap: 8px;">
            <div style="display: flex; align-items: center;">
              <span style="color: #92400e; min-width: 80px;">📅 When:</span>
              <span style="color: #92400e; font-weight: 500;">${formatDate(meeting.startTime)}</span>
            </div>
            
            <div style="display: flex; align-items: center;">
              <span style="color: #92400e; min-width: 80px;">👤 Host:</span>
              <span style="color: #92400e; font-weight: 500;">${meeting.host?.name || 'Meeting Host'}</span>
            </div>
          </div>
        </div>

        <!-- Action Button -->
        <div style="text-align: center; margin: 25px 0;">
          <a href="${meetingUrl}" 
             style="background-color: #f59e0b; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 6px; font-size: 16px;
                    display: inline-block; font-weight: 500;">
            📍 Join Meeting
          </a>
        </div>

        <!-- Additional Info -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 15px;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            This is an automated reminder for your scheduled meeting.<br>
            <a href="${baseUrl}/meetings/${meeting._id}" style="color: #f59e0b;">View meeting details</a>
          </p>
        </div>
      </div>
    </div>
  `;
};

export const generateMeetingUpdateEmail = (meeting, invite, changes) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: meeting.timezone || 'UTC'
    });
  };

  const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const meetingUrl = `${baseUrl}/meetings/${meeting._id}`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="color: #8b5cf6; margin: 0; font-size: 24px;">📋 Meeting Updated</h1>
          <p style="color: #6b7280; margin: 10px 0 0 0;">A meeting you're invited to has been updated</p>
        </div>

        <!-- Meeting Details -->
        <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #7c3aed; margin: 0 0 15px 0; font-size: 18px;">${meeting.title}</h2>
          
          <div style="display: grid; gap: 8px;">
            ${changes.startTime ? `
            <div style="display: flex; align-items: center;">
              <span style="color: #7c3aed; min-width: 120px;">🕐 New Time:</span>
              <span style="color: #7c3aed; font-weight: 500;">${formatDate(meeting.startTime)}</span>
            </div>
            ` : ''}
            
            ${changes.description ? `
            <div style="display: flex; align-items: flex-start;">
              <span style="color: #7c3aed; min-width: 120px;">📝 Updated Agenda:</span>
              <span style="color: #7c3aed;">${meeting.description || 'No description provided'}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Changes Summary -->
        ${Object.keys(changes).length > 0 ? `
        <div style="background: #fef3c7; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
          <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">Changes Made:</h3>
          <ul style="color: #92400e; margin: 0; padding-left: 20px;">
            ${changes.startTime ? '<li>Meeting time has been updated</li>' : ''}
            ${changes.description ? '<li>Meeting description has been updated</li>' : ''}
            ${changes.title ? '<li>Meeting title has been updated</li>' : ''}
          </ul>
        </div>
        ` : ''}

        <!-- Action Button -->
        <div style="text-align: center; margin: 25px 0;">
          <a href="${meetingUrl}" 
             style="background-color: #8b5cf6; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 6px; font-size: 16px;
                    display: inline-block; font-weight: 500;">
            📖 View Updated Meeting
          </a>
        </div>

        <!-- Additional Info -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 15px;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            This meeting has been updated by the host.<br>
            <a href="${baseUrl}/meetings/${meeting._id}" style="color: #8b5cf6;">View full meeting details</a>
          </p>
        </div>
      </div>
    </div>
  `;
};

/**
 * Send task deadline reminder email (6 hours before due)
 */
export const sendTaskDeadlineReminderEmail = async (task, assignedUser) => {
  try {
    const user = await User.findById(assignedUser);
    if (!user || !user.email) return;

    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const taskUrl = `${frontendUrl}/tasks`;

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    };

    const endOfDueDate = new Date(task.dueDate);
    endOfDueDate.setHours(23, 59, 59, 999);
    const hoursLeft = Math.max(0, Math.round((endOfDueDate - new Date()) / (1000 * 60 * 60)));

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: white; border-radius: 8px; padding: 40px 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #92400e; margin: 0; font-size: 24px; font-weight: 700;">Deadline Reminder</h1>
          <p style="color: #b45309; margin: 8px 0 0 0; font-size: 15px;">
            Your task is due in approximately <strong>${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}</strong>
          </p>
        </div>

        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 24px; margin-bottom: 28px;">
          <h2 style="color: #92400e; margin: 0 0 16px 0; font-size: 18px;">${task.title}</h2>

          ${task.description ? `
          <p style="color: #78350f; margin: 0 0 16px 0; font-size: 14px;">${task.description}</p>
          ` : ''}

          <div style="display: grid; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #92400e; font-size: 14px; min-width: 100px;">⏰ Due:</span>
              <span style="color: #78350f; font-weight: 600; font-size: 14px;">${formatDate(task.dueDate)}</span>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #92400e; font-size: 14px; min-width: 100px;">🚦 Priority:</span>
              <span style="display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;
                ${task.priority === 'urgent' ? 'background:#fee2e2;color:#dc2626;' :
        task.priority === 'high' ? 'background:#ffedd5;color:#ea580c;' :
          task.priority === 'medium' ? 'background:#dbeafe;color:#2563eb;' :
            'background:#dcfce7;color:#16a34a;'}">
                ${task.priority}
              </span>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #92400e; font-size: 14px; min-width: 100px;">📋 Status:</span>
              <span style="color: #78350f; font-size: 14px;">${task.status.replace('-', ' ')}</span>
            </div>
          </div>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${taskUrl}"
             style="background-color: #d97706; color: white; padding: 14px 32px;
                    text-decoration: none; border-radius: 6px; font-size: 15px;
                    display: inline-block; font-weight: 600;">
            View Task Now
          </a>
        </div>

        <div style="background: #fef3c7; border-radius: 6px; padding: 14px; margin-bottom: 20px;">
          <p style="color: #92400e; margin: 0; font-size: 13px;">
            <strong>Reminder:</strong> Mark the task as complete in the dashboard once you're done.
          </p>
        </div>

        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} AI Meeting Assistant. All rights reserved.
          </p>
        </div>
      </div>
    </div>`;

    await sendEmail(user.email, ` Deadline in ~${hoursLeft}h: ${task.title}`, html);
    console.log(`Deadline reminder sent to ${user.email} for task "${task.title}"`);
  } catch (error) {
    console.error('Error sending deadline reminder:', error.message);
  }
};
export default sendEmail;