import { useEffect, useRef } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { X } from 'lucide-react';
import LiveKitMicStreamBridge from './LiveKitMicStreamBridge';
import LiveTranscriptPanel from './LiveTranscriptPanel';
import MeetingCaptionsOverlay from './MeetingCaptionsOverlay';
import { useLiveTranscription } from '../../hooks/useLiveTranscription';

/**
 * In-room live captions (Socket.IO). Post-meeting AI pipeline is unchanged.
 */
export default function LiveKitTranscriptionSession({
  meetingId,
  open = false,
  onClose,
  showSidePanel = true,
  showOverlay = true,
}) {
  const { localParticipant } = useLocalParticipant();
  const speakerName = localParticipant?.name || localParticipant?.identity || 'You';
  const startedRef = useRef(false);

  const {
    entries,
    latestCaption,
    isTranscribing,
    error,
    activeLanguage,
    setActiveLanguage,
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

  const latestEntry = entries[entries.length - 1];
  const overlaySpeaker = latestEntry?.speaker && latestEntry.speaker !== 'You'
    ? latestEntry.speaker
    : speakerName;

  return (
    <>
      <LiveKitMicStreamBridge onStreamChange={open ? handleStream : () => {}} />

      {open && showOverlay && (
        <MeetingCaptionsOverlay
          visible
          text={latestCaption}
          speaker={overlaySpeaker}
          isListening={isTranscribing}
        />
      )}

      {open && showSidePanel && (
        <aside className="vm-side-panel vm-transcript-side">
          <header className="vm-side-panel-head">
            <div>
              <h2>Live captions</h2>
              <p>
                Real-time only — full AI transcript runs after recording upload.
                {isTranscribing && <span className="vm-cap-on">On</span>}
              </p>
            </div>
            <button
              type="button"
              className="vm-side-panel-close"
              onClick={onClose}
              aria-label="Close captions"
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
            activeLanguage={activeLanguage}
            isTranscribing={isTranscribing}
            onLanguageChange={setActiveLanguage}
            onExport={() => {
              const text = entries.map((e) => `${e.speaker}: ${e.text}`).join('\n');
              const blob = new Blob([text], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `live-captions-${meetingId}.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          />
        </aside>
      )}
    </>
  );
}
