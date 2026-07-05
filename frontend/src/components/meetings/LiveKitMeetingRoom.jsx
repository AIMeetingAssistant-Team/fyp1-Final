import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LiveKitRoomShell, { DisconnectReason, MediaDeviceFailure } from './LiveKitRoomShell';
import MeetingRoomRecorderBridge from './MeetingRoomRecorderBridge';
import LiveKitRoomSyncBridge from './LiveKitRoomSyncBridge';
import LiveKitTranscriptionSession from './LiveKitTranscriptionSession';
import { apiRequest } from '../../utils/api';
import { ROOM_MSG, ROOM_MSG_COPY } from '../../utils/livekitRoomMessages';
import { isMeetingHost } from '../../utils/meetingUser';
import { uploadMeetingRecording } from '../../utils/uploadMeetingRecording';
import {
  Users, X, Clock, LogOut, CheckCircle2, XCircle, ArrowLeft, Video, Circle,
} from 'lucide-react';
import '../../assets/style/LiveKitMeeting.css';

function MeetingTimer({ startedAt }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const tick = () => setSeconds(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return <span>{`${h}:${m}:${s}`}</span>;
}

const MEETING_BLOCKED = {
  cancelled: {
    title: 'Meeting cancelled',
    description: 'This session was cancelled and the video room is no longer available.',
    badge: 'Cancelled',
    hint: 'Check meeting details for updates or schedule a new session.',
  },
  completed: {
    title: 'Meeting ended',
    description: 'This video session has finished. The room is closed and cannot be rejoined.',
    badge: 'Ended',
    hint: 'View recordings, transcript, and minutes from the meeting details page.',
  },
};

function MeetingBlockedScreen({ reason, meetingInfo, onBack, onAllMeetings }) {
  const config = MEETING_BLOCKED[reason];
  const Icon = reason === 'cancelled' ? XCircle : CheckCircle2;

  return (
    <div className="vm-blocked-page">
      <div className="vm-blocked-card">
        <div className={`vm-blocked-icon ${reason === 'cancelled' ? 'is-cancelled' : 'is-ended'}`}>
          <Icon size={36} strokeWidth={1.5} aria-hidden />
        </div>

        <span className={`vm-blocked-badge ${reason === 'cancelled' ? 'is-cancelled' : 'is-ended'}`}>
          {config.badge}
        </span>

        <h1 className="vm-blocked-title">{config.title}</h1>
        <p className="vm-blocked-desc">{config.description}</p>

        {meetingInfo?.title && (
          <div className="vm-blocked-meeting">
            <Video size={18} strokeWidth={1.75} aria-hidden />
            <div className="vm-blocked-meeting-text">
              <span className="vm-blocked-meeting-label">Meeting</span>
              <span className="vm-blocked-meeting-title">{meetingInfo.title}</span>
            </div>
          </div>
        )}

        <p className="vm-blocked-hint">{config.hint}</p>

        <div className="vm-blocked-actions">
          <button type="button" className="vm-blocked-btn vm-blocked-btn--primary" onClick={onBack}>
            <ArrowLeft size={18} strokeWidth={2} aria-hidden />
            Meeting details
          </button>
          <button type="button" className="vm-blocked-btn vm-blocked-btn--secondary" onClick={onAllMeetings}>
            All meetings
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LiveKitMeetingRoom({ meetingId }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [wsUrl, setWsUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [meetingInfo, setMeetingInfo] = useState(null);
  const [recordingActive, setRecordingActive] = useState(false);
  const [recordingLoading, setRecordingLoading] = useState(false);
  const [mediaWarning, setMediaWarning] = useState(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [videoLayout, setVideoLayout] = useState('grid');
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [meetingStartedAt] = useState(() => Date.now());
  const [uploadingRecording, setUploadingRecording] = useState(false);
  /** Visible to all participants when host is recording */
  const [recordingNotice, setRecordingNotice] = useState(false);
  const [roomAlert, setRoomAlert] = useState(null);
  /** 'completed' | 'cancelled' when the meeting must not be joined */
  const [blockedReason, setBlockedReason] = useState(null);

  const hasConnectedRef = useRef(false);
  const leavingRef = useRef(false);
  const meetingEndedRef = useRef(false);
  const recordingActiveRef = useRef(false);
  const recorderBridgeRef = useRef({ stopAndFinalize: async () => null });
  const roomBroadcastRef = useRef({ publish: async () => {} });


  useEffect(() => {
    recordingActiveRef.current = recordingActive;
  }, [recordingActive]);

  useEffect(() => {
    if (!roomAlert || roomAlert.variant === 'ended') return undefined;
    const id = setTimeout(() => setRoomAlert(null), 8000);
    return () => clearTimeout(id);
  }, [roomAlert]);

  const getAuthToken = () => localStorage.getItem('token');

  useEffect(() => {
    if (!meetingId) return undefined;
    let cancelled = false;

    const init = async () => {
      try {
        setLoading(true);
        setError(null);
        setBlockedReason(null);
        const authToken = getAuthToken();
        if (!authToken) throw new Error('Please login first');

        const data = await apiRequest(`/meetings/${meetingId}`, 'GET', null, authToken);
        if (cancelled) return;
        if (!data.success) throw new Error(data.message);

        const meeting = data.meeting;
        setMeetingInfo(meeting);

        if (meeting.status === 'cancelled' || meeting.status === 'completed') {
          setBlockedReason(meeting.status);
          return;
        }

        let host = isMeetingHost(meeting);
        if (meeting.liveKit?.recordingActive) {
          setRecordingActive(host);
          setRecordingNotice(true);
        }

        if (host) {
          await apiRequest(`/livekit/meetings/${meetingId}/start`, 'POST', {}, authToken);
          if (cancelled) return;
        }

        const tokenData = await apiRequest(
          `/livekit/meetings/${meetingId}/token`,
          'POST',
          { role: host ? 'host' : 'participant' },
          authToken,
        );
        if (cancelled) return;
        if (!tokenData.success) throw new Error(tokenData.message || 'Failed to get LiveKit token');
        if (!tokenData.token || !tokenData.wsUrl) throw new Error('LiveKit token response was incomplete');

        if (tokenData.role === 'host') host = true;
        setIsHost(host);
        setToken(tokenData.token);
        setWsUrl(tokenData.wsUrl);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to join meeting');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, [meetingId]);

  const cleanupMeetingInBackground = useCallback(() => {
    const authToken = getAuthToken();
    if (!authToken || !recordingActiveRef.current) return;
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` };
    const base = (import.meta.env.VITE_BASE_URL || 'http://localhost:5000/api').trim().replace(/\/$/, '');
    fetch(`${base}/livekit/meetings/${meetingId}/recording/stop`, {
      method: 'POST',
      headers,
      keepalive: true,
    }).catch(() => {});
  }, [meetingId]);

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const exitMeetingRoom = useCallback((notice) => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    cleanupMeetingInBackground();
    navigateRef.current(`/meetings/${meetingId}`, {
      replace: true,
      state: notice ? { meetingNotice: notice } : undefined,
    });
  }, [meetingId, cleanupMeetingInBackground]);

  const handleRoomMessage = useCallback((msg) => {
    if (msg.type === ROOM_MSG.RECORDING_STARTED) {
      setRecordingNotice(true);
      setRoomAlert({ text: ROOM_MSG_COPY[ROOM_MSG.RECORDING_STARTED], variant: 'recording' });
      return;
    }
    if (msg.type === ROOM_MSG.RECORDING_STOPPED) {
      setRecordingNotice(false);
      setRoomAlert({ text: ROOM_MSG_COPY[ROOM_MSG.RECORDING_STOPPED], variant: 'info' });
      return;
    }
    if (msg.type === ROOM_MSG.MEETING_ENDED) {
      meetingEndedRef.current = true;
      setRecordingNotice(false);
      setRoomAlert({ text: ROOM_MSG_COPY[ROOM_MSG.MEETING_ENDED], variant: 'ended' });
      setTimeout(() => exitMeetingRoom(ROOM_MSG_COPY[ROOM_MSG.MEETING_ENDED]), 2000);
    }
  }, [exitMeetingRoom]);

  const handleRoomDisconnected = useCallback((reason) => {
    if (leavingRef.current) return;

    if (meetingEndedRef.current) {
      exitMeetingRoom(ROOM_MSG_COPY[ROOM_MSG.MEETING_ENDED]);
      return;
    }

    const failures = [
      DisconnectReason.DUPLICATE_IDENTITY,
      DisconnectReason.JOIN_FAILURE,
      DisconnectReason.CONNECTION_TIMEOUT,
    ];
    if (!hasConnectedRef.current || failures.includes(reason)) {
      setError('Could not connect to the room. Please refresh and try again.');
      return;
    }

    if (reason === DisconnectReason.SERVER_SHUTDOWN || hasConnectedRef.current) {
      exitMeetingRoom('The meeting has ended. You have left the video room.');
      return;
    }

    exitMeetingRoom();
  }, [exitMeetingRoom]);

  const handleLiveKitError = useCallback((err) => {
    const msg = (err?.message || '').toLowerCase();
    if (/permission|device|notfound|notallowed|media|already connected/.test(msg)) return;
    setError(err.message || 'Connection failed');
  }, []);

  const handleMediaDeviceFailure = useCallback((failure) => {
    const messages = {
      [MediaDeviceFailure.PermissionDenied]: 'Allow camera and microphone in browser settings.',
      [MediaDeviceFailure.NotFound]: 'No camera or microphone found.',
      [MediaDeviceFailure.DeviceInUse]: 'Camera or mic is in use by another app.',
    };
    setMediaWarning(messages[failure] || 'Check your media devices.');
  }, []);

  const handleConnected = useCallback(() => {
    hasConnectedRef.current = true;
  }, []);

  const finalizeRecordingAndUpload = useCallback(async () => {
    const finalBlob = await recorderBridgeRef.current.stopAndFinalize();
    if (!finalBlob || finalBlob.size === 0) {
      setMediaWarning('Recording ended, but no media was captured.');
      return;
    }

    setUploadingRecording(true);
    try {
      await uploadMeetingRecording(meetingId, finalBlob);
      setMediaWarning('Recording saved successfully. AI processing started automatically.');
    } catch (uploadError) {
      setMediaWarning(uploadError.message || 'Recording stopped, but upload failed.');
    } finally {
      setUploadingRecording(false);
    }
  }, [meetingId]);

  const stopRecordingAndPersistIfNeeded = useCallback(async () => {
    if (!isHost || !recordingActiveRef.current) return;
    try {
      await apiRequest(`/livekit/meetings/${meetingId}/recording/stop`, 'POST', {}, getAuthToken());
    } catch {
      // best-effort to stop recording server state before upload
    }
    setRecordingActive(false);
    await finalizeRecordingAndUpload();
  }, [isHost, meetingId, finalizeRecordingAndUpload]);

  const handleLeave = useCallback(() => {
    leavingRef.current = true;
    (async () => {
      await stopRecordingAndPersistIfNeeded();
      cleanupMeetingInBackground();
      navigate(`/meetings/${meetingId}`, { replace: true });
    })();
  }, [meetingId, cleanupMeetingInBackground, navigate, stopRecordingAndPersistIfNeeded]);

  const handleEndMeeting = useCallback(async () => {
    if (!window.confirm('End meeting for everyone?')) return;
    leavingRef.current = true;
    meetingEndedRef.current = true;
    setRoomAlert({ text: ROOM_MSG_COPY[ROOM_MSG.MEETING_ENDED], variant: 'ended' });

    await stopRecordingAndPersistIfNeeded();

    try {
      await roomBroadcastRef.current.publish({ type: ROOM_MSG.MEETING_ENDED });
      await new Promise((r) => { setTimeout(r, 400); });
      await apiRequest(`/livekit/meetings/${meetingId}/end`, 'POST', {}, getAuthToken());
    } catch { /* noop */ }

    cleanupMeetingInBackground();
    navigate(`/meetings/${meetingId}`, {
      replace: true,
      state: { meetingNotice: ROOM_MSG_COPY[ROOM_MSG.MEETING_ENDED] },
    });
  }, [meetingId, cleanupMeetingInBackground, navigate, stopRecordingAndPersistIfNeeded]);

  const toggleRecording = useCallback(async () => {
    if (!isHost) {
      setMediaWarning('Only the host can record.');
      return;
    }
    setRecordingLoading(true);
    try {
      if (recordingActive) {
        await apiRequest(`/livekit/meetings/${meetingId}/recording/stop`, 'POST', {}, getAuthToken());
        setRecordingActive(false);
        setRecordingNotice(false);
        setRoomAlert({ text: ROOM_MSG_COPY[ROOM_MSG.RECORDING_STOPPED], variant: 'info' });
        await finalizeRecordingAndUpload();
      } else {
        await apiRequest(`/livekit/meetings/${meetingId}/recording/start`, 'POST', {}, getAuthToken());
        setRecordingActive(true);
        setRecordingNotice(true);
        setRoomAlert({ text: ROOM_MSG_COPY[ROOM_MSG.RECORDING_STARTED], variant: 'recording' });
      }
    } catch (err) {
      setMediaWarning(err.message || 'Recording failed');
    } finally {
      setRecordingLoading(false);
    }
  }, [isHost, recordingActive, meetingId, finalizeRecordingAndUpload]);

  const meetingControls = {
    isHost,
    recordingActive,
    recordingLoading: recordingLoading || uploadingRecording,
    onToggleRecording: toggleRecording,
    layoutMode: videoLayout,
    onLayoutModeChange: setVideoLayout,
    transcriptActive: transcriptOpen,
    onToggleTranscript: () => setTranscriptOpen((v) => !v),
  };

  if (loading) {
    return (
      <div className="vm-screen">
        <div className="vm-spinner" />
        <p>Joining meeting…</p>
      </div>
    );
  }

  if (blockedReason) {
    return (
      <MeetingBlockedScreen
        reason={blockedReason}
        meetingInfo={meetingInfo}
        onBack={() => navigate(`/meetings/${meetingId}`, { replace: true })}
        onAllMeetings={() => navigate('/meetings', { replace: true })}
      />
    );
  }

  if (error || !token || !wsUrl) {
    return (
      <div className="vm-screen">
        <p className="vm-error-msg">{error || 'Unable to connect'}</p>
        <button type="button" className="vm-btn" onClick={() => window.location.reload()}>Retry</button>
        <button type="button" className="vm-btn vm-btn-ghost" onClick={() => navigate(`/meetings/${meetingId}`)}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="vm-app" data-meeting-recording-app>
      <header className="vm-top-header">
        <div className="vm-top-left">
          <span className="vm-live-dot" />
          <h1 className="vm-meeting-title">{meetingInfo?.title || 'Video Meeting'}</h1>
          {recordingNotice && <span className="vm-rec-tag">REC</span>}
        </div>

        <div className="vm-top-center">
          <span className="vm-participants">
            <Users size={16} />
            <strong>{participantCount}</strong>
            <span>participant{participantCount !== 1 ? 's' : ''}</span>
          </span>
          <span className="vm-timer">
            <Clock size={16} />
            <MeetingTimer startedAt={meetingStartedAt} />
          </span>
        </div>

        <div className="vm-top-right">
          {isHost && (
            <button type="button" className="vm-end-btn" onClick={handleEndMeeting}>
              End meeting
            </button>
          )}
          <button type="button" className="vm-leave-btn" onClick={handleLeave}>
            <LogOut size={16} />
            Leave
          </button>
        </div>
      </header>

      {recordingNotice && (
        <div className="vm-room-banner vm-room-banner--recording" role="status">
          <Circle size={10} className="vm-rec-pulse" fill="currentColor" aria-hidden />
          <span>This meeting is being recorded</span>
        </div>
      )}

      {roomAlert && (
        <div className={`vm-room-banner vm-room-banner--${roomAlert.variant}`} role="alert">
          <span>{roomAlert.text}</span>
          {roomAlert.variant !== 'ended' && (
            <button type="button" onClick={() => setRoomAlert(null)} aria-label="Dismiss">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {mediaWarning && (
        <div className="vm-toast">
          <span>{mediaWarning}</span>
          <button type="button" onClick={() => setMediaWarning(null)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      <LiveKitRoomShell
        token={token}
        serverUrl={wsUrl}
        layoutMode={videoLayout}
        onLayoutModeChange={setVideoLayout}
        meetingControls={meetingControls}
        onConnected={handleConnected}
        onDisconnected={handleRoomDisconnected}
        onError={handleLiveKitError}
        onMediaDeviceFailure={handleMediaDeviceFailure}
        onParticipantCountChange={setParticipantCount}
      >
        <LiveKitRoomSyncBridge
          isHost={isHost}
          recordingActive={recordingActive}
          onRoomMessage={handleRoomMessage}
          onReady={(api) => { roomBroadcastRef.current = api; }}
        />
        <MeetingRoomRecorderBridge
          isHost={isHost}
          recordingActive={recordingActive}
          onReady={(bridge) => { recorderBridgeRef.current = bridge; }}
          onRecordingError={setMediaWarning}
        />
        <LiveKitTranscriptionSession
          meetingId={meetingId}
          open={transcriptOpen}
          onClose={() => setTranscriptOpen(false)}
        />
      </LiveKitRoomShell>
    </div>
  );
}
