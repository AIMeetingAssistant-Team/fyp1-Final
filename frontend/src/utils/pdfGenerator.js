import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Generate a PDF document from meeting minutes
 * @param {Object} meetingData - Meeting information (title, description, startTime, etc.)
 * @param {Object} minutes - Meeting minutes data (summary, keyPoints, decisions, actionItems)
 * @param {Object} options - Additional options (recordingName, etc.)
 * @returns {jsPDF} The generated PDF document
 */
export const generateMeetingMinutesPDF = (meetingData, minutes, options = {}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Colors
  const primaryColor = [59, 130, 246]; // Blue-500
  const secondaryColor = [139, 92, 246]; // Purple-500
  const textColor = [31, 41, 55]; // Gray-800

  // Helper function to add a new page if needed
  const checkPageBreak = (requiredHeight) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Header with gradient-like effect
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(
    meetingData?.title || 'Meeting Minutes',
    margin,
    yPosition + 15,
    { maxWidth: pageWidth - 2 * margin }
  );

  // Subtitle
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'AI-Generated Meeting Summary',
    margin,
    yPosition + 22,
    { maxWidth: pageWidth - 2 * margin }
  );

  yPosition = 50;

  // Meeting Information Section
  doc.setTextColor(...textColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Meeting Information', margin, yPosition);
  
  yPosition += 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const meetingInfo = [];
  if (meetingData?.startTime) {
    const date = new Date(meetingData.startTime);
    meetingInfo.push(['Date:', date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })]);
  }
  if (meetingData?.meetingType) {
    meetingInfo.push(['Type:', meetingData.meetingType.charAt(0).toUpperCase() + meetingData.meetingType.slice(1)]);
  }
  if (meetingData?.startTime && meetingData?.endTime) {
    const duration = Math.round((new Date(meetingData.endTime) - new Date(meetingData.startTime)) / 60000);
    meetingInfo.push(['Duration:', `${duration} minutes`]);
  }
  if (options?.recordingName) {
    meetingInfo.push(['Recording:', options.recordingName]);
  }

  doc.autoTable({
    startY: yPosition,
    head: false,
    body: meetingInfo,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [229, 231, 235],
      lineWidth: 0.1
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35, textColor: [107, 114, 128] },
      1: { cellWidth: 'auto', textColor: textColor }
    },
    margin: { left: margin, right: margin }
  });

  yPosition = doc.lastAutoTable.finalY + 10;

  // Description (if available)
  if (meetingData?.description) {
    checkPageBreak(15);
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text('Description:', margin, yPosition);
    yPosition += 5;
    doc.setTextColor(...textColor);
    const splitDescription = doc.splitTextToSize(meetingData.description, pageWidth - 2 * margin);
    doc.text(splitDescription, margin, yPosition);
    yPosition += splitDescription.length * 5 + 8;
  }

  // Summary Section
  if (minutes?.summary) {
    checkPageBreak(30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text('Summary', margin, yPosition);
    
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(59, 130, 246);
    doc.rect(margin, yPosition - 2, pageWidth - 2 * margin, 1, 'F');
    
    yPosition += 5;
    
    doc.setTextColor(...textColor);
    const splitSummary = doc.splitTextToSize(minutes.summary, pageWidth - 2 * margin);
    doc.text(splitSummary, margin, yPosition);
    yPosition += splitSummary.length * 5 + 10;
  }

  // Key Points Section
  if (minutes?.keyPoints && minutes.keyPoints.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text('Key Points', margin, yPosition);
    
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(139, 92, 246);
    doc.rect(margin, yPosition - 2, pageWidth - 2 * margin, 1, 'F');
    
    yPosition += 5;
    
    minutes.keyPoints.forEach((point, index) => {
      checkPageBreak(15);
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, yPosition - 3, 5, 5, 'F');
      
      doc.setTextColor(139, 92, 246);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}.`, margin + 7, yPosition);
      
      doc.setTextColor(...textColor);
      doc.setFont('helvetica', 'normal');
      const splitPoint = doc.splitTextToSize(point, pageWidth - 2 * margin - 10);
      doc.text(splitPoint, margin + 15, yPosition);
      yPosition += splitPoint.length * 5 + 5;
    });
    
    yPosition += 5;
  }

  // Decisions Section
  if (minutes?.decisions && minutes.decisions.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text('Decisions', margin, yPosition);
    
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(34, 197, 94);
    doc.rect(margin, yPosition - 2, pageWidth - 2 * margin, 1, 'F');
    
    yPosition += 5;
    
    minutes.decisions.forEach((decision) => {
      checkPageBreak(20);
      doc.setFillColor(236, 253, 245);
      doc.roundedRect(margin, yPosition - 4, pageWidth - 2 * margin, 8, 2, 2, 'F');
      
      doc.setTextColor(34, 197, 94);
      doc.setFont('helvetica', 'bold');
      doc.text('✓', margin + 3, yPosition);
      
      doc.setTextColor(...textColor);
      doc.setFont('helvetica', 'normal');
      const splitDecision = doc.splitTextToSize(decision, pageWidth - 2 * margin - 8);
      doc.text(splitDecision, margin + 8, yPosition);
      yPosition += splitDecision.length * 5 + 6;
    });
    
    yPosition += 5;
  }

  // Action Items Section
  if (minutes?.actionItems && minutes.actionItems.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text('Action Items', margin, yPosition);
    
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(249, 115, 22);
    doc.rect(margin, yPosition - 2, pageWidth - 2 * margin, 1, 'F');
    
    yPosition += 5;

    // Prepare action items table
    const actionItemsData = minutes.actionItems.map((item, index) => [
      index + 1,
      item.text || '',
      item.assignedTo || 'Unassigned',
      item.deadline ? new Date(item.deadline).toLocaleDateString() : 'No deadline',
      item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Pending'
    ]);

    doc.autoTable({
      startY: yPosition,
      head: [['#', 'Action Item', 'Assigned To', 'Deadline', 'Status']],
      body: actionItemsData,
      theme: 'striped',
      headStyles: {
        fillColor: [249, 115, 22],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8,
        textColor: textColor
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 35 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25, halign: 'center' }
      },
      margin: { left: margin, right: margin },
      styles: {
        lineColor: [229, 231, 235],
        lineWidth: 0.1
      }
    });
  }

  // Footer
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Generated on ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
  }

  return doc;
};

/**
 * Generate and download PDF
 */
export const downloadMeetingMinutesPDF = (meetingData, minutes, options = {}) => {
  const doc = generateMeetingMinutesPDF(meetingData, minutes, options);
  const fileName = options.fileName || 
    `meeting-minutes-${meetingData?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'meeting'}-${Date.now()}.pdf`;
  doc.save(fileName);
};

/**
 * Generate PDF and return as data URL for preview
 */
export const generatePDFBlob = (meetingData, minutes, options = {}) => {
  const doc = generateMeetingMinutesPDF(meetingData, minutes, options);
  // Use data URL for iframe compatibility
  const dataUrl = doc.output('dataurlstring');
  return dataUrl;
};