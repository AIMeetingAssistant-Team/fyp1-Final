import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages, Mic, Download } from 'lucide-react';

const LANGUAGE_LABELS = {
  en: 'English',
  ur: 'Urdu',
  'en-ur': 'English + Urdu',
  auto: 'Auto-detect',
};

export default function LiveTranscriptPanel({
  entries = [],
  activeLanguage = 'auto',
  isTranscribing = false,
  onLanguageChange,
  onExport,
  className = '',
  variant = 'default',
}) {
  const scrollRef = useRef(null);
  const isMeeting = variant === 'meeting';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const toolbar = (
    <div className={isMeeting ? 'meeting-transcript-toolbar' : 'flex items-center justify-between px-4 py-3 border-b border-slate-800'}>
      <div className="flex items-center gap-2">
        <Mic className={`w-4 h-4 ${isTranscribing ? 'text-emerald-400 animate-pulse' : isMeeting ? 'text-slate-400' : 'text-slate-400'}`} />
        {!isMeeting && <h3 className="text-sm font-semibold text-white">Live Transcript</h3>}
        {isMeeting && <span className="meeting-transcript-toolbar-label">Language</span>}
      </div>
      <div className="flex items-center gap-2">
        <Languages className="w-4 h-4 text-slate-400" />
        <select
          value={activeLanguage}
          onChange={(e) => onLanguageChange?.(e.target.value)}
          className={isMeeting ? 'meeting-transcript-select' : 'text-xs bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200'}
        >
          {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className={isMeeting ? 'meeting-transcript-export' : 'p-1.5 rounded hover:bg-slate-800 text-slate-300'}
            title="Export transcript"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  const list = (
    <div ref={scrollRef} className={isMeeting ? 'meeting-transcript-list' : 'flex-1 overflow-y-auto px-4 py-3 space-y-3'}>
      <AnimatePresence initial={false}>
        {entries.length === 0 ? (
          <p className={isMeeting ? 'meeting-transcript-empty' : 'text-sm text-slate-500 text-center mt-8'}>
            {isTranscribing ? 'Listening for speech...' : 'Start transcription to see live captions'}
          </p>
        ) : (
          entries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`transcript-item ${entry.isPartial ? 'partial' : ''}`}
            >
              <div className="transcript-meta">
                <span className="speaker">{entry.speaker}</span>
                <div className="flex items-center gap-2">
                  <span className="time">{LANGUAGE_LABELS[entry.language] || entry.language}</span>
                  <span className="time">{Math.round((entry.confidence || 0) * 100)}%</span>
                </div>
              </div>
              <p className="transcript-text">{entry.text}</p>
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );

  if (isMeeting) {
    return (
      <div className={`live-transcript-panel meeting-variant ${className}`}>
        {toolbar}
        {list}
      </div>
    );
  }

  return (
    <div className={`live-transcript-panel flex flex-col h-full bg-slate-950/95 border-l border-slate-800 ${className}`}>
      {toolbar}
      {list}
    </div>
  );
}
