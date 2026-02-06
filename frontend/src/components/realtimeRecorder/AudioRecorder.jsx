import { useRef, useState, useEffect } from "react";
import { Mic, Square, Pause, Play, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { io } from "socket.io-client";

export default function AudioRecorder({
  meeting,
  meetingId,
  recordings,
  setRecordings,
  onFinish,
  setMessage
}) {
  const recorderRef = useRef(null);
  const audioChunks = useRef([]);
  const audioStreamRef = useRef(null);
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioProcessorRef = useRef(null);
  const transcriptionActiveRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [realTimeTranscriptionStarted, setRealTimeTranscriptionStarted] = useState(false);
  const timerRef = useRef(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize socket connection for real-time transcription
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !meetingId) return;

    const socket = io(import.meta.env.VITE_BASE_URL?.replace('/api', '') || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected for real-time transcription');
      socket.emit('join-room', { meetingId });
    });

    socket.on('transcription:started', (data) => {
      console.log('🎙️ Real-time transcription started');
      setIsTranscribing(true);
    });

    socket.on('transcription:partial', (data) => {
      if (data.meetingId === meetingId && data.text && data.text !== '[Processing audio...]' && data.text !== '[Analyzing audio...]') {
        setTranscriptionText(prev => {
          const newText = data.text.trim();
          // Avoid duplicate text
          if (prev && prev.includes(newText)) {
            return prev;
          }
          return prev ? prev + ' ' + newText : newText;
        });
      }
    });

    socket.on('transcription:stopped', (data) => {
      console.log('🛑 Real-time transcription stopped');
      setIsTranscribing(false);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      setMessage({ type: "error", text: error.message || "Transcription error occurred" });
    });

    return () => {
      socket.disconnect();
    };
  }, [meetingId, setMessage]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRecording, isPaused]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      recorderRef.current = new MediaRecorder(stream);
      audioChunks.current = [];

      recorderRef.current.ondataavailable = e => audioChunks.current.push(e.data);
      recorderRef.current.onstop = uploadAudio;

      recorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      setIsPaused(false);
      setTranscriptionText("");
      setRealTimeTranscriptionStarted(false);
    } catch (error) {
      setMessage({ type: "error", text: "Microphone access denied" });
    }
  };

  const startRealTimeTranscription = async () => {
    if (!socketRef.current || !socketRef.current.connected) {
      setMessage({ type: "error", text: "Connection not established. Please try again." });
      return;
    }

    try {
      // Start transcription on server
      socketRef.current.emit('transcription:start', { meetingId });
      setRealTimeTranscriptionStarted(true);
      transcriptionActiveRef.current = true;
      
      // Setup audio streaming for real-time transcription
      if (!audioStreamRef.current) {
        audioStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      
      if (audioStreamRef.current) {
        await setupAudioStreaming(audioStreamRef.current);
      }
    } catch (error) {
      console.error('Failed to start real-time transcription:', error);
      setMessage({ type: "error", text: "Failed to start real-time transcription" });
    }
  };

  const setupAudioStreaming = async (stream) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const sampleRate = audioContext.sampleRate;
      console.log(`🎵 Audio context sample rate: ${sampleRate}Hz`);
      
      // Send sample rate info to server
      if (socketRef.current?.connected) {
        socketRef.current.emit('transcription:audio-config', {
          meetingId,
          sampleRate: sampleRate,
          channels: 1
        });
      }
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      let chunkCount = 0;
      processor.onaudioprocess = (e) => {
        if (transcriptionActiveRef.current && socketRef.current?.connected) {
          const inputData = e.inputBuffer.getChannelData(0);
          // Convert Float32Array to Int16Array for transmission
          const int16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            int16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }
          
          chunkCount++;
          // Send audio chunk to server
          socketRef.current.emit('transcription:audio-chunk', {
            meetingId,
            audioData: Array.from(int16Data),
            sampleRate: sampleRate,
            isFinal: false
          });
        }
      };
      
      source.connect(processor);
      // Create a dummy destination to complete the audio graph without causing feedback
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0; // Mute to prevent feedback
      processor.connect(gainNode);
      gainNode.connect(audioContext.destination);
      audioProcessorRef.current = { processor, activeRef: transcriptionActiveRef };
      
      console.log('✅ Audio streaming setup complete');
    } catch (error) {
      console.error('Failed to setup audio streaming:', error);
    }
  };

  const stopRealTimeTranscription = () => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('transcription:stop', { meetingId });
      setRealTimeTranscriptionStarted(false);
      transcriptionActiveRef.current = false;
    }
    
    // Cleanup audio processing
    if (audioProcessorRef.current) {
      if (audioProcessorRef.current.processor) {
        audioProcessorRef.current.processor.disconnect();
        if (audioProcessorRef.current.activeRef) {
          audioProcessorRef.current.activeRef.current = false;
        }
      }
      audioProcessorRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const pauseRecording = () => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (recorderRef.current && isRecording && isPaused) {
      recorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && isRecording) {
      // Stop real-time transcription if it was started
      if (realTimeTranscriptionStarted) {
        stopRealTimeTranscription();
      }
      
      recorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      clearInterval(timerRef.current);
      
      // Stop all tracks
      recorderRef.current.stream?.getTracks().forEach(track => track.stop());
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Cleanup audio processing
      if (audioProcessorRef.current) {
        if (audioProcessorRef.current.processor) {
          audioProcessorRef.current.processor.disconnect();
          if (audioProcessorRef.current.activeRef) {
            audioProcessorRef.current.activeRef.current = false;
          }
        }
        audioProcessorRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      // Show uploading state
      setIsUploading(true);
    }
  };

  const uploadAudio = async () => {
    const blob = new Blob(audioChunks.current, { type: "audio/mp3" });
    const formData = new FormData();
    formData.append("recording", blob);
    formData.append("meetingId", meetingId);

    try {
      // Create a progress event handler
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      };
      
      xhr.onload = async () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          
          if (data.success) {
            setRecordings(prev => [...prev, data.recording]);
            setMessage({ type: "success", text: "Recording saved successfully!" });
            
            // Scenario 2: If real-time transcription was NOT started, trigger transcription after save
            if (!realTimeTranscriptionStarted) {
              try {
                const token = localStorage.getItem("token");
                const transcriptionResponse = await fetch(
                  `${import.meta.env.VITE_BASE_URL}/ai/meetings/${meetingId}/transcribe/0`,
                  {
                    method: "POST",
                    headers: {
                      "Authorization": `Bearer ${token}`,
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                      language: "en",
                      generateMinutes: true,
                      extractTasks: false
                    })
                  }
                );
                
                if (transcriptionResponse.ok) {
                  console.log("✅ Transcription started after recording save");
                } else {
                  console.error("Transcription request failed:", transcriptionResponse.status);
                }
              } catch (error) {
                console.error("Failed to start transcription after save:", error);
              }
            }
            
            // Wait a moment to show the success message
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Trigger the finish callback which will navigate away
            onFinish();
          } else {
            setMessage({ type: "error", text: "Failed to save recording" });
            setIsUploading(false);
          }
        } else {
          setMessage({ type: "error", text: "Upload failed. Please try again." });
          setIsUploading(false);
        }
      };
      
      xhr.onerror = () => {
        setMessage({ type: "error", text: "Network error. Please check your connection." });
        setIsUploading(false);
      };
      
      xhr.open("POST", `${import.meta.env.VITE_BASE_URL}/recordings/${meetingId}/upload`);
      xhr.setRequestHeader("Authorization", `Bearer ${localStorage.getItem("token")}`);
      xhr.send(formData);
      
    } catch (error) {
      setMessage({ type: "error", text: "Upload failed. Please try again." });
      setIsUploading(false);
    }
  };

  // If we're uploading, show the upload progress
  if (isUploading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 lg:p-8">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-50 flex items-center justify-center">
            {uploadProgress < 100 ? (
              <svg className="w-8 h-8 text-cyan-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {uploadProgress < 100 ? 'Uploading Recording' : 'Recording Saved!'}
          </h3>
          
          <p className="text-gray-600 mb-6">
            {uploadProgress < 100 
              ? 'Please wait while your recording is being uploaded...' 
              : 'Your recording has been successfully saved!'}
          </p>
          
          {/* Progress Bar */}
          <div className="max-w-md mx-auto mb-6">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>Upload Progress</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-cyan-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
          
          {uploadProgress < 100 ? (
            <p className="text-sm text-gray-400">
              This may take a few moments depending on the recording length
            </p>
          ) : (
            <p className="text-sm text-gray-400">
              Redirecting to meeting details...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Start Recording</h2>
        <p className="text-gray-400 text-sm sm:text-base">Record audio for this meeting session</p>
      </div>

      {/* Timer Display */}
      <div className="flex justify-center mb-6 sm:mb-8">
        <div className="bg-gray-50 rounded-xl p-4 sm:p-6 border border-gray-200 w-full max-w-xs">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-2">Recording Time</p>
            <div className="text-3xl sm:text-4xl font-bold text-gray-900 font-mono">
              {formatTime(recordingTime)}
            </div>
            <div className="flex items-center justify-center gap-1 mt-2">
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />
              <p className="text-xs text-gray-400">
                {isRecording ? (isPaused ? 'Paused' : 'Recording...') : 'Ready to record'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="flex flex-col items-center gap-4 sm:gap-6">
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          {!isRecording ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startRecording}
              className="p-4 sm:p-5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-600 rounded-full shadow-sm transition-all duration-200 group"
            >
              <Mic className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </motion.button>
          ) : (
            <>
              {isPaused ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resumeRecording}
                  className="p-4 sm:p-5 bg-cyan-600 hover:bg-cyan-700 rounded-full shadow-sm transition-all duration-200"
                >
                  <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={pauseRecording}
                  className="p-4 sm:p-5 bg-yellow-500 hover:bg-yellow-600 rounded-full shadow-sm transition-all duration-200"
                >
                  <Pause className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </motion.button>
              )}
              {!realTimeTranscriptionStarted && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startRealTimeTranscription}
                  className="p-4 sm:p-5 bg-purple-500 hover:bg-purple-600 rounded-full shadow-sm transition-all duration-200"
                  title="Start real-time transcription"
                >
                  <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={stopRecording}
                className="p-4 sm:p-5 bg-red-500 hover:bg-red-600 rounded-full shadow-sm transition-all duration-200"
              >
                <Square className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </motion.button>
            </>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-400 mb-1">
            {isRecording 
              ? (isPaused ? 'Recording paused. Click resume to continue.' : 'Click stop to save recording')
              : 'Click microphone to start recording'
            }
          </p>
          <p className="text-xs text-gray-400">
            {realTimeTranscriptionStarted 
              ? 'Real-time transcription is active' 
              : 'Click transcribe button for live transcription, or it will start after saving'
            }
          </p>
        </div>
      </div>

      {/* Real-time Transcription Display */}
      {realTimeTranscriptionStarted && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <p className="text-sm font-medium text-gray-700">Live Transcription</p>
          </div>
          {transcriptionText ? (
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{transcriptionText}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">Listening and processing audio... Transcription will appear here shortly.</p>
          )}
        </div>
      )}

      {/* Status Bar */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <span className="text-gray-400 me-1">Status:</span>
            <span className={`font-medium ${isRecording ? 'text-cyan-600' : 'text-gray-400'}`}>
              {isRecording ? (isPaused ? 'Paused' : 'Recording Active') : 'Ready'}
            </span>
          </div>
          {realTimeTranscriptionStarted && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-purple-600 font-medium">Transcribing...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}