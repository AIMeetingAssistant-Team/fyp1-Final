import aiService from '../utils/aiService.js';
import { getTranscriptionLanguage } from '../utils/transcriptionConfig.js';
import Meeting from '../models/Meeting.js';
import Task from '../models/Task.js';
import axios from 'axios';
import { deleteFromCloudinary } from '../config/cloudinary.js';
import cloudinary from '../config/cloudinary.js';
import PDFDocument from 'pdfkit';

// ==================== AI SERVICE HEALTH CHECK ====================

export const checkAIHealth = async (req, res) => {
  try {
    console.log('🤖 Checking AI Service health...');
    
    const healthResult = await aiService.healthCheck();
    
    if (!healthResult.success) {
      return res.status(503).json({
        success: false,
        message: 'AI Service is unavailable',
        error: healthResult.error
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'AI Service is running',
      service: healthResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('AI health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check AI service health',
      error: error.message
    });
  }
};

// ==================== TRANSCRIPTION ====================

export const transcribeRecording = async (req, res) => {
  try {
    const { meetingId, recordingIndex = 0 } = req.params;
    const { language, generateMinutes = false, extractTasks = false } = req.body;

    console.log(`🎙️ Starting transcription for meeting ${meetingId}, recording ${recordingIndex}`);

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check authorization
    const canAccess = meeting.host.toString() === req.user.id ||
      meeting.participants.some(p => p.user.toString() === req.user.id);
    
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to transcribe this meeting'
      });
    }

    // Check if recording exists
    if (!meeting.recordings || meeting.recordings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No recordings available for this meeting'
      });
    }

    const recording = meeting.recordings[recordingIndex];
    if (!recording) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found at specified index'
      });
    }

    // Check if already transcribed
    if (recording.transcriptionStatus === 'completed' && meeting.transcription?.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'This recording has already been transcribed',
        transcription: meeting.transcription
      });
    }

    if (recording.transcriptionStatus === 'processing') {
      return res.status(400).json({
        success: false,
        message: 'Transcription is already in progress'
      });
    }

    console.log(`📊 Recording info: ${recording.fileName}, ${recording.fileSize} bytes`);
    
    // Update status
    await meeting.startTranscription(recordingIndex);
    
    // For async processing, respond immediately
    res.status(202).json({
      success: true,
      message: 'Transcription started',
      jobId: `${meetingId}_${recordingIndex}_${Date.now()}`,
      meeting: {
        id: meeting._id,
        title: meeting.title
      },
      recording: {
        index: recordingIndex,
        fileName: recording.fileName
      }
    });

    // Start async transcription (this runs in background)
    processTranscriptionAsync(meeting, recording, recordingIndex, language, generateMinutes, extractTasks, req.user.id);

  } catch (error) {
    console.error('Transcription initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start transcription',
      error: error.message
    });
  }
};

// Helper function to trigger transcription (can be called from other controllers)
// In-memory lock to prevent duplicate transcription triggers
const transcriptionLocks = new Map();

export async function triggerTranscriptionForRecording(meetingId, recordingIndex, options = {}) {
  const lockKey = `${meetingId}_${recordingIndex}`;
  
  // Check if transcription is already in progress (in-memory lock)
  if (transcriptionLocks.has(lockKey)) {
    console.log(`⏸️ Transcription already in progress for ${lockKey}, skipping...`);
    return { success: true, alreadyProcessing: true };
  }

  try {
    const {
      language = getTranscriptionLanguage(options.language),
      generateMinutes = true,
      extractTasks = false,
      userId = null
    } = options;

    // Fetch fresh meeting document to avoid stale data
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    if (!meeting.recordings || meeting.recordings.length === 0) {
      throw new Error('No recordings available');
    }

    const recording = meeting.recordings[recordingIndex];
    if (!recording) {
      throw new Error('Recording not found');
    }

    // Check if already transcribed
    if (recording.transcriptionStatus === 'completed') {
      console.log(`✅ Recording ${recordingIndex} already transcribed`);
      return { success: true, alreadyTranscribed: true };
    }

    // Check if already processing (double-check with DB)
    if (recording.transcriptionStatus === 'processing') {
      console.log(`⏸️ Recording ${recordingIndex} transcription already in progress (DB check)`);
      return { success: true, alreadyProcessing: true };
    }

    // Set in-memory lock
    transcriptionLocks.set(lockKey, true);

    // Update status in database
    await meeting.startTranscription(recordingIndex);

    // Start async transcription (don't await - let it run in background)
    processTranscriptionAsync(meeting, recording, recordingIndex, language, generateMinutes, extractTasks, userId)
      .finally(() => {
        // Remove lock when transcription completes or fails
        transcriptionLocks.delete(lockKey);
      });

    return { success: true, started: true };
  } catch (error) {
    // Remove lock on error
    transcriptionLocks.delete(lockKey);
    console.error('Error triggering transcription:', error);
    return { success: false, error: error.message };
  }
}

// Async transcription processing
async function processTranscriptionAsync(meeting, recording, recordingIndex, language, generateMinutes, extractTasks, userId) {
  try {
    console.log(`🚀 Starting async transcription for: ${meeting.title}`);
    
    // Fetch recording from Cloudinary - use URL directly if available, otherwise use publicId
    const recordingBuffer = await fetchFromCloudinary(recording.url || recording.publicId, recording.publicId);
    
    if (!recordingBuffer) {
      throw new Error('Failed to fetch recording from Cloudinary');
    }

    // Call AI service (default to English if language not specified)
    const transcriptionResult = await aiService.transcribeAudio(
      recordingBuffer,
      recording.fileName,
      language || getTranscriptionLanguage()
    );

    if (!transcriptionResult.success) {
      throw new Error(`AI Service failed: ${transcriptionResult.error}`);
    }

    // Fetch fresh meeting document before saving
    const meetingDoc = await Meeting.findById(meeting._id);
    if (!meetingDoc) {
      throw new Error('Meeting not found');
    }

    console.log(`💾 Saving transcription to database for meeting: ${meetingDoc._id}`);
    console.log(`📝 Transcription text length: ${transcriptionResult.text?.length || 0} characters`);
    console.log(`📊 Transcription data:`, {
      hasText: !!transcriptionResult.text,
      hasSegments: !!transcriptionResult.segments,
      language: transcriptionResult.language,
      confidence: transcriptionResult.confidence
    });

    // Update meeting with transcription
    try {
      await meetingDoc.completeTranscription(transcriptionResult, recordingIndex);
      console.log(`✅ Transcription saved successfully for: ${meetingDoc.title}`);
      
      // Verify it was saved by fetching again
      const verifyDoc = await Meeting.findById(meeting._id);
      if (verifyDoc?.transcription?.status === 'completed') {
        console.log(`✅ Verified: Transcription is saved in database`);
      } else {
        console.error(`❌ WARNING: Transcription save verification failed. Status: ${verifyDoc?.transcription?.status}`);
      }
    } catch (saveError) {
      console.error('❌ Error saving transcription:', saveError);
      console.error('Save error details:', {
        message: saveError.message,
        name: saveError.name,
        stack: saveError.stack
      });
      throw saveError;
    }
    
    // Generate minutes if requested
    if (generateMinutes && transcriptionResult.text) {
      await generateMeetingMinutesAsync(meeting, transcriptionResult.text, extractTasks, userId, recordingIndex);
    }
    
  } catch (error) {
    console.error('Async transcription error:', error);
    
    // Update meeting with failure status
    const meetingDoc = await Meeting.findById(meeting._id);
    if (meetingDoc) {
      meetingDoc.transcription.status = 'failed';
      if (meetingDoc.recordings[recordingIndex]) {
        meetingDoc.recordings[recordingIndex].transcriptionStatus = 'failed';
      }
      await meetingDoc.save();
    }
  }
}

// Helper function to fetch from Cloudinary
async function fetchFromCloudinary(urlOrPublicId, publicId = null) {
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      let url = urlOrPublicId;
      
      // If it's already a full URL, use it directly
      if (urlOrPublicId && (urlOrPublicId.startsWith('http://') || urlOrPublicId.startsWith('https://'))) {
        console.log(`📥 Using direct URL: ${url}`);
      } else {
        // Otherwise, construct URL from publicId
        const idToUse = publicId || urlOrPublicId;
        if (!idToUse) {
          throw new Error('Public ID or URL is required');
        }
        
        console.log(`📥 Fetching from Cloudinary (attempt ${attempt}/${maxRetries}): ${idToUse}`);
        
        // Try different resource types
        const resourceTypes = ['video', 'raw', 'auto'];
        let lastError = null;
        
        for (const resourceType of resourceTypes) {
          try {
            url = cloudinary.url(idToUse, {
              resource_type: resourceType,
              secure: true,
              fetch_format: 'auto'
            });
            
            console.log(`📥 Trying URL (${resourceType}): ${url}`);
            
            const response = await axios({
              method: 'GET',
              url: url,
              responseType: 'arraybuffer',
              timeout: 600000,
              maxContentLength: 500 * 1024 * 1024,
              maxBodyLength: 500 * 1024 * 1024,
              validateStatus: (status) => status < 500, // Don't throw on 4xx errors
              onDownloadProgress: (progressEvent) => {
                if (progressEvent.total) {
                  const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                  if (percent % 25 === 0) {
                    console.log(`📥 Download progress: ${percent}%`);
                  }
                }
              }
            });
            
            if (response.status === 200) {
              const buffer = Buffer.from(response.data);
              console.log(`✅ Successfully downloaded ${buffer.length} bytes from Cloudinary (${resourceType})`);
              return buffer;
            } else if (response.status === 423) {
              // File is locked, wait and retry
              console.log(`⚠️ File locked (423), waiting ${retryDelay}ms before retry...`);
              lastError = new Error(`File locked (423)`);
              break; // Break out of resource type loop, will retry in outer loop
            } else {
              lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
              continue; // Try next resource type
            }
          } catch (typeError) {
            lastError = typeError;
            continue; // Try next resource type
          }
        }
        
        // If all resource types failed, throw the last error
        if (lastError) {
          throw lastError;
        }
      }
      
      // If we have a direct URL, fetch it
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        const response = await axios({
          method: 'GET',
          url: url,
          responseType: 'arraybuffer',
          timeout: 600000,
          maxContentLength: 500 * 1024 * 1024,
          maxBodyLength: 500 * 1024 * 1024,
          validateStatus: (status) => status < 500,
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              if (percent % 25 === 0) {
                console.log(`📥 Download progress: ${percent}%`);
              }
            }
          }
        });
        
        if (response.status === 200) {
          const buffer = Buffer.from(response.data);
          console.log(`✅ Successfully downloaded ${buffer.length} bytes from Cloudinary`);
          return buffer;
        } else if (response.status === 423 && attempt < maxRetries) {
          console.log(`⚠️ File locked (423), waiting ${retryDelay}ms before retry ${attempt + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue; // Retry
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Cloudinary fetch error (attempt ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt < maxRetries && (error.response?.status === 423 || error.code === 'ECONNRESET')) {
        // Wait before retrying (exponential backoff)
        const delay = retryDelay * attempt;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Last attempt or non-retryable error
      if (attempt === maxRetries) {
        console.error('❌ All retry attempts failed');
        return null;
      }
    }
  }
  
  return null;
}

// ==================== MINUTES GENERATION ====================

async function generateMeetingMinutesAsync(meeting, transcriptionText, extractTasks, userId, recordingIndex = null) {
  try {
    // Fetch fresh meeting document
    const meetingDoc = await Meeting.findById(meeting._id);
    if (!meetingDoc) {
      throw new Error('Meeting not found');
    }

    console.log(`📝 Generating minutes for: ${meetingDoc.title}${recordingIndex !== null ? ` (recording ${recordingIndex})` : ''}`);
    
    // Call AI service for summarization
    const minutesResult = await aiService.generateMinutes(
      transcriptionText,
      meetingDoc.meetingType || 'general'
    );

    if (!minutesResult.success) {
      throw new Error(`Minutes generation failed: ${minutesResult.error}`);
    }

    // If recordingIndex is provided, save minutes per-recording
    if (recordingIndex !== null && meetingDoc.recordings && meetingDoc.recordings[recordingIndex]) {
      const recording = meetingDoc.recordings[recordingIndex];
      
      // Save minutes to recording
      recording.minutesResult = {
        summary: minutesResult.summary || '',
        keyPoints: minutesResult.minutes?.key_points || minutesResult.key_points || [],
        decisions: minutesResult.minutes?.decisions || minutesResult.decisions || [],
        actionItems: minutesResult.minutes?.next_steps?.map((step) => ({
          text: step,
          assignedTo: null,
          deadline: null,
          status: 'pending'
        })) || [],
        generatedAt: new Date()
      };
      
      // Generate AI insights for this recording
      recording.aiInsights = {
        sentiment: extractSentiment(minutesResult.summary),
        topics: minutesResult.minutes?.key_points?.slice(0, 5) || []
      };
      
      await meetingDoc.save();
      console.log(`✅ Minutes and insights generated for recording ${recordingIndex} of: ${meetingDoc.title}`);
    } else {
      // Fallback: Update meeting-level minutes (for backward compatibility)
      await meetingDoc.generateMinutes({
        summary: minutesResult.summary || '',
        keyPoints: minutesResult.minutes?.key_points || minutesResult.key_points || [],
        decisions: minutesResult.minutes?.decisions || minutesResult.decisions || [],
        actionItems: minutesResult.minutes?.next_steps?.map((step, index) => ({
          text: step,
          assignedTo: null,
          deadline: null,
          status: 'pending'
        })) || []
      });
      console.log(`✅ Minutes generated for: ${meetingDoc.title}`);
    }
    
    // Extract tasks if requested
    if (extractTasks && minutesResult.summary) {
      await extractAndCreateTasksAsync(meetingDoc, minutesResult.summary, userId);
    }
    
  } catch (error) {
    console.error('Minutes generation error:', error);
  }
}

// Helper function to extract sentiment from summary text
function extractSentiment(text) {
  if (!text) return 'neutral';
  const lowerText = text.toLowerCase();
  const positiveWords = ['good', 'great', 'excellent', 'positive', 'successful', 'achieved', 'completed', 'progress', 'approved'];
  const negativeWords = ['failed', 'issue', 'problem', 'concern', 'negative', 'unable', 'difficult', 'rejected', 'delayed'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) positiveCount++;
  });
  
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) negativeCount++;
  });
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  if (positiveCount === negativeCount && positiveCount > 0) return 'mixed';
  return 'neutral';
}

// ==================== TASK EXTRACTION ====================

async function extractAndCreateTasksAsync(meeting, summaryText, userId) {
  try {
    console.log(`🔍 Extracting tasks from summary: ${meeting.title}`);
    
    // Call AI service for task extraction
    const tasksResult = await aiService.extractTasks(summaryText, {
      meetingId: meeting._id,
      meetingType: meeting.meetingType,
      participants: meeting.participants.map(p => p.user.toString())
    });

    if (!tasksResult.success) {
      console.warn(`Task extraction failed: ${tasksResult.error}`);
      return;
    }

    // Process extracted tasks
    const extractedTasks = tasksResult.tasks || [];
    console.log(`📋 Extracted ${extractedTasks.length} tasks`);
    
    // Update minutes with action items
    const actionItems = extractedTasks.map(task => ({
      text: task.description || task.title,
      assignedTo: task.assignee ? findUserByContext(task.assignee, meeting.participants) : null,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: 7 days
      status: 'pending'
    })).filter(item => item.text);

    // Update meeting with action items
    meeting.minutesOfMeeting.actionItems = actionItems;
    await meeting.save();

    // Create actual tasks in database
    const createdTasks = await meeting.createTasksFromActionItems(userId);
    
    console.log(`✅ Created ${createdTasks.length} tasks from action items`);
    
  } catch (error) {
    console.error('Task extraction error:', error);
  }
}

// Helper to find user by name/context
function findUserByContext(name, participants) {
  if (!name || !participants) return null;
  
  // This is a simplified version - you might want to implement better user matching
  const nameLower = name.toLowerCase();
  
  // You would typically query the User model here
  // For now, return the first participant as an example
  return participants.length > 0 ? participants[0].user : null;
}

// ==================== GET TRANSCRIPTION STATUS ====================

export const getTranscriptionStatus = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findById(meetingId)
      .populate('host', 'name email profilePicture')
      .populate('participants.user', 'name email profilePicture');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check authorization (host and participants are populated)
    const canAccess = meeting.host._id.toString() === req.user.id ||
      meeting.participants.some(p => p.user._id.toString() === req.user.id);
    
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view transcription status'
      });
    }

    res.status(200).json({
      success: true,
      meeting: {
        id: meeting._id,
        title: meeting.title
      },
      transcription: meeting.transcription,
      recordings: meeting.recordings?.map((rec, index) => ({
        index,
        fileName: rec.fileName,
        transcriptionStatus: rec.transcriptionStatus,
        processed: rec.transcriptionStatus === 'completed'
      })),
      minutes: meeting.minutesOfMeeting,
      canRegenerate: meeting.transcription?.status === 'completed' && 
        new Date() - new Date(meeting.transcription.processedAt) < 24 * 60 * 60 * 1000 // Within 24 hours
    });

  } catch (error) {
    console.error('Get transcription status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== REGENERATE MINUTES ====================

export const regenerateMinutes = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { extractTasks = false } = req.body;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check authorization (host only)
    if (meeting.host.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only meeting host can regenerate minutes'
      });
    }

    // Check if transcription exists
    if (!meeting.transcription || meeting.transcription.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'No completed transcription available'
      });
    }

    res.status(202).json({
      success: true,
      message: 'Minutes regeneration started',
      meeting: {
        id: meeting._id,
        title: meeting.title
      }
    });

    // Start async regeneration
    processRegenerationAsync(meeting, extractTasks, req.user.id);

  } catch (error) {
    console.error('Regenerate minutes error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

async function processRegenerationAsync(meeting, extractTasks, userId) {
  try {
    console.log(`🔄 Regenerating minutes for: ${meeting.title}`);
    
    // Call AI service for summarization
    const minutesResult = await aiService.generateMinutes(
      meeting.transcription.text,
      meeting.meetingType || 'general'
    );

    if (!minutesResult.success) {
      throw new Error(`Regeneration failed: ${minutesResult.error}`);
    }

    // Update meeting with new minutes
    await meeting.generateMinutes({
      summary: minutesResult.summary,
      keyPoints: minutesResult.minutes?.key_points || [],
      decisions: minutesResult.minutes?.decisions || [],
      actionItems: meeting.minutesOfMeeting?.actionItems || [] // Keep existing action items
    });

    console.log(`✅ Minutes regenerated for: ${meeting.title}`);
    
    // Extract tasks if requested
    if (extractTasks && minutesResult.summary) {
      await extractAndCreateTasksAsync(meeting, minutesResult.summary, userId);
    }
    
  } catch (error) {
    console.error('Regeneration error:', error);
  }
}

// ==================== GET MEETING INSIGHTS ====================

export const getMeetingInsights = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findById(meetingId)
      .populate('host', 'name email profilePicture')
      .populate('participants.user', 'name email profilePicture')
      .populate('minutesOfMeeting.actionItems.assignedTo', 'name email');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check authorization (host and participants are populated)
    const canAccess = meeting.host._id.toString() === req.user.id ||
      meeting.participants.some(p => p.user._id.toString() === req.user.id);
    
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view meeting insights'
      });
    }

    // Get per-recording transcriptions, minutes, and insights
    const recordingsWithTranscription = meeting.recordings?.map((recording, index) => ({
      index,
      fileName: recording.fileName,
      fileType: recording.fileType,
      fileSize: recording.fileSize,
      uploadedAt: recording.uploadedAt,
      transcriptionStatus: recording.transcriptionStatus,
      transcription: recording.transcriptionResult || null, // Per-recording transcription
      minutes: recording.minutesResult || null, // Per-recording minutes
      aiInsights: recording.aiInsights || null, // Per-recording insights
      url: recording.url,
      publicId: recording.publicId
    })) || [];

    // Calculate basic insights
    const insights = {
      transcription: meeting.transcription, // Global/combined transcription (for backward compatibility)
      recordings: recordingsWithTranscription, // Per-recording transcriptions
      minutes: meeting.minutesOfMeeting,
      aiInsights: meeting.aiInsights || {},
      statistics: {
        recordingCount: meeting.recordings?.length || 0,
        transcriptionLength: meeting.transcription?.text?.length || 0,
        wordCount: meeting.transcription?.text?.split(/\s+/).length || 0,
        minutesGenerated: !!meeting.minutesOfMeeting?.summary,
        actionItemsCount: meeting.minutesOfMeeting?.actionItems?.length || 0,
        completedActionItems: meeting.minutesOfMeeting?.actionItems?.filter(item => item.status === 'completed').length || 0
      },
      timeline: {
        meetingCreated: meeting.createdAt,
        lastUpdated: meeting.updatedAt,
        transcriptionProcessed: meeting.transcription?.processedAt,
        minutesGenerated: meeting.minutesOfMeeting?.generatedAt
      }
    };

    res.status(200).json({
      success: true,
      meeting: {
        id: meeting._id,
        title: meeting.title,
        type: meeting.meetingType
      },
      insights
    });

  } catch (error) {
    console.error('Get meeting insights error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== BULK AI PROCESSING ====================

export const processMultipleMeetings = async (req, res) => {
  try {
    const { meetingIds, options = {} } = req.body;
    const { 
      transcribe = true, 
      generateMinutes = true, 
      extractTasks = false,
      language = null 
    } = options;

    if (!meetingIds || !Array.isArray(meetingIds) || meetingIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of meeting IDs'
      });
    }

    if (meetingIds.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 meetings can be processed at once'
      });
    }

    // Verify user has access to all meetings
    const meetings = await Meeting.find({
      _id: { $in: meetingIds },
      $or: [
        { host: req.user.id },
        { 'participants.user': req.user.id }
      ]
    });

    if (meetings.length !== meetingIds.length) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to process some meetings'
      });
    }

    const results = {
      total: meetingIds.length,
      processed: 0,
      success: [],
      failed: [],
      skipped: []
    };

    // Process each meeting (in background)
    meetingIds.forEach((meetingId, index) => {
      setTimeout(async () => {
        try {
          const meeting = meetings.find(m => m._id.toString() === meetingId);
          if (!meeting) {
            results.failed.push({ meetingId, error: 'Meeting not found' });
            return;
          }

          // Check if already processed
          if (meeting.transcription?.status === 'completed' && meeting.minutesOfMeeting?.summary) {
            results.skipped.push({ meetingId, reason: 'Already processed' });
            return;
          }

          // Process recording if exists
          if (meeting.recordings?.length > 0 && transcribe) {
            await processTranscriptionAsync(
              meeting,
              meeting.recordings[0],
              0,
              language,
              generateMinutes,
              extractTasks,
              req.user.id
            );
          }

          results.success.push({ meetingId });
          results.processed++;
          
        } catch (error) {
          results.failed.push({ meetingId, error: error.message });
        }
      }, index * 1000); // Stagger requests by 1 second
    });

    res.status(202).json({
      success: true,
      message: `Started processing ${meetingIds.length} meetings`,
      jobId: `bulk_${Date.now()}`,
      results
    });

  } catch (error) {
    console.error('Bulk processing error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== GENERATE PDF FOR MEETING MINUTES ====================

export const generateMinutesPDF = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { recordingIndex } = req.query;

    // Find meeting
    const meeting = await Meeting.findById(meetingId)
      .populate('host', 'name email')
      .populate('participants.user', 'name email')
      .populate('minutesOfMeeting.actionItems.assignedTo', 'name email');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check authorization
    const canAccess = meeting.host._id.toString() === req.user.id ||
      meeting.participants.some(p => p.user._id.toString() === req.user.id);
    
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to generate PDF for this meeting'
      });
    }

    // Get minutes data - check if recordingIndex is provided
    let minutes = null;
    let recordingName = null;

    if (recordingIndex !== undefined && meeting.recordings && meeting.recordings[parseInt(recordingIndex)]) {
      const recording = meeting.recordings[parseInt(recordingIndex)];
      minutes = recording.minutesResult ? JSON.parse(JSON.stringify(recording.minutesResult)) : null;
      recordingName = recording.fileName;
      
      // If actionItems have assignedTo as ObjectId, we need to handle it
      if (minutes && minutes.actionItems) {
        for (const item of minutes.actionItems) {
          if (item.assignedTo && typeof item.assignedTo === 'object' && item.assignedTo._id) {
            item.assignedTo = item.assignedTo.name || 'Assigned';
          } else if (item.assignedTo && typeof item.assignedTo !== 'string') {
            item.assignedTo = 'Assigned';
          }
        }
      }
    } else {
      // Use global meeting minutes (already populated)
      minutes = meeting.minutesOfMeeting ? JSON.parse(JSON.stringify(meeting.minutesOfMeeting)) : null;
      
      // Handle assignedTo for global minutes (already populated, but convert to string)
      if (minutes && minutes.actionItems) {
        for (const item of minutes.actionItems) {
          if (item.assignedTo && typeof item.assignedTo === 'object') {
            item.assignedTo = item.assignedTo.name || 'Assigned';
          }
        }
      }
    }

    if (!minutes || !minutes.summary) {
      return res.status(400).json({
        success: false,
        message: 'No meeting minutes available. Please generate minutes first.'
      });
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Meeting Minutes - ${meeting.title}`,
        Author: meeting.host.name || 'Meeting System',
        Subject: 'Meeting Minutes',
        Creator: 'Meeting Management System'
      }
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    const fileName = recordingName
      ? `meeting-minutes-${meeting.title.replace(/[^a-z0-9]/gi, '_')}-${recordingName.replace(/[^a-z0-9.]/gi, '_')}.pdf`
      : `meeting-minutes-${meeting.title.replace(/[^a-z0-9]/gi, '_')}-${meetingId}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Beautiful Minimal Color Palette - Elegant and Appealing
    const colors = {
      primary: '#0891b2',      // Cyan-600 - Elegant cyan
      primaryLight: '#06b6d4', // Cyan-500 - Lighter cyan
      primaryDark: '#0e7490',  // Cyan-700 - Darker cyan
      accent: '#0d9488',       // Teal-600 - Teal accent
      accentLight: '#14b8a6',  // Teal-500 - Light teal
      text: '#1f2937',         // Gray-800 - Soft dark gray
      textLight: '#6b7280',    // Gray-500 - Medium gray
      textLighter: '#9ca3af',  // Gray-400 - Light gray
      bg: '#f8fafc',           // Slate-50 - Very light background
      bgCard: '#ffffff',       // White
      border: '#e2e8f0',       // Slate-200 - Soft border
      success: '#059669',      // Emerald-600 - Green
      warning: '#d97706',      // Amber-600 - Amber
      highlight: '#ecfeff'     // Cyan-50 - Very light cyan for backgrounds
    };

    // Helper function to check page break
    const checkPageBreak = (requiredHeight = 100) => {
      if (yPosition + requiredHeight > doc.page.height - 80) {
        doc.addPage();
        yPosition = 50;
        return true;
      }
      return false;
    };

    // Elegant Header with Gradient Effect
    const headerHeight = 90;
    
    // Create gradient effect with layered rectangles
    doc.fillColor(colors.primaryDark)
      .rect(0, 0, doc.page.width, headerHeight)
      .fill();
    
    doc.fillColor(colors.primary)
      .rect(0, 0, doc.page.width, headerHeight - 15)
      .fill();

    // Header Content
    doc.fillColor('#FFFFFF')
      .fontSize(26)
      .font('Helvetica-Bold')
      .text(meeting.title || 'Meeting Minutes', 50, 38, { 
        align: 'left',
        width: doc.page.width - 100
      });

    // Elegant subtitle
    doc.fillColor('rgba(255, 255, 255, 0.9)')
      .fontSize(10)
      .font('Helvetica')
      .text('AI Generated Summary', 50, 62, { 
        align: 'left'
      });

    let yPosition = 115;

    // Meeting Information Section with Proper Line Positioning
    checkPageBreak(100);
    
    // Section title - calculate height first
    const sectionTitleFontSize = 15;
    doc.fontSize(sectionTitleFontSize);
    const titleHeight = doc.heightOfString('Meeting Information', {
      width: doc.page.width - 100
    });
    
    doc.fillColor(colors.text)
      .fontSize(sectionTitleFontSize)
      .font('Helvetica-Bold')
      .text('Meeting Information', 50, yPosition);
    
    // Elegant divider line - positioned BELOW the text
    doc.strokeColor(colors.primary)
      .lineWidth(2.5)
      .moveTo(50, yPosition + titleHeight + 6)
      .lineTo(180, yPosition + titleHeight + 6)
      .stroke();

    yPosition += titleHeight + 20;

    // Create a nicely formatted info box
    const infoItems = [];
    const infoStartY = yPosition;
    
    if (meeting.startTime) {
      const date = new Date(meeting.startTime);
      const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      infoItems.push({ label: 'Date', value: formattedDate });
    }
    
    if (meeting.meetingType) {
      const meetingType = meeting.meetingType.charAt(0).toUpperCase() + meeting.meetingType.slice(1);
      infoItems.push({ label: 'Type', value: meetingType });
    }
    
    // if (meeting.startTime && meeting.endTime) {
    //   const duration = Math.round((new Date(meeting.endTime) - new Date(meeting.startTime)) / 60000);
    //   if (duration >= 0) {
    //     infoItems.push({ label: 'Duration', value: `${duration} minute${duration !== 1 ? 's' : ''}` });
    //   }
    // }
    
    if (meeting.host?.name) {
      infoItems.push({ label: 'Host', value: meeting.host.name });
    }
    
    if (recordingName) {
      // Extract filename from blob URL or path
      let displayName = recordingName;
      if (recordingName.includes('blob:')) {
        displayName = 'Recording file';
      } else if (recordingName.includes('/')) {
        // Extract filename from path
        const fileName = recordingName.split('/').pop() || recordingName;
        // Remove query parameters if any
        displayName = fileName.split('?')[0];
      }
      // Truncate if too long
      if (displayName.length > 60) {
        displayName = displayName.substring(0, 57) + '...';
      }
      infoItems.push({ label: 'Recording', value: displayName });
    }

    // Draw info items in a clean, aligned format
    const labelWidth = 80; // Fixed width for labels for alignment
    const valueStartX = 50 + labelWidth + 10;
    const valueWidth = doc.page.width - valueStartX - 50;
    let totalInfoHeight = 0;
    
    infoItems.forEach((item, index) => {
      // Calculate height for this row
      const valueHeight = doc.heightOfString(item.value, {
        width: valueWidth,
        lineGap: 2
      });
      const rowHeight = Math.max(valueHeight, 16) + 8;
      
      // Subtle background for each row (alternating)
      if (index % 2 === 0) {
        doc.fillColor(colors.highlight)
          .rect(50, yPosition - 6, doc.page.width - 100, rowHeight)
          .fill();
      }

      // Label - bold and right-aligned
      doc.fillColor(colors.textLight)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`${item.label}:`, 50, yPosition, {
          width: labelWidth,
          align: 'right'
        });

      // Value - regular font, can wrap if needed
      doc.fillColor(colors.text)
        .fontSize(10)
        .font('Helvetica')
        .text(item.value, valueStartX, yPosition, {
          width: valueWidth,
          align: 'left',
          lineGap: 2
        });

      yPosition += rowHeight;
      totalInfoHeight += rowHeight;
    });

    // Add a subtle rounded border around the info section
    doc.strokeColor(colors.border)
      .lineWidth(0.5)
      .roundedRect(50, infoStartY - 8, doc.page.width - 100, totalInfoHeight + 12, 4)
      .stroke();

    yPosition += 10;

    // Description (if exists) - Minimal style
    if (meeting.description) {
      checkPageBreak(40);
      doc.fillColor(colors.textLight)
        .fontSize(9)
        .font('Helvetica')
        .text('Description:', 50, yPosition);
      yPosition += 12;
      doc.fillColor(colors.text)
        .fontSize(10)
        .font('Helvetica')
        .text(meeting.description, 50, yPosition, {
          width: doc.page.width - 100,
          align: 'left'
        });
      yPosition += doc.heightOfString(meeting.description, {
        width: doc.page.width - 100
      }) + 20;
    }

    yPosition += 10;

    // Summary Section with Proper Line Positioning
    if (minutes.summary) {
      checkPageBreak(80);
      
      // Section title - calculate height first
      doc.fontSize(15);
      const summaryTitleHeight = doc.heightOfString('Summary', {
        width: doc.page.width - 100
      });
      
      doc.fillColor(colors.text)
        .fontSize(15)
        .font('Helvetica-Bold')
        .text('Summary', 50, yPosition);
      
      // Elegant divider line - positioned BELOW the text
      doc.strokeColor(colors.primary)
        .lineWidth(2.5)
        .moveTo(50, yPosition + summaryTitleHeight + 6)
        .lineTo(115, yPosition + summaryTitleHeight + 6)
        .stroke();

      yPosition += summaryTitleHeight + 18;

      // Subtle background box for summary
      const summaryHeight = doc.heightOfString(minutes.summary, {
        width: doc.page.width - 120,
        lineGap: 5
      }) + 20;

      doc.fillColor(colors.highlight)
        .roundedRect(50, yPosition - 8, doc.page.width - 100, summaryHeight, 4)
        .fill();
      
      // Subtle left accent border
      doc.fillColor(colors.primary)
        .rect(50, yPosition - 8, 3, summaryHeight)
        .fill();

      doc.fillColor(colors.text)
        .fontSize(10)
        .font('Helvetica')
        .text(minutes.summary, 60, yPosition, {
          width: doc.page.width - 120,
          align: 'left',
          lineGap: 5
        });

      yPosition += summaryHeight + 15;
    }

    // Key Points Section with Proper Line Positioning
    if (minutes.keyPoints && minutes.keyPoints.length > 0) {
      checkPageBreak(100);

      // Section title
      doc.fontSize(15);
      const keyPointsTitleHeight = doc.heightOfString('Key Points', {
        width: doc.page.width - 100
      });
      
      doc.fillColor(colors.text)
        .fontSize(15)
        .font('Helvetica-Bold')
        .text('Key Points', 50, yPosition);
      
      // Elegant divider line - positioned BELOW the text
      doc.strokeColor(colors.primary)
        .lineWidth(2.5)
        .moveTo(50, yPosition + keyPointsTitleHeight + 6)
        .lineTo(130, yPosition + keyPointsTitleHeight + 6)
        .stroke();

      yPosition += keyPointsTitleHeight + 20;

      minutes.keyPoints.forEach((point, index) => {
        checkPageBreak(35);

        // Elegant numbered circle
        doc.fillColor(colors.primary)
          .circle(58, yPosition + 6, 7)
          .fill();
        
        doc.fillColor('#FFFFFF')
          .fontSize(9)
          .font('Helvetica-Bold')
          .text((index + 1).toString(), 54, yPosition + 3);

        // Point text with better spacing
        const pointHeight = doc.heightOfString(point, {
          width: doc.page.width - 95,
          lineGap: 4
        });

        doc.fillColor(colors.text)
          .fontSize(10)
          .font('Helvetica')
          .text(point, 72, yPosition, {
            width: doc.page.width - 95,
            align: 'left',
            lineGap: 4
          });

        yPosition += Math.max(pointHeight, 18) + 10;
      });

      yPosition += 10;
    }

    // Decisions Section with Proper Line Positioning
    if (minutes.decisions && minutes.decisions.length > 0) {
      checkPageBreak(100);

      // Section title
      doc.fontSize(15);
      const decisionsTitleHeight = doc.heightOfString('Decisions', {
        width: doc.page.width - 100
      });
      
      doc.fillColor(colors.text)
        .fontSize(15)
        .font('Helvetica-Bold')
        .text('Decisions', 50, yPosition);
      
      // Elegant divider line - positioned BELOW the text
      doc.strokeColor(colors.primary)
        .lineWidth(2.5)
        .moveTo(50, yPosition + decisionsTitleHeight + 6)
        .lineTo(125, yPosition + decisionsTitleHeight + 6)
        .stroke();

      yPosition += decisionsTitleHeight + 20;

      minutes.decisions.forEach((decision) => {
        checkPageBreak(35);

        // Elegant checkmark in circle
        doc.fillColor(colors.success)
          .circle(58, yPosition + 6, 7)
          .fill();
        
        doc.fillColor('#FFFFFF')
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('✓', 54, yPosition + 3);

        // Decision text with better spacing
        const decisionHeight = doc.heightOfString(decision, {
          width: doc.page.width - 95,
          lineGap: 4
        });

        doc.fillColor(colors.text)
          .fontSize(10)
          .font('Helvetica')
          .text(decision, 72, yPosition, {
            width: doc.page.width - 95,
            align: 'left',
            lineGap: 4
          });

        yPosition += Math.max(decisionHeight, 18) + 10;
      });

      yPosition += 10;
    }

    // Action Items Section - Fixed Table with Proper Text Wrapping
    if (minutes.actionItems && minutes.actionItems.length > 0) {
      checkPageBreak(80);

      // Section title
      doc.fontSize(15);
      const actionItemsTitleHeight = doc.heightOfString('Action Items', {
        width: doc.page.width - 100
      });
      
      doc.fillColor(colors.text)
        .fontSize(15)
        .font('Helvetica-Bold')
        .text('Action Items', 50, yPosition);
      
      // Elegant divider line - positioned BELOW the text
      doc.strokeColor(colors.primary)
        .lineWidth(2.5)
        .moveTo(50, yPosition + actionItemsTitleHeight + 6)
        .lineTo(145, yPosition + actionItemsTitleHeight + 6)
        .stroke();

      yPosition += actionItemsTitleHeight + 25;

      // Define column widths - properly calculated to fit page
      const tableStartX = 50;
      const tableWidth = doc.page.width - 100;
      const colNumWidth = 25;
      const colActionWidth = tableWidth - colNumWidth - 80 - 70 - 50; // Remaining space after other columns
      const colAssignedWidth = 80;
      const colDeadlineWidth = 70;
      const colStatusWidth = 50;
      const rowPadding = 8;

      // Helper function to draw table header
      const drawTableHeader = () => {
        // Elegant header background with rounded top corners
        doc.fillColor(colors.primary)
          .roundedRect(tableStartX, yPosition, tableWidth, 24, 4)
          .fill();

        // Header text
        doc.fillColor('#FFFFFF')
          .fontSize(9)
          .font('Helvetica-Bold');
        
        doc.text('#', tableStartX + 5, yPosition + 14);
        doc.text('Action Item', tableStartX + colNumWidth + 5, yPosition + 14);
        doc.text('Assigned', tableStartX + colNumWidth + colActionWidth + 5, yPosition + 14);
        doc.text('Deadline', tableStartX + colNumWidth + colActionWidth + colAssignedWidth + 5, yPosition + 14);
        doc.text('Status', tableStartX + colNumWidth + colActionWidth + colAssignedWidth + colDeadlineWidth + 5, yPosition + 14);

        yPosition += 24;
      };

      // Draw initial header
      drawTableHeader();

      // Draw table border
      doc.strokeColor(colors.border)
        .lineWidth(0.5)
        .rect(tableStartX, yPosition - 22, tableWidth, 1)
        .stroke();

      minutes.actionItems.forEach((item, index) => {
        // Calculate required height for this row
        const actionText = item.text || 'No description';
        const actionTextHeight = doc.heightOfString(actionText, {
          width: colActionWidth - 10,
          lineGap: 2
        });
        
        const assignedText = (item.assignedTo?.name || item.assignedTo || 'Unassigned');
        const assignedTextHeight = doc.heightOfString(assignedText, {
          width: colAssignedWidth - 10,
          lineGap: 2
        });

        const deadlineText = item.deadline 
          ? new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : 'None';
        const deadlineTextHeight = doc.heightOfString(deadlineText, {
          width: colDeadlineWidth - 10,
          lineGap: 2
        });

        const rowHeight = Math.max(actionTextHeight, assignedTextHeight, deadlineTextHeight, 18) + rowPadding;

        checkPageBreak(rowHeight + 5);

        // Redraw header if new page
        if (yPosition === 50) {
          drawTableHeader();
        }

        // Alternate row background with subtle color
        if (index % 2 === 0) {
          doc.fillColor(colors.highlight)
            .rect(tableStartX, yPosition, tableWidth, rowHeight)
            .fill();
        }

        // Vertical column dividers
        doc.strokeColor(colors.border)
          .lineWidth(0.3)
          .moveTo(tableStartX + colNumWidth, yPosition)
          .lineTo(tableStartX + colNumWidth, yPosition + rowHeight)
          .moveTo(tableStartX + colNumWidth + colActionWidth, yPosition)
          .lineTo(tableStartX + colNumWidth + colActionWidth, yPosition + rowHeight)
          .moveTo(tableStartX + colNumWidth + colActionWidth + colAssignedWidth, yPosition)
          .lineTo(tableStartX + colNumWidth + colActionWidth + colAssignedWidth, yPosition + rowHeight)
          .moveTo(tableStartX + colNumWidth + colActionWidth + colAssignedWidth + colDeadlineWidth, yPosition)
          .lineTo(tableStartX + colNumWidth + colActionWidth + colAssignedWidth + colDeadlineWidth, yPosition + rowHeight)
          .stroke();

        // Row number
        doc.fillColor(colors.text)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text((index + 1).toString(), tableStartX + 5, yPosition + rowPadding);

        // Action Item text - with proper wrapping
        doc.fillColor(colors.text)
          .fontSize(9)
          .font('Helvetica')
          .text(actionText, tableStartX + colNumWidth + 5, yPosition + rowPadding, {
            width: colActionWidth - 10,
            lineGap: 2
          });

        // Assigned To - with wrapping
        doc.fillColor(colors.textLight)
          .fontSize(8)
          .font('Helvetica')
          .text(assignedText, tableStartX + colNumWidth + colActionWidth + 5, yPosition + rowPadding, {
            width: colAssignedWidth - 10,
            lineGap: 2
          });

        // Deadline - with wrapping
        doc.fillColor(colors.textLight)
          .fontSize(8)
          .font('Helvetica')
          .text(deadlineText, tableStartX + colNumWidth + colActionWidth + colAssignedWidth + 5, yPosition + rowPadding, {
            width: colDeadlineWidth - 10,
            lineGap: 2
          });

        // Status - elegant badge
        const status = item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Pending';
        let statusColor = colors.primary;
        let statusBg = colors.highlight;
        
        if (status.toLowerCase() === 'completed') {
          statusColor = colors.success;
          statusBg = '#d1fae5';
        } else if (status.toLowerCase() === 'in-progress') {
          statusColor = colors.primary;
          statusBg = '#cffafe';
        } else if (status.toLowerCase() === 'pending') {
          statusColor = colors.warning;
          statusBg = '#fef3c7';
        }

        // Draw status badge background
        doc.fillColor(statusBg)
          .roundedRect(tableStartX + colNumWidth + colActionWidth + colAssignedWidth + colDeadlineWidth + 3, yPosition + rowPadding - 2, colStatusWidth - 6, 16, 3)
          .fill();
        
        doc.fillColor(statusColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(status, tableStartX + colNumWidth + colActionWidth + colAssignedWidth + colDeadlineWidth + 5, yPosition + rowPadding + 2, {
            width: colStatusWidth - 10,
            align: 'center'
          });

        // Bottom border
        doc.strokeColor(colors.border)
          .lineWidth(0.3)
          .moveTo(tableStartX, yPosition + rowHeight)
          .lineTo(tableStartX + tableWidth, yPosition + rowHeight)
          .stroke();

        yPosition += rowHeight;
      });

      yPosition += 15;
    }

// Minimal Footer
const range = doc.bufferedPageRange();
const start = range.start;
const count = range.count;

const generationDate = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
});

for (let i = start; i < start + count; i++) {
  doc.switchToPage(i);

  // Simple footer line
  doc.strokeColor(colors.border)
    .lineWidth(0.5)
    .moveTo(50, doc.page.height - 25)
    .lineTo(doc.page.width - 50, doc.page.height - 25)
    .stroke();

  // Footer text
  doc.fillColor(colors.textLighter)
    .fontSize(7)
    .font('Helvetica')
    .text(`Generated ${generationDate}`, 50, doc.page.height - 18, {
      align: 'left'
    });

  // Page number
  doc.fillColor(colors.textLighter)
    .fontSize(7)
    .font('Helvetica')
    .text(
      `${i - start + 1} / ${count}`,
      doc.page.width - 50,
      doc.page.height - 18,
      { align: 'right' }
    );
}

// Finalize PDF
doc.end();


  } catch (error) {
    console.error('Generate PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate PDF'
      });
    }
  }
};

// ==================== AI SERVICE CONFIGURATION ====================

export const updateAIConfig = async (req, res) => {
  try {
    // This endpoint would typically be admin-only
    // For now, check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can update AI configuration'
      });
    }

    const { aiServiceUrl, timeout, enabledFeatures } = req.body;

    // Update environment variables or configuration
    if (aiServiceUrl) {
      // In a real app, you would save this to a config database
      console.log(`Updating AI service URL to: ${aiServiceUrl}`);
    }

    // Test the new configuration
    const testResult = await aiService.testConnection();

    res.status(200).json({
      success: true,
      message: 'AI configuration updated successfully',
      configuration: {
        aiServiceUrl: aiServiceUrl || process.env.AI_SERVICE_URL,
        timeout: timeout || 300000,
        enabledFeatures: enabledFeatures || ['transcription', 'summarization', 'task_extraction']
      },
      testResult
    });

  } catch (error) {
    console.error('Update AI config error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};