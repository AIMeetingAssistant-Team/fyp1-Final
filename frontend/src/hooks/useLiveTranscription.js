import { useCallback, useEffect, useRef, useState } from 'react';
import {
  acquireTranscriptionSocket,
  releaseTranscriptionSocket,
} from '../utils/transcriptionSocket';

const PCM_CAPTURE_WORKLET_URL = '/worklets/pcmCaptureProcessor.js';

/**
 * Live transcript over Socket.IO (Whisper chunks) — does not replace post-recording AI transcription.
 */
export function useLiveTranscription({ meetingId, enabled = false, language = 'en-ur' }) {
  const [entries, setEntries] = useState([]);
  const [latestCaption, setLatestCaption] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState(null);
  const [activeLanguage, setActiveLanguage] = useState(language);

  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioProcessorRef = useRef(null);
  const streamRef = useRef(null);
  const activeRef = useRef(false);
  const enabledRef = useRef(enabled);
  const activeLanguageRef = useRef(language);
  const meetingIdRef = useRef(meetingId);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    setActiveLanguage(language);
    activeLanguageRef.current = language;
  }, [language]);

  useEffect(() => {
    meetingIdRef.current = meetingId;
  }, [meetingId]);

  useEffect(() => {
    if (!meetingId) return undefined;

    const socket = acquireTranscriptionSocket(meetingId);
    if (!socket) {
      setError('Sign in required for live transcript.');
      return undefined;
    }
    socketRef.current = socket;

    const onStarted = () => {
      setIsTranscribing(true);
    };

    const onPartial = (data) => {
      if (String(data.meetingId) !== String(meetingIdRef.current)) return;

      const fullText = data.fullText?.trim();
      const chunkText = data?.text?.trim();
      const displayText = fullText || chunkText;
      if (!displayText) return;

      setLatestCaption(displayText);

      setEntries([{
        id: 'live-transcript',
        text: displayText,
        isPartial: data.isPartial === true,
        timestamp: data.timestamp || new Date().toISOString(),
      }]);
    };

    const onStopped = () => {
      setIsTranscribing(false);
      setEntries((prev) => prev.map((e) => (e.isPartial ? { ...e, isPartial: false } : e)));
    };

    const onError = (payload) => {
      setError(payload?.message || 'Transcription error');
      setIsTranscribing(false);
    };

    const onConnectError = (err) => {
      setError(err?.message || 'Could not connect to transcription server. Is the backend running on port 5000?');
      setIsTranscribing(false);
    };

    socket.on('transcription:started', onStarted);
    socket.on('transcription:partial', onPartial);
    socket.on('transcription:stopped', onStopped);
    socket.on('error', onError);
    socket.on('connect_error', onConnectError);

    return () => {
      if (activeRef.current) {
        socket.emit('transcription:stop', { meetingId: String(meetingIdRef.current) });
      }
      socket.off('transcription:started', onStarted);
      socket.off('transcription:partial', onPartial);
      socket.off('transcription:stopped', onStopped);
      socket.off('error', onError);
      socket.off('connect_error', onConnectError);
      releaseTranscriptionSocket();
      socketRef.current = null;
    };
  }, [meetingId]);

  const teardownAudio = useCallback(() => {
    activeRef.current = false;
    if (audioProcessorRef.current?.node) {
      try {
        audioProcessorRef.current.node.port.onmessage = null;
        audioProcessorRef.current.node.disconnect();
      } catch { /* noop */ }
    }
    audioProcessorRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => { });
      audioContextRef.current = null;
    }
  }, []);

  const setupAudioStreaming = useCallback(async (stream) => {
    if (!stream || !socketRef.current?.connected) return;

    teardownAudio();
    streamRef.current = stream;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = audioContext;
    const sampleRate = audioContext.sampleRate;

    socketRef.current.emit('transcription:audio-config', {
      meetingId: String(meetingId),
      sampleRate,
      channels: 1,
    });

    await audioContext.audioWorklet.addModule(PCM_CAPTURE_WORKLET_URL);

    const source = audioContext.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(audioContext, 'pcm-capture-processor');

    workletNode.port.onmessage = (event) => {
      if (!activeRef.current || !socketRef.current?.connected) return;
      socketRef.current.emit('transcription:audio-chunk', {
        meetingId: String(meetingId),
        audioData: event.data,      // raw ArrayBuffer — no Array.from() needed
        sampleRate,
        isFinal: false,
      });
    };

    source.connect(workletNode);
    const gain = audioContext.createGain();
    gain.gain.value = 0;
    workletNode.connect(gain);
    gain.connect(audioContext.destination);
    audioProcessorRef.current = { node: workletNode };
    activeRef.current = true;
  }, [meetingId, teardownAudio]);

  const start = useCallback(async (mediaStream) => {
    setError(null);
    if (!socketRef.current?.connected) {
      setError('Not connected to server. Try again in a moment.');
      return false;
    }

    let stream = mediaStream;
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setError('Microphone access is required for live transcript.');
        return false;
      }
    }

    socketRef.current.emit('transcription:start', {
      meetingId: String(meetingId),
      language: activeLanguageRef.current,
    });
    await setupAudioStreaming(stream);
    setIsTranscribing(true);
    return true;
  }, [meetingId, setupAudioStreaming]);

  const stop = useCallback(() => {
    teardownAudio();
    if (socketRef.current?.connected) {
      socketRef.current.emit('transcription:stop', { meetingId: String(meetingId) });
    }
    setIsTranscribing(false);
    setLatestCaption('');
  }, [meetingId, teardownAudio]);

  const toggle = useCallback(async (mediaStream) => {
    if (isTranscribing || activeRef.current) {
      stop();
      return false;
    }
    return start(mediaStream);
  }, [isTranscribing, start, stop]);

  const clear = useCallback(() => {
    setEntries([]);
    setLatestCaption('');
  }, []);

  return {
    entries,
    latestCaption,
    isTranscribing,
    error,
    activeLanguage,
    setActiveLanguage,
    start,
    stop,
    toggle,
    clear,
    setupAudioStreaming,
  };
}
