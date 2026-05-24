import cron from 'node-cron';
import Task from '../models/Task.js';
import { sendTaskDeadlineReminderEmail } from './emailService.js';

/**
 * Runs every 30 minutes.
 * Finds tasks due within 6 hours that haven't had a reminder sent yet,
 * sends one email per assigned user, then marks reminderSent = true.
 */
export const startTaskReminderScheduler = () => {
    cron.schedule('*/30 * * * *', async () => {
        console.log('⏱  Running task deadline reminder check...');

        try {
            const now = new Date();

            // Since tasks have date only (stored as midnight),
            // we find tasks whose due DATE is today or tomorrow
            // and check if end-of-day is within 6 hours from now
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const tomorrowEnd = new Date();
            tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
            tomorrowEnd.setHours(23, 59, 59, 999);

            // Fetch candidate tasks (due today or tomorrow, active, not reminded)
            const candidateTasks = await Task.find({
                dueDate: { $gte: todayStart, $lte: tomorrowEnd },
                status: { $in: ['pending', 'in-progress'] },
                reminderSent: false,
                'assignedTo.0': { $exists: true }
            }).populate('assignedTo.user', 'name email');

            // For each task, treat end-of-due-date (11:59 PM) as the real deadline
            const tasksToRemind = candidateTasks.filter(task => {
                const endOfDueDate = new Date(task.dueDate);
                endOfDueDate.setHours(23, 59, 59, 999); // treat as end of that day

                const hoursUntilDeadline = (endOfDueDate - now) / (1000 * 60 * 60);

                // Send reminder if deadline is within 6 hours and hasn't passed
                return hoursUntilDeadline >= 0 && hoursUntilDeadline <= 6;
            });

            console.log(`📋 Found ${tasksToRemind.length} task(s) needing reminders`);

            for (const task of tasksToRemind) {
                const emailPromises = task.assignedTo.map(assignment =>
                    sendTaskDeadlineReminderEmail(task, assignment.user._id).catch(err => {
                        console.error(`  ✗ Failed for user ${assignment.user._id}:`, err.message);
                    })
                );

                await Promise.all(emailPromises);

                await Task.findByIdAndUpdate(task._id, { reminderSent: true });
                console.log(`   💾 reminderSent set to true`);
            }
        } catch (error) {
            console.error('❌ Task reminder scheduler error:', error.message);
        }
    });

    console.log('Task deadline reminder scheduler started (runs every 30 min)');
};
/*export const startTaskReminderScheduler = () => {
    cron.schedule('* * * * *', async () => {
        console.log('⏱  Running task deadline reminder check...');

        try {
            const now = new Date();

            // ✅ TESTING MODE: widen the window to 72 hours so ANY task
            // due today or tomorrow (or even 3 days out) gets caught
            const REMINDER_HOURS = 72; // 🔁 Change back to 6 for production

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const windowEnd = new Date();
            windowEnd.setDate(windowEnd.getDate() + Math.ceil(REMINDER_HOURS / 24));
            windowEnd.setHours(23, 59, 59, 999);

            // Fetch candidate tasks within the window
            const candidateTasks = await Task.find({
                dueDate: { $gte: todayStart, $lte: windowEnd },
                status: { $in: ['pending', 'in-progress'] },
                reminderSent: false,
                'assignedTo.0': { $exists: true }
            }).populate('assignedTo.user', 'name email');

            const tasksToRemind = candidateTasks.filter(task => {
                const endOfDueDate = new Date(task.dueDate);
                endOfDueDate.setHours(23, 59, 59, 999);

                const hoursUntilDeadline = (endOfDueDate - now) / (1000 * 60 * 60);

                return hoursUntilDeadline >= 0 && hoursUntilDeadline <= REMINDER_HOURS; // ✅
            });

            console.log(`📋 Found ${tasksToRemind.length} task(s) needing reminders`);

            for (const task of tasksToRemind) {
                const emailPromises = task.assignedTo.map(assignment =>
                    sendTaskDeadlineReminderEmail(task, assignment.user).catch(err => { // ✅ pass full user object
                        console.error(`  ✗ Failed for user ${assignment.user._id}:`, err.message);
                    })
                );

                await Promise.all(emailPromises);

                task.reminderSent = true;
                await task.save();

                console.log(`  ✓ Reminder(s) sent for task "${task.title}"`);
            }
        } catch (error) {
            console.error('❌ Task reminder scheduler error:', error.message);
        }
    });

    console.log('🕐 Task reminder scheduler started (runs every minute)');
};*/