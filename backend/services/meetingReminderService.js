import cron from 'node-cron';
import Meeting from '../models/Meeting.js';
import MeetingInvite from '../models/MeetingInvite.js';
import { sendEmail } from '../utils/emailService.js';
import { generateMeetingReminderEmail } from '../utils/emailService.js';

class MeetingReminderService {
  constructor() {
    this.isRunning = false;
    // Default reminder time: 1 hour before meeting (configurable via env)
    this.reminderMinutesBefore = parseInt(process.env.MEETING_REMINDER_MINUTES || '60');
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️  Meeting Reminder Service is already running');
      return;
    }

    // Check every 5 minutes for meetings needing reminders
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.sendReminders();
      } catch (error) {
        console.error('❌ Meeting reminder error:', error);
      }
    });

    this.isRunning = true;
    console.log(`✅ Meeting Reminder Service Started - Checking every 5 minutes (${this.reminderMinutesBefore} minutes before meeting)`);
  }

  async sendReminders() {
    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + (this.reminderMinutesBefore * 60 * 1000));

      // Find meetings that need reminders:
      // 1. Status is 'scheduled'
      // 2. Start time is within reminder window (between now and reminderTime)
      // 3. Reminders haven't been sent yet
      const meetingsNeedingReminders = await Meeting.find({
        status: 'scheduled',
        startTime: {
          $gte: now,
          $lte: reminderTime
        },
        'inviteStatus.sent': true,
        'inviteStatus.reminderSent': false
      }).populate('host', 'name email');

      if (meetingsNeedingReminders.length === 0) {
        return { sent: 0, failed: 0 };
      }

      let totalSent = 0;
      let totalFailed = 0;

      for (const meeting of meetingsNeedingReminders) {
        try {
          // Get all accepted/pending/maybe invites for this meeting
          const invites = await MeetingInvite.find({
            meeting: meeting._id,
            status: { $in: ['accepted', 'pending', 'maybe'] },
            reminderSent: false
          }).populate('invitedUser', 'email name');

          let meetingSent = 0;
          let meetingFailed = 0;

          // Send reminder to each invitee
          for (const invite of invites) {
            try {
              await sendEmail(
                invite.email,
                `Reminder: ${meeting.title} starting soon`,
                generateMeetingReminderEmail(meeting, invite)
              );

              // Mark reminder as sent for this invite
              invite.reminderSent = true;
              invite.reminderSentAt = new Date();
              await invite.save();

              meetingSent++;
              console.log(`✅ Reminder sent to: ${invite.email} for meeting: ${meeting.title}`);
            } catch (emailError) {
              meetingFailed++;
              console.error(`❌ Reminder failed for: ${invite.email}`, emailError);
            }
          }

          // If all reminders sent successfully, mark meeting reminder as sent
          if (meetingFailed === 0 && meetingSent > 0) {
            meeting.inviteStatus.reminderSent = true;
            meeting.inviteStatus.reminderSentAt = new Date();
            await meeting.save();
          }

          totalSent += meetingSent;
          totalFailed += meetingFailed;

        } catch (meetingError) {
          console.error(`❌ Error processing reminders for meeting ${meeting._id}:`, meetingError);
          totalFailed++;
        }
      }

      if (totalSent > 0 || totalFailed > 0) {
        console.log(`📧 Reminder Summary: ${totalSent} sent, ${totalFailed} failed`);
      }

      return { sent: totalSent, failed: totalFailed };

    } catch (error) {
      console.error('❌ Meeting reminder service error:', error);
      throw error;
    }
  }

  // Manual trigger for testing
  async manualSendReminders() {
    try {
      console.log('🔔 Manual reminder trigger...');
      const results = await this.sendReminders();
      console.log('✅ Manual reminder completed:', results);
      return results;
    } catch (error) {
      console.error('❌ Manual reminder failed:', error);
      throw error;
    }
  }

  // Stop the service (if needed)
  stop() {
    this.isRunning = false;
    console.log('⚠️  Meeting Reminder Service Stopped');
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      reminderMinutesBefore: this.reminderMinutesBefore,
      lastChecked: new Date()
    };
  }
}

// Create singleton instance
const meetingReminderService = new MeetingReminderService();

export default meetingReminderService;


