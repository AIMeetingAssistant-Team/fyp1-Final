/** Languages that map to Whisper auto-detect + bilingual prompt (see ai-service). */
export const BILINGUAL_LANGUAGE_ALIASES = new Set([
  'en-ur',
  'en_ur',
  'en+ur',
  'ur-en',
  'bilingual',
  'mixed',
  'english-urdu',
  'urdu-english',
]);

/**
 * Language sent to the AI service.
 * Use `en-ur` (default) for English + Urdu code-switching.
 * Use `en` or `ur` only if you speak a single language throughout.
 */
export function getTranscriptionLanguage(override) {
  if (override != null && String(override).trim() !== '') {
    return String(override).trim().toLowerCase();
  }
  return (
    process.env.TRANSCRIPTION_LANGUAGE
    || process.env.DEFAULT_TRANSCRIPTION_LANGUAGE
    || 'en-ur'
  ).trim().toLowerCase();
}
