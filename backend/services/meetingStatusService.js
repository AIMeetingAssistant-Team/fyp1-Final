import cron from 'node-cron';
import Meeting from '../models/Meeting.js';

class MeetingStatusService {
  constructor() {
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('Meeting Status Service is already running');
      return;
    }

    // Har minute check karo meetings ki status (background job)
    cron.schedule('* * * * *', async () => {
      try {
        await this.updateMeetingStatuses();
      } catch (error) {
        console.error(' Meeting status update error:', error);
      }
    });

    this.isRunning = true;
    console.log(' Meeting Status Service Started - Running every minute');
  }

  async updateMeetingStatuses() {
    try {
      const now = new Date();
      let updates = {
        started: 0,
        completed: 0, 
        cancelled: 0
      };

      // 1. Scheduled → In-Progress (Start time reached)
      const startedMeetings = await Meeting.updateMany({
        status: 'scheduled',
        startTime: { $lte: now },
        endTime: { $gte: now }
      }, {
        status: 'in-progress',
        $set: { 
          'participants.$[elem].status': 'attended' 
        }
      }, {
        arrayFilters: [{ 'elem.status': 'invited' }]
      });

      updates.started = startedMeetings.modifiedCount;

      // 2. In-Progress → Completed (End time reached)
      const completedMeetings = await Meeting.updateMany({
        status: 'in-progress',
        endTime: { $lt: now }
      }, {
        status: 'completed'
      });

      updates.completed = completedMeetings.modifiedCount;

      // 3. Scheduled → Cancelled (Past meetings that never started)
      const cancelledMeetings = await Meeting.updateMany({
        status: 'scheduled',
        endTime: { $lt: now }
      }, {
        status: 'cancelled'
      });

      updates.cancelled = cancelledMeetings.modifiedCount;

      // Log results only if something changed
      if (updates.started > 0 || updates.completed > 0 || updates.cancelled > 0) {
        console.log(` Auto Meeting Updates: 
           ${updates.started} started, 
           ${updates.completed} completed, 
           ${updates.cancelled} cancelled`);
      }

      return updates;

    } catch (error) {
      console.error(' Meeting status update failed:', error);
      throw error;
    }
  }

  // Manual trigger for testing
  async manualStatusUpdate() {
    try {
      console.log('Manual meeting status update triggered...');
      const results = await this.updateMeetingStatuses();
      console.log(' Manual update completed:', results);
      return results;
    } catch (error) {
      console.error(' Manual update failed:', error);
      throw error;
    }
  }

  // Stop the service (if needed)
  stop() {
    // Note: node-cron doesn't have direct stop method
    // You need to handle this differently if needed
    this.isRunning = false;
    console.log('Meeting Status Service Stopped');
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastChecked: new Date()
    };
  }
}

// Create singleton instance
const meetingStatusService = new MeetingStatusService();

export default meetingStatusService;