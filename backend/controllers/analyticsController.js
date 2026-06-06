import Meeting from '../models/Meeting.js';
import Task from '../models/Task.js';
import PDFDocument from 'pdfkit';

// ==================== HELPER FUNCTIONS ====================

function getStartDate(period) {
  const now = new Date();
  switch (period) {
    case '7d': return new Date(now.setDate(now.getDate() - 7));
    case '30d': return new Date(now.setDate(now.getDate() - 30));
    case '90d': return new Date(now.setDate(now.getDate() - 90));
    default: return new Date(0);
  }
}

async function getMeetingsForUser(userId, startDate) {
  return await Meeting.find({
    $or: [{ host: userId }, { 'participants.user': userId }],
    createdAt: { $gte: startDate }
  }).populate('participants.user', 'name email');
}

async function getTasksForUser(userId, startDate) {
  return await Task.find({
    $or: [{ createdBy: userId }, { 'assignedTo.user': userId }],
    createdAt: { $gte: startDate }
  }).populate('meeting', 'title').populate('createdBy', 'name');
}

function getMeetingDuration(meeting) {
  if (meeting.actualDuration) return meeting.actualDuration;
  if (meeting.startTime && meeting.endTime) {
    return Math.round((new Date(meeting.endTime) - new Date(meeting.startTime)) / (1000 * 60));
  }
  return 0;
}

function formatDuration(minutes) {
  if (!minutes || minutes === 0) return '0 minutes';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} and ${mins} minute${mins > 1 ? 's' : ''}`;
  }
  return `${mins} minute${mins > 1 ? 's' : ''}`;
}

// ==================== MAIN DASHBOARD DATA ====================

export const getAnalyticsDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '30d' } = req.query;

    const startDate = getStartDate(period);
    const meetings = await getMeetingsForUser(userId, startDate);
    const tasks = await getTasksForUser(userId, startDate);

    // Calculate basic stats
    const totalMeetings = meetings.length;
    const completedMeetings = meetings.filter(m => m.status === 'completed').length;
    const totalMinutes = meetings.reduce((sum, m) => sum + getMeetingDuration(m), 0);
    const uniqueParticipants = new Set();
    
    meetings.forEach(meeting => {
      meeting.participants?.forEach(p => {
        const pUserId = p.user?._id?.toString() || p.user?.toString();
        if (pUserId && pUserId !== userId) {
          uniqueParticipants.add(pUserId);
        }
      });
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;

    const dashboardData = {
      overview: {
        meetings: {
          total: totalMeetings,
          completed: completedMeetings,
          completionRate: totalMeetings > 0 ? Math.round((completedMeetings / totalMeetings) * 100) : 0,
          totalHours: Math.round(totalMinutes / 60),
          totalMinutes: totalMinutes
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        },
        participants: {
          unique: uniqueParticipants.size
        }
      },
      period
    };

    res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Analytics dashboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== SIMPLE PDF REPORT ====================

export const exportSummaryPDF = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '30d' } = req.query;
    
    const startDate = getStartDate(period);
    const meetings = await getMeetingsForUser(userId, startDate);
    const tasks = await getTasksForUser(userId, startDate);
    
    // Calculate statistics for the report
    const totalMeetings = meetings.length;
    const completedMeetings = meetings.filter(m => m.status === 'completed').length;
    const totalMinutes = meetings.reduce((sum, m) => sum + getMeetingDuration(m), 0);
    const avgDuration = totalMeetings > 0 ? Math.round(totalMinutes / totalMeetings) : 0;
    
    // Task statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
    
    // Priority breakdown
    const urgentTasks = tasks.filter(t => t.priority === 'urgent').length;
    const highTasks = tasks.filter(t => t.priority === 'high').length;
    const mediumTasks = tasks.filter(t => t.priority === 'medium').length;
    const lowTasks = tasks.filter(t => t.priority === 'low').length;
    
    // Participation stats
    const uniqueParticipants = new Set();
    let totalInvites = 0;
    let totalAccepted = 0;
    
    meetings.forEach(meeting => {
      meeting.participants?.forEach(p => {
        const pUserId = p.user?._id?.toString() || p.user?.toString();
        totalInvites++;
        if (pUserId && pUserId !== userId) {
          uniqueParticipants.add(pUserId);
          if (p.status === 'accepted') totalAccepted++;
        }
      });
    });
    
    // Calculate week-over-week trend
    const now = new Date();
    const thisWeek = meetings.filter(m => {
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      return new Date(m.startTime) >= weekAgo;
    });
    const lastWeek = meetings.filter(m => {
      const twoWeeksAgo = new Date(now.setDate(now.getDate() - 14));
      const oneWeekAgo = new Date(now.setDate(now.getDate() + 7));
      return new Date(m.startTime) >= twoWeeksAgo && new Date(m.startTime) < oneWeekAgo;
    });
    
    const trend = lastWeek.length > 0 
      ? Math.round(((thisWeek.length - lastWeek.length) / lastWeek.length) * 100)
      : 0;
    
    // Period label
    const periodLabels = {
      '7d': 'last 7 days',
      '30d': 'last 30 days',
      '90d': 'last 90 days',
      'all': 'all time'
    };
    
    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Analytics Report - ${new Date().toLocaleDateString()}`,
        Author: req.user.name || 'Meeting Assistant'
      }
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    const filename = `analytics-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    doc.pipe(res);
    
    // Colors
    const primaryColor = '#0891b2';
    const textColor = '#1f2937';
    const lightTextColor = '#6b7280';
    
    // ========== HEADER ==========
    doc.fillColor(primaryColor)
      .rect(0, 0, doc.page.width, 70)
      .fill();
    
    doc.fillColor('#FFFFFF')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('Analytics Summary Report', 50, 25);
    
    doc.fontSize(10)
      .font('Helvetica')
      .text(`Generated on ${new Date().toLocaleDateString()}`, 50, 52);
    
    let y = 100;
    
    // ========== INTRODUCTION PARAGRAPH ==========
    doc.fillColor(textColor)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('1. Executive Summary', 50, y);
    
    y += 20;
    
    doc.fontSize(10)
      .font('Helvetica')
      .text(`This report provides an overview of your meeting and task activity for the ${periodLabels[period] || 'selected period'}. ` +
        `During this time, you have been involved in ${totalMeetings} meeting${totalMeetings !== 1 ? 's' : ''}, ` +
        `with ${completedMeetings} meeting${completedMeetings !== 1 ? 's' : ''} successfully completed. ` +
        `The completion rate for your meetings is ${totalMeetings > 0 ? Math.round((completedMeetings / totalMeetings) * 100) : 0}%.`, 
        50, y, { width: doc.page.width - 100 });
    
    y += doc.heightOfString(`This report provides an overview of your meeting and task activity for the ${periodLabels[period] || 'selected period'}. ` +
      `During this time, you have been involved in ${totalMeetings} meeting${totalMeetings !== 1 ? 's' : ''}, ` +
      `with ${completedMeetings} meeting${completedMeetings !== 1 ? 's' : ''} successfully completed. ` +
      `The completion rate for your meetings is ${totalMeetings > 0 ? Math.round((completedMeetings / totalMeetings) * 100) : 0}%.`, 50, y, { width: doc.page.width - 100 }) + 15;
    
    // ========== TIME SPENT PARAGRAPH ==========
    doc.fillColor(textColor)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('2. Time Investment', 50, y);
    
    y += 20;
    
    doc.fontSize(10)
      .font('Helvetica')
      .text(`You have spent approximately ${formatDuration(totalMinutes)} in meetings during this period. ` +
        `On average, each meeting lasted ${formatDuration(avgDuration)}. ` +
        `${trend > 0 ? `Meeting activity has increased by ${trend}% compared to the previous week, ` : trend < 0 ? `Meeting activity has decreased by ${Math.abs(trend)}% compared to the previous week, ` : 'Meeting activity has remained stable compared to the previous week, '}` +
        `indicating ${trend > 0 ? 'growing engagement' : trend < 0 ? 'reduced meeting frequency' : 'consistent meeting habits'}.`, 
        50, y, { width: doc.page.width - 100 });
    
    y += doc.heightOfString(`You have spent approximately ${formatDuration(totalMinutes)} in meetings during this period. ` +
      `On average, each meeting lasted ${formatDuration(avgDuration)}. ` +
      `${trend > 0 ? `Meeting activity has increased by ${trend}% compared to the previous week, ` : trend < 0 ? `Meeting activity has decreased by ${Math.abs(trend)}% compared to the previous week, ` : 'Meeting activity has remained stable compared to the previous week, '}` +
      `indicating ${trend > 0 ? 'growing engagement' : trend < 0 ? 'reduced meeting frequency' : 'consistent meeting habits'}.`, 50, y, { width: doc.page.width - 100 }) + 15;
    
    // Check if we need a new page
    if (y > 650) {
      doc.addPage();
      y = 50;
    }
    
    // ========== TASK PERFORMANCE PARAGRAPH ==========
    doc.fillColor(textColor)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('3. Task Performance', 50, y);
    
    y += 20;
    
    doc.fontSize(10)
      .font('Helvetica')
      .text(`You have ${totalTasks} task${totalTasks !== 1 ? 's' : ''} associated with your meetings. ` +
        `Of these, ${completedTasks} have been completed, ${inProgressTasks} are currently in progress, ` +
        `and ${pendingTasks} are pending. Your overall task completion rate is ${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%.`, 
        50, y, { width: doc.page.width - 100 });
    
    y += doc.heightOfString(`You have ${totalTasks} task${totalTasks !== 1 ? 's' : ''} associated with your meetings. ` +
      `Of these, ${completedTasks} have been completed, ${inProgressTasks} are currently in progress, ` +
      `and ${pendingTasks} are pending. Your overall task completion rate is ${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%.`, 50, y, { width: doc.page.width - 100 }) + 15;
    
    // Priority distribution paragraph
    if (totalTasks > 0) {
      doc.fontSize(10)
        .font('Helvetica')
        .text(`Regarding task priorities: ${urgentTasks} urgent task${urgentTasks !== 1 ? 's' : ''}, ` +
          `${highTasks} high priority task${highTasks !== 1 ? 's' : ''}, ${mediumTasks} medium priority task${mediumTasks !== 1 ? 's' : ''}, ` +
          `and ${lowTasks} low priority task${lowTasks !== 1 ? 's' : ''}. ${urgentTasks > 0 ? 'Consider addressing urgent tasks first to maintain productivity.' : 'Your task distribution shows a balanced workload.'}`, 
          50, y, { width: doc.page.width - 100 });
      
      y += doc.heightOfString(`Regarding task priorities: ${urgentTasks} urgent task${urgentTasks !== 1 ? 's' : ''}, ` +
        `${highTasks} high priority task${highTasks !== 1 ? 's' : ''}, ${mediumTasks} medium priority task${mediumTasks !== 1 ? 's' : ''}, ` +
        `and ${lowTasks} low priority task${lowTasks !== 1 ? 's' : ''}. ${urgentTasks > 0 ? 'Consider addressing urgent tasks first to maintain productivity.' : 'Your task distribution shows a balanced workload.'}`, 50, y, { width: doc.page.width - 100 }) + 15;
    }
    
    // ========== PARTICIPATION PARAGRAPH ==========
    doc.fillColor(textColor)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('4. Team Participation', 50, y);
    
    y += 20;
    
    const acceptanceRate = totalInvites > 0 ? Math.round((totalAccepted / totalInvites) * 100) : 0;
    
    doc.fontSize(10)
      .font('Helvetica')
      .text(`Your meetings have involved ${uniqueParticipants.size} unique participant${uniqueParticipants.size !== 1 ? 's' : ''} ` +
        `across ${totalMeetings} meeting${totalMeetings !== 1 ? 's' : ''}. ` +
        `The average attendance per meeting is ${totalMeetings > 0 ? Math.round((totalAccepted / totalMeetings)) : 0} participant${totalMeetings > 0 ? Math.round((totalAccepted / totalMeetings)) !== 1 ? 's' : '' : ''}. ` +
        `The invitation acceptance rate is ${acceptanceRate}%, which ${acceptanceRate > 70 ? 'indicates strong team engagement' : acceptanceRate < 50 ? 'suggests room for improving meeting communication' : 'shows moderate team participation'}.`, 
        50, y, { width: doc.page.width - 100 });
    
    y += doc.heightOfString(`Your meetings have involved ${uniqueParticipants.size} unique participant${uniqueParticipants.size !== 1 ? 's' : ''} ` +
      `across ${totalMeetings} meeting${totalMeetings !== 1 ? 's' : ''}. ` +
      `The average attendance per meeting is ${totalMeetings > 0 ? Math.round((totalAccepted / totalMeetings)) : 0} participant${totalMeetings > 0 ? Math.round((totalAccepted / totalMeetings)) !== 1 ? 's' : '' : ''}. ` +
      `The invitation acceptance rate is ${acceptanceRate}%, which ${acceptanceRate > 70 ? 'indicates strong team engagement' : acceptanceRate < 50 ? 'suggests room for improving meeting communication' : 'shows moderate team participation'}.`, 50, y, { width: doc.page.width - 100 }) + 15;
    
    // ========== RECOMMENDATIONS PARAGRAPH ==========
    doc.fillColor(textColor)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('5. Recommendations & Insights', 50, y);
    
    y += 20;
    
    let recommendations = '';
    
    if (totalMeetings === 0) {
      recommendations = 'You have no meetings recorded in this period. Consider scheduling more meetings to improve team collaboration and track progress effectively.';
    } else if (completedMeetings / totalMeetings < 0.5) {
      recommendations = 'Your meeting completion rate is below 50%. Consider reviewing meeting schedules, sending timely reminders, and ensuring meetings have clear agendas to improve attendance and completion rates.';
    } else if (totalTasks > 0 && completedTasks / totalTasks < 0.5) {
      recommendations = 'Task completion rate is below 50%. Break down large tasks into smaller actionable items, set realistic deadlines, and conduct regular follow-ups to keep tasks on track.';
    } else if (acceptanceRate < 60) {
      recommendations = 'Meeting invitation acceptance rate is low. Ensure meeting times are convenient for participants, provide clear agendas in advance, and follow up with non-responders to improve engagement.';
    } else if (trend > 20) {
      recommendations = 'Your meeting frequency has significantly increased. While this shows engagement, ensure meetings remain productive by setting time limits and having clear objectives.';
    } else if (trend < -20) {
      recommendations = 'Your meeting frequency has decreased. Consider maintaining regular check-ins with your team to ensure alignment and address any collaboration gaps.';
    } else {
      recommendations = 'Your meeting and task metrics show consistent performance. To further improve, consider implementing post-meeting surveys, automating task assignments from meeting minutes, and setting quarterly collaboration goals.';
    }
    
    doc.fontSize(10)
      .font('Helvetica')
      .text(recommendations, 50, y, { width: doc.page.width - 100 });
    
    y += doc.heightOfString(recommendations, 50, y, { width: doc.page.width - 100 }) + 30;
    
    // ========== FOOTER ==========
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.strokeColor('#e2e8f0')
        .lineWidth(0.5)
        .moveTo(50, doc.page.height - 30)
        .lineTo(doc.page.width - 50, doc.page.height - 30)
        .stroke();
      
      doc.fillColor(lightTextColor)
        .fontSize(8)
        .text(`AI Meeting Assistant • Generated ${new Date().toLocaleDateString()}`, 50, doc.page.height - 20);
      
      doc.fillColor(lightTextColor)
        .fontSize(8)
        .text(`Page ${i + 1} of ${pageCount}`, doc.page.width - 80, doc.page.height - 20);
    }
    
    doc.end();
    
  } catch (error) {
    console.error('PDF export error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};