import { useEffect, useRef } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { X } from 'lucide-react';
import LiveKitMicStreamBridge from './LiveKitMicStreamBridge';
import LiveTranscriptPanel from './LiveTranscriptPanel';
import MeetingCaptionsOverlay from './MeetingCaptionsOverlay';
import { useLiveTranscription } from '../../hooks/useLiveTranscription';

/**
 * In-room live transcript (Socket.IO + Whisper). Post-meeting AI pipeline is unchanged.
 */
export default function LiveKitTranscriptionSession({
  meetingId,
  open = false,
  onClose,
  showSidePanel = true,
  showOverlay = true,
}) {
  const startedRef = useRef(false);

  const {
    entries,
    latestCaption,
    isTranscribing,
    error,
    start,
    stop,
    setupAudioStreaming,
    clear,
  } = useLiveTranscription({ meetingId, enabled: false, language: 'en-ur' });

  useEffect(() => {
    if (!open) {
      startedRef.current = false;
      stop();
      clear();
    }
  }, [open, stop, clear]);

  const handleStream = async (stream) => {
    if (!open) return;
    if (!stream) return;

    if (!startedRef.current) {
      const ok = await start(stream);
      if (ok) startedRef.current = true;
      return;
    }
    await setupAudioStreaming(stream);
  };

  return (
    <>
      <LiveKitMicStreamBridge onStreamChange={open ? handleStream : () => {}} />

      {open && showOverlay && (
        <MeetingCaptionsOverlay
          visible
          text={latestCaption}
          isListening={isTranscribing}
        />
      )}

      {open && showSidePanel && (
        <aside className="vm-side-panel vm-transcript-side">
          <header className="vm-side-panel-head vm-transcript-side-head">
            <h2>Transcript</h2>
            <button
              type="button"
              className="vm-side-panel-close"
              onClick={onClose}
              aria-label="Close transcript"
            >
              <X size={18} />
            </button>
          </header>
          {error && (
            <p className="vm-transcript-error" role="alert">{error}</p>
          )}
          <LiveTranscriptPanel
            variant="meeting"
            entries={entries}
            isTranscribing={isTranscribing}
            onExport={() => {
              const text = entries[0]?.text || latestCaption || '';
              if (!text.trim()) return;
              const blob = new Blob([text], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `live-transcript-${meetingId}.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          />
        </aside>
      )}
    </>
  );
}
