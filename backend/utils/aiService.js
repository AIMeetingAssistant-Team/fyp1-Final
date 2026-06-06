import axios from 'axios';

class AIService {
  constructor() {
    this.baseURL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    this.baseTimeout = parseInt(process.env.AI_SERVICE_TIMEOUT) || 900000; // 15 minutes base timeout
    // Timeout will be calculated dynamically based on file size
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.baseTimeout,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`🤖 AI Service configured: ${this.baseURL}`);
  }

  /**
   * Enhanced health check with detailed diagnostics
   */
  async healthCheck() {
    try {
      console.log('🩺 Performing AI Service health check...');
      
      const response = await this.client.get('/api/v1/health', {
        timeout: 10000
      });
      
      const healthData = response.data;
      
      return {
        success: true,
        status: 'healthy',
        service: 'AI Meeting Assistant',
        version: healthData.version || 'unknown',
        uptime: healthData.uptime || 0,
        models: healthData.models || [],
        timestamp: new Date().toISOString(),
        responseTime: response.headers['x-response-time'] || 'unknown'
      };
      
    } catch (error) {
      console.error('❌ AI Service health check failed:', error.message);
      
      return {
        success: false,
        status: 'unhealthy',
        error: error.message,
        code: error.code,
        responseStatus: error.response?.status,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Enhanced transcription with progress tracking
   */
  async transcribeAudio(fileBuffer, filename, language = null, progressCallback = null) {
    try {
      console.log(`🎙️ Transcribing audio: ${filename} (${fileBuffer.length} bytes)`);
      
      if (progressCallback) progressCallback(0, 'Starting transcription...');
      
      // Calculate dynamic timeout based on file size
      // Base timeout: 10 minutes, +2.5 minutes per 10MB (more generous for large files)
      // For very large files (100MB+), allow up to 60 minutes
      const fileSizeMB = fileBuffer.length / (1024 * 1024);
      const baseTimeout = 10 * 60 * 1000; // 10 minutes base
      const sizeBasedTimeout = Math.ceil(fileSizeMB / 10) * 2.5 * 60 * 1000; // 2.5 minutes per 10MB
      const dynamicTimeout = baseTimeout + sizeBasedTimeout;
      // Cap at 60 minutes for extremely large files
      const finalTimeout = Math.min(dynamicTimeout, 60 * 60 * 1000);
      
      console.log(`⏱️ Calculated timeout: ${Math.round(finalTimeout / 1000 / 60)} minutes for ${Math.round(fileSizeMB * 10) / 10}MB file`);
      
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: this.getMimeType(filename) });
      formData.append('file', blob, filename);
      
      // Send language hint to AI service (en-ur = English+Urdu bilingual mode)
      if (language) {
        formData.append('language', String(language));
      }
      
      const response = await axios.post(
        `${this.baseURL}/api/v1/transcription/transcribe-file`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: finalTimeout,
          onUploadProgress: (progressEvent) => {
            if (progressCallback) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              progressCallback(percent, 'Uploading file...');
            }
          },
          onDownloadProgress: (progressEvent) => {
            if (progressCallback && progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              progressCallback(percent, 'Processing transcription...');
            }
          }
        }
      );
      
      if (progressCallback) progressCallback(100, 'Transcription complete');
      
      console.log(`✅ Transcription successful: ${response.data.text?.length || 0} characters`);
      
      return {
        success: true,
        text: response.data.text || '',
        segments: response.data.segments || [],
        language: response.data.language || 'en',
        confidence: response.data.confidence || 0.9,
        duration: response.data.duration || 0,
        word_count: response.data.text?.split(/\s+/).length || 0,
        processing_time: response.data.processing_time || 0
      };
      
    } catch (error) {
      console.error('❌ Transcription failed:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: 'AI Service is not running',
          code: 'SERVICE_UNAVAILABLE',
          suggestion: 'Start the AI service with: python app.py'
        };
      }
      
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
        response: error.response?.data
      };
    }
  }

  /**
   * Real-time chunk transcription (lower latency, optimized for streaming)
   */
  async transcribeStreamChunk(fileBuffer, filename, language = 'auto') {
    try {
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: this.getMimeType(filename) });
      formData.append('file', blob, filename);
      if (language && language !== 'auto') {
        formData.append('language', language);
      }
      formData.append('detect_language', language === 'auto' ? 'true' : 'false');

      const response = await axios.post(
        `${this.baseURL}/api/v1/transcription/transcribe-chunk`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000,
        }
      );

      return {
        success: true,
        text: response.data.text || '',
        segments: response.data.segments || [],
        language: response.data.language || 'en',
        confidence: response.data.confidence || 0.85,
        isPartial: response.data.is_partial ?? true,
      };
    } catch (error) {
      console.error('Stream chunk transcription failed:', error.message);
      return {
        success: false,
        error: error.message,
        text: '',
      };
    }
  }

  /**
   * Enhanced minutes generation
   */
  async generateMinutes(text, meetingType = 'general', options = {}) {
    try {
      console.log(`📝 Generating minutes for ${meetingType} meeting (${text.length} chars)`);
      
      // Use the correct endpoint: /generate-summary
      // FastAPI expects form data or JSON body, not query params
      const response = await this.client.post('/api/v1/summarization/generate-summary', {
        text: text.substring(0, 5000), // Limit to 5000 chars
        meeting_type: meetingType
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Minutes generation failed');
      }
      
      // Map the response to match expected format
      const minutesData = response.data.minutes || {};
      
      return {
        success: true,
        summary: response.data.summary || '',
        minutes: minutesData,
        key_points: minutesData.key_points || [],
        decisions: minutesData.decisions || [],
        action_items: minutesData.next_steps || [],
        processing_time: 0
      };
      
    } catch (error) {
      console.error('❌ Minutes generation failed:', error.message);
      return {
        success: false,
        error: error.message,
        fallback_summary: this.generateFallbackSummary(text)
      };
    }
  }

  /**
   * Enhanced task extraction with better context
   */
  async extractTasks(text, context = {}) {
    try {
      console.log(`📋 Extracting tasks from text (${text.length} chars)`);
      
      const response = await this.client.post('/api/v1/tasks/extract-from-text', {
        text: text.substring(0, 3000), // Limit to 3000 chars
        context: {
          meeting_id: context.meetingId,
          meeting_type: context.meetingType,
          participants: context.participants || [],
          date: context.date || new Date().toISOString(),
          host: context.host,
          priority_hint: context.priorityHint || 'medium'
        },
        options: {
          extract_assignees: true,
          extract_deadlines: true,
          extract_priorities: true,
          confidence_threshold: 0.6,
          max_tasks: 10
        }
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Task extraction failed');
      }
      
      return {
        success: true,
        tasks: response.data.tasks || [],
        grouped_tasks: response.data.grouped_tasks || {},
        total_tasks: response.data.total_tasks || 0,
        confidence: response.data.confidence || 0,
        processing_time: response.data.processing_time || 0
      };
      
    } catch (error) {
      console.error('❌ Task extraction failed:', error.message);
      return {
        success: false,
        error: error.message,
        tasks: this.extractTasksFallback(text)
      };
    }
  }

  /**
   * Complete AI pipeline with progress tracking
   */
  async processMeetingRecording(fileBuffer, filename, meetingType = 'general', context = {}, progressCallback = null) {
    try {
      console.log(`🚀 Starting complete AI pipeline for: ${filename}`);
      
      const steps = {
        transcription: { status: 'pending', progress: 0 },
        summarization: { status: 'pending', progress: 0 },
        task_extraction: { status: 'pending', progress: 0 }
      };
      
      // Step 1: Transcribe
      if (progressCallback) progressCallback(0, 'Starting transcription...');
      steps.transcription.status = 'processing';
      
      const transcriptionResult = await this.transcribeAudio(
        fileBuffer, 
        filename, 
        context.language,
        (progress, message) => {
          if (progressCallback) {
            const overallProgress = Math.round(progress * 0.6); // Transcription is 60% of work
            progressCallback(overallProgress, message);
          }
        }
      );
      
      if (!transcriptionResult.success) {
        steps.transcription.status = 'failed';
        return {
          success: false,
          step: 'transcription',
          error: transcriptionResult.error,
          steps
        };
      }
      
      steps.transcription.status = 'completed';
      steps.transcription.progress = 100;
      if (progressCallback) progressCallback(60, 'Transcription complete, generating minutes...');
      
      // Step 2: Generate minutes
      steps.summarization.status = 'processing';
      
      const minutesResult = await this.generateMinutes(
        transcriptionResult.text,
        meetingType,
        context.summarizationOptions
      );
      
      if (!minutesResult.success) {
        steps.summarization.status = 'failed';
        return {
          success: false,
          step: 'summarization',
          error: minutesResult.error,
          transcription: transcriptionResult,
          steps
        };
      }
      
      steps.summarization.status = 'completed';
      steps.summarization.progress = 100;
      if (progressCallback) progressCallback(80, 'Minutes generated, extracting tasks...');
      
      // Step 3: Extract tasks
      steps.task_extraction.status = 'processing';
      
      const tasksResult = await this.extractTasks(
        minutesResult.summary || transcriptionResult.text,
        context
      );
      
      steps.task_extraction.status = 'completed';
      steps.task_extraction.progress = 100;
      if (progressCallback) progressCallback(100, 'AI processing complete!');
      
      return {
        success: true,
        steps,
        transcription: transcriptionResult,
        minutes: minutesResult.minutes,
        summary: minutesResult.summary,
        tasks: tasksResult.tasks || [],
        grouped_tasks: tasksResult.grouped_tasks || {},
        metadata: {
          processing_time: new Date().toISOString(),
          meeting_type: meetingType,
          transcription_length: transcriptionResult.text.length,
          tasks_extracted: tasksResult.total_tasks || 0,
          steps_completed: Object.values(steps).filter(s => s.status === 'completed').length
        }
      };
      
    } catch (error) {
      console.error('❌ AI pipeline failed:', error);
      return {
        success: false,
        error: error.message,
        step: 'pipeline'
      };
    }
  }

  /**
   * Batch process multiple recordings
   */
  async batchProcessRecordings(files, meetingType = 'general', context = {}) {
    try {
      console.log(`🔄 Batch processing ${files.length} recordings`);
      
      const results = [];
      const totalFiles = files.length;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Processing ${i + 1}/${totalFiles}: ${file.filename}`);
        
        try {
          const result = await this.processMeetingRecording(
            file.buffer,
            file.filename,
            meetingType,
            context
          );
          
          results.push({
            filename: file.filename,
            success: result.success,
            result: result.success ? {
              transcription_length: result.transcription?.text?.length || 0,
              tasks_extracted: result.metadata?.tasks_extracted || 0
            } : { error: result.error }
          });
          
        } catch (fileError) {
          results.push({
            filename: file.filename,
            success: false,
            error: fileError.message
          });
        }
      }
      
      return {
        success: true,
        total_files: totalFiles,
        processed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
      
    } catch (error) {
      console.error('❌ Batch processing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get MIME type from filename
   */
  getMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      m4a: 'audio/mp4',
      ogg: 'audio/ogg',
      flac: 'audio/flac',
      aac: 'audio/aac',
      webm: 'audio/webm',
      // Video
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
      webm: 'video/webm',
      // Other
      txt: 'text/plain',
      pdf: 'application/pdf'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Test AI service connection with detailed diagnostics
   */
  async testConnection() {
    try {
      const health = await this.healthCheck();
      
      if (!health.success) {
        return {
          success: false,
          message: 'AI Service is not responding',
          error: health.error,
          diagnostics: {
            base_url: this.baseURL,
            timeout: this.timeout,
            timestamp: new Date().toISOString()
          }
        };
      }
      
      // Test with sample text
      const testText = "We need to complete the project by Friday. John will prepare the presentation. Sarah will send the report to the client by Wednesday. The team agreed to meet again next Monday at 10 AM.";
      
      const tasksResult = await this.extractTasks(testText, {
        meetingType: 'project',
        participants: ['John', 'Sarah']
      });
      
      const transcriptionTest = "This is a test transcription to verify the service is working correctly.";
      const minutesResult = await this.generateMinutes(transcriptionTest, 'test');
      
      return {
        success: true,
        message: '✅ AI Service is working correctly!',
        health: health,
        capabilities: {
          transcription: true,
          summarization: minutesResult.success,
          task_extraction: tasksResult.success
        },
        test_results: {
          sample_tasks: tasksResult.tasks || [],
          sample_summary: minutesResult.summary || '',
          response_times: {
            health_check: 'OK',
            task_extraction: tasksResult.processing_time ? `${tasksResult.processing_time}ms` : 'N/A',
            summarization: minutesResult.processing_time ? `${minutesResult.processing_time}ms` : 'N/A'
          }
        },
        configuration: {
          base_url: this.baseURL,
          timeout: this.timeout,
          max_file_size: '2GB',
          supported_formats: ['mp3', 'wav', 'mp4', 'm4a', 'webm']
        }
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'AI Service test failed',
        error: error.message,
        diagnostics: {
          base_url: this.baseURL,
          timeout: this.timeout,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Fallback methods for when AI service is unavailable
   */
  generateFallbackSummary(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const summary = sentences.slice(0, 3).join('. ') + '.';
    return summary || 'Summary not available';
  }

  extractTasksFallback(text) {
    const taskPatterns = [
      /(?:need to|will|should|must)\s+([^.!?]+[.!?])/gi,
      /(?:action item|task|todo):?\s*(.+?)(?=\n|\.|$)/gi,
      /(?:assign(?:ed)? to|give to)\s+(\w+)\s+(.+?)(?=\n|\.|$)/gi
    ];
    
    const tasks = [];
    let taskId = 1;
    
    taskPatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match[1] && match[1].trim().length > 10) {
          tasks.push({
            id: `task_${taskId++}`,
            title: match[1].substring(0, 50),
            description: match[1],
            assignee: match[2] || null,
            priority: 'medium',
            status: 'pending',
            confidence: 0.5,
            source: 'fallback'
          });
        }
      });
    });
    
    return tasks.slice(0, 5); // Return max 5 tasks
  }
}

// Create singleton instance
const aiService = new AIService();
export default aiService;