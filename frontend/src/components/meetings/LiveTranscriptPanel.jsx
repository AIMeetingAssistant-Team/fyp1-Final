import { useEffect, useMemo, useRef } from 'react';
import { Download } from 'lucide-react';

function mergeTranscriptEntries(entries) {
  let text = '';
  let partial = '';

  for (const entry of entries) {
    const chunk = entry?.text?.trim();
    if (!chunk) continue;

    if (entry.isPartial) {
      partial = chunk;
      continue;
    }

    if (!text) {
      text = chunk;
      continue;
    }
    if (chunk.startsWith(text)) {
      text = chunk;
      continue;
    }

    let overlap = 0;
    const max = Math.min(text.length, chunk.length);
    for (let i = max; i > 8; i -= 1) {
      if (text.slice(-i).toLowerCase() === chunk.slice(0, i).toLowerCase()) {
        overlap = i;
        break;
      }
    }
    text = overlap ? text + chunk.slice(overlap) : `${text} ${chunk}`;
  }

  return { text, partial };
}

export default function LiveTranscriptPanel({
  entries = [],
  isTranscribing = false,
  onExport,
  className = '',
  variant = 'default',
}) {
  const scrollRef = useRef(null);
  const isMeeting = variant === 'meeting';

  const { text, partial } = useMemo(() => mergeTranscriptEntries(entries), [entries]);
  const hasContent = Boolean(text || partial);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text, partial]);

  const handleExport = () => {
    if (onExport) {
      onExport();
      return;
    }
    const body = [text, partial].filter(Boolean).join(' ').trim();
    if (!body) return;
    const blob = new Blob([body], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'live-transcript.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`live-transcript-panel ${isMeeting ? 'meeting-variant' : 'recorder-variant'} ${className}`}>
      <div className="live-transcript-head">
        <div className="live-transcript-head-left">
          <span className="live-transcript-title">Transcript</span>
          {isTranscribing && (
            <span className="live-transcript-status">
              <span className="live-transcript-pulse" aria-hidden />
              Listening
            </span>
          )}
        </div>
        {hasContent && (
          <button
            type="button"
            onClick={handleExport}
            className="live-transcript-export-btn"
            title="Download transcript"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="live-transcript-body">
        {!hasContent ? (
          <p className="live-transcript-placeholder">
            {isTranscribing ? 'Speech will appear here as it is recognized…' : 'Start transcription to see live text'}
          </p>
        ) : (
          <p className="live-transcript-paragraph">
            {text}
            {partial && (
              <span className="live-transcript-partial">{text ? ` ${partial}` : partial}</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
