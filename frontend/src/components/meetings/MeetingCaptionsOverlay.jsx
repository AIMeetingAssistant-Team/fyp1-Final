import { AnimatePresence, motion } from 'framer-motion';

/**
 * Google Meet–style bottom captions over video / recorder.
 */
export default function MeetingCaptionsOverlay({
  visible = false,
  text = '',
  speaker = '',
  isListening = false,
}) {
  if (!visible) return null;

  const showText = text?.trim();
  const showListening = isListening && !showText;

  return (
    <div className="vm-captions-overlay" aria-live="polite" aria-atomic="true">
      <AnimatePresence mode="wait">
        {(showText || showListening) && (
          <motion.div
            key={showText || 'listening'}
            className="vm-captions-bubble"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
          >
            {showText ? (
              <>
                {speaker ? <span className="vm-captions-speaker">{speaker}</span> : null}
                <p className="vm-captions-text">{text}</p>
              </>
            ) : (
              <p className="vm-captions-text vm-captions-text--muted">Listening…</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
