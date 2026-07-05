# FFmpeg path setup (Whisper uses it for decoding WebM/MP4/etc.)
import logging
import os
import platform
import re
import shutil
import subprocess
import tempfile
import threading
import wave
from typing import Any, Dict, Optional, Union

import numpy as np
import torch
import whisper

logger = logging.getLogger(__name__)


def find_ffmpeg() -> Optional[str]:
    system = platform.system()
    if system == "Windows":
        paths = [
            r"C:\ffmpeg\bin\ffmpeg.exe",
            r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
            r"C:\tools\ffmpeg\bin\ffmpeg.exe",
        ]
        for path in paths:
            if os.path.exists(path):
                os.environ["PATH"] = os.path.dirname(path) + os.pathsep + os.environ.get("PATH", "")
                os.environ["FFMPEG_BINARY"] = path
                return path
    else:
        try:
            result = subprocess.run(["which", "ffmpeg"], capture_output=True, text=True, check=False)
            if result.returncode == 0:
                ffmpeg_path = result.stdout.strip()
                os.environ["FFMPEG_BINARY"] = ffmpeg_path
                return ffmpeg_path
        except OSError:
            pass

    ffmpeg_path = shutil.which("ffmpeg")
    if ffmpeg_path:
        os.environ["FFMPEG_BINARY"] = ffmpeg_path
        return ffmpeg_path

    logger.warning(
        "FFmpeg not found — install FFmpeg for reliable WebM/video transcription "
        "(https://ffmpeg.org/download.html)"
    )
    return None


_ffmpeg_path = find_ffmpeg()
if _ffmpeg_path:
    logger.info("FFmpeg found at: %s", _ffmpeg_path)


# English + Urdu code-switching — do not force a single Whisper language code
BILINGUAL_ALIASES = frozenset({
    "en-ur",
    "en_ur",
    "en+ur",
    "ur-en",
    "bilingual",
    "mixed",
    "english-urdu",
    "urdu-english",
    "en-urdu",
})

DEFAULT_EN_UR_PROMPT = (
    "Meeting conversation in English and Urdu. Speakers may mix both languages. "
    "Write English in Latin letters and Urdu in Urdu script where appropriate."
)

# Common Whisper hallucinations on silence / noise (especially tiny/base models).
LIVE_HALLUCINATION_RE = re.compile(
    r"^(?:"
    r"thank(?:s| you)(?: for watching)?|"
    r"thanks for listening|"
    r"see you next time|"
    r"bye\.?|"
    r"you\.?|"
    r"the\.?|"
    r"a\.?|"
    r"so\.?|"
    r"okay\.?|"
    r"um+\.?|"
    r"uh+\.?|"
    r"ah+\.?|"
    r"\.{2,}|"
    r"…+|"
    r"\[music\]|\[applause\]|\[silence\]|"
    r"music|"
    r"applause|"
    r"silence"
    r")\s*$",
    re.IGNORECASE,
)


def normalize_language(language: Optional[str]) -> Optional[str]:
    """Return Whisper language code, or None for auto-detect (incl. English+Urdu)."""
    if language is None:
        return None
    value = str(language).strip().lower()
    if value in ("", "auto", "detect", "null", "none", *BILINGUAL_ALIASES):
        return None
    return value


def resolve_initial_prompt(language: Optional[str]) -> Optional[str]:
    custom = os.getenv("WHISPER_INITIAL_PROMPT", "").strip()
    if custom:
        return custom

    value = (language or "").strip().lower()
    bilingual_default = os.getenv("WHISPER_BILINGUAL", "en-ur").strip().lower()
    use_bilingual = bilingual_default not in ("0", "false", "no", "off", "none")

    if not use_bilingual:
        return None

    if value in BILINGUAL_ALIASES or value in ("", "auto", "detect"):
        return DEFAULT_EN_UR_PROMPT

    return None


class TranscriptionService:
    def __init__(self):
        self.model = None
        self.live_model = None
        # Full post-session transcription (accuracy over speed)
        self.model_name = os.getenv("WHISPER_MODEL", "medium").strip() or "small"
        # Live: balance accuracy and speed on CPU.
        self.live_model_name = os.getenv("WHISPER_LIVE_MODEL", "base").strip() or "base"
        self.live_language = os.getenv("WHISPER_LIVE_LANGUAGE", "auto").strip().lower()
        self.live_no_speech_threshold = float(os.getenv("WHISPER_LIVE_NO_SPEECH_THRESHOLD", "0.75"))
        self.live_logprob_threshold = float(os.getenv("WHISPER_LIVE_LOGPROB_THRESHOLD", "-1.0"))
        self.live_min_rms = float(os.getenv("WHISPER_LIVE_MIN_RMS", "0.008"))
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._live_lock = threading.Lock()
        logger.info(
            "Whisper device=%s full_model=%s live_model=%s",
            self.device,
            self.model_name,
            self.live_model_name,
        )

    def load_model(self):
        if self.model is None:
            try:
                logger.info("Loading Whisper model: %s", self.model_name)
                self.model = whisper.load_model(self.model_name, device=self.device)
                logger.info("Whisper model loaded successfully")
            except Exception as e:
                logger.error("Failed to load Whisper model: %s", e)
                raise

    def load_live_model(self):
        if self.live_model_name == self.model_name and self.model is not None:
            self.live_model = self.model
            return
        if self.live_model is None:
            try:
                logger.info("Loading live Whisper model: %s", self.live_model_name)
                self.live_model = whisper.load_model(self.live_model_name, device=self.device)
                logger.info("Live Whisper model loaded successfully")
            except Exception as e:
                logger.error("Failed to load live Whisper model: %s", e)
                raise

    def _resolve_live_language(self, language: Optional[str]) -> Optional[str]:
        if self.live_language in ("", "auto", "detect", "none", "null"):
            return normalize_language(language)
        if self.live_language in BILINGUAL_ALIASES:
            return None
        return self.live_language

    def _load_16k_pcm_wav(self, path: str) -> Optional[np.ndarray]:
        """Read 16-bit PCM WAV without FFmpeg (live chunks from backend are already 16 kHz)."""
        try:
            with wave.open(path, "rb") as wf:
                if wf.getsampwidth() != 2:
                    return None
                channels = wf.getnchannels()
                sample_rate = wf.getframerate()
                frames = wf.readframes(wf.getnframes())

            audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
            if channels > 1:
                audio = audio.reshape(-1, channels).mean(axis=1)

            if sample_rate != 16000 and len(audio) > 0:
                target_len = max(1, int(len(audio) * 16000 / sample_rate))
                indices = np.linspace(0, len(audio) - 1, target_len)
                audio = np.interp(indices, np.arange(len(audio)), audio).astype(np.float32)

            return audio
        except Exception as exc:
            logger.debug("Fast WAV load failed (%s), falling back to FFmpeg", exc)
            return None

    def _audio_rms_array(self, audio: np.ndarray) -> float:
        if audio is None or len(audio) == 0:
            return 0.0
        return float(np.sqrt(np.mean(np.square(audio))))

    def _prepare_audio_for_whisper(self, input_path: str) -> tuple[str, Optional[str]]:
        """
        Convert any container (WebM, MP4, WAV, …) to 16 kHz mono PCM WAV.
        Returns (path_to_transcribe, temp_path_to_delete_or_None).
        """
        ffmpeg = os.environ.get("FFMPEG_BINARY") or shutil.which("ffmpeg")
        if not ffmpeg:
            return input_path, None

        fd, out_path = tempfile.mkstemp(suffix=".16k.wav")
        os.close(fd)

        try:
            subprocess.run(
                [
                    ffmpeg,
                    "-y",
                    "-i",
                    input_path,
                    "-vn",
                    "-ar",
                    "16000",
                    "-ac",
                    "1",
                    "-c:a",
                    "pcm_s16le",
                    out_path,
                ],
                check=True,
                capture_output=True,
                timeout=600,
            )
            logger.info("Audio preprocessed to 16 kHz mono WAV")
            return out_path, out_path
        except subprocess.CalledProcessError as e:
            stderr = (e.stderr or b"").decode(errors="replace")[:500]
            logger.warning("FFmpeg preprocess failed (%s), using original file", stderr)
            try:
                os.unlink(out_path)
            except OSError:
                pass
            return input_path, None

    def _audio_rms(self, audio_path: str) -> float:
        try:
            import numpy as np

            audio = whisper.load_audio(audio_path)
            if audio is None or len(audio) == 0:
                return 0.0
            return float(np.sqrt(np.mean(np.square(audio))))
        except Exception as exc:
            logger.debug("RMS check failed: %s", exc)
            return 0.0

    def _is_likely_hallucination(self, text: str) -> bool:
        cleaned = (text or "").strip()
        if not cleaned:
            return True
        if LIVE_HALLUCINATION_RE.match(cleaned):
            return True
        return False

    def _validate_live_segments(self, segments: list) -> bool:
        if not segments:
            return True
        for seg in segments:
            if seg.get("no_speech_prob", 0.0) > 0.8:
                return False
        return True

    def transcribe_audio_file(self, audio_path: str, language: Optional[str] = None) -> Dict[str, Any]:
        prepared_path = None
        try:
            self.load_model()

            audio_for_whisper, prepared_path = self._prepare_audio_for_whisper(audio_path)
            lang = normalize_language(language)

            transcribe_kwargs: Dict[str, Any] = {
                "fp16": self.device == "cuda",
                "verbose": False,
                "temperature": 0.0,
                "condition_on_previous_text": True,
                "compression_ratio_threshold": 2.4,
                "logprob_threshold": -1.0,
                "no_speech_threshold": 0.5,
            }
            prompt = resolve_initial_prompt(language)
            if prompt:
                transcribe_kwargs["initial_prompt"] = prompt

            if lang:
                transcribe_kwargs["language"] = lang
                logger.info("Transcribing with fixed language: %s", lang)
            elif language and str(language).strip().lower() in BILINGUAL_ALIASES:
                logger.info("Transcribing English + Urdu (auto-detect per segment)")
            else:
                logger.info("Transcribing with automatic language detection")

            result = self.model.transcribe(audio_for_whisper, **transcribe_kwargs)

            detected = result.get("language") or lang or "unknown"
            transcription = {
                "success": True,
                "text": result["text"].strip(),
                "segments": [
                    {
                        "id": seg["id"],
                        "start": seg["start"],
                        "end": seg["end"],
                        "text": seg["text"].strip(),
                    }
                    for seg in result.get("segments", [])
                ],
                "language": detected,
                "duration": result.get("duration", 0),
                "model": self.model_name,
            }

            logger.info(
                "Transcription completed: %s chars, language=%s",
                len(transcription["text"]),
                detected,
            )
            return transcription

        except Exception as e:
            logger.error("Transcription error: %s", e)
            return {
                "success": False,
                "error": str(e),
                "text": "",
                "segments": [],
            }
        finally:
            if prepared_path and os.path.exists(prepared_path):
                try:
                    os.unlink(prepared_path)
                except OSError:
                    pass

    def transcribe_live_chunk(
        self,
        audio_path: str,
        language: Optional[str] = None,
        previous_text: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Fast path for live captions — base model, context-aware, no FFmpeg."""
        prepared_path = None
        try:
            with self._live_lock:
                self.load_live_model()

                audio_input: Union[str, np.ndarray] = audio_path
                audio_array = self._load_16k_pcm_wav(audio_path)
                if audio_array is not None:
                    audio_input = audio_array
                    rms = self._audio_rms_array(audio_array)
                else:
                    audio_input, prepared_path = self._prepare_audio_for_whisper(audio_path)
                    rms = self._audio_rms(audio_input)

                if rms < self.live_min_rms:
                    return {
                        "success": True,
                        "text": "",
                        "segments": [],
                        "language": language or "unknown",
                        "model": self.live_model_name,
                        "skipped": "low_energy",
                    }

                lang = self._resolve_live_language(language)

                context = (previous_text or "").strip()
                transcribe_kwargs: Dict[str, Any] = {
                    "fp16": self.device == "cuda",
                    "verbose": False,
                    "temperature": 0.0,
                    "condition_on_previous_text": bool(context),
                    "without_timestamps": True,
                    "beam_size": 3,
                    "best_of": 1,
                    "compression_ratio_threshold": 2.4,
                    "logprob_threshold": self.live_logprob_threshold,
                    "no_speech_threshold": self.live_no_speech_threshold,
                }
                if lang:
                    transcribe_kwargs["language"] = lang
                if context:
                    transcribe_kwargs["initial_prompt"] = context[-224:]

                result = self.live_model.transcribe(audio_input, **transcribe_kwargs)
                segments = result.get("segments") or []
                text = (result.get("text") or "").strip()

                if not text or self._is_likely_hallucination(text):
                    logger.info("Live chunk skipped (empty/hallucination): %r", text[:80] if text else "")
                    return {
                        "success": True,
                        "text": "",
                        "segments": [],
                        "language": result.get("language") or lang or "unknown",
                        "model": self.live_model_name,
                        "skipped": "hallucination",
                    }

                if not self._validate_live_segments(segments):
                    logger.info("Live chunk skipped (no speech in segments)")
                    return {
                        "success": True,
                        "text": "",
                        "segments": [],
                        "language": result.get("language") or lang or "unknown",
                        "model": self.live_model_name,
                        "skipped": "low_confidence",
                    }

                detected = result.get("language") or lang or "unknown"
                avg_logprob = max(
                    (float(seg.get("avg_logprob", -0.5)) for seg in segments),
                    default=-0.5,
                )
                confidence = min(0.99, max(0.55, 1.0 + avg_logprob))
                logger.info("Live chunk OK (%d chars, confidence=%.2f): %r", len(text), confidence, text[:60])
                return {
                    "success": True,
                    "text": text,
                    "segments": [],
                    "language": detected,
                    "duration": result.get("duration", 0),
                    "model": self.live_model_name,
                    "confidence": confidence,
                }
        except Exception as e:
            logger.error("Live chunk transcription error: %s", e)
            return {
                "success": False,
                "error": str(e),
                "text": "",
                "segments": [],
            }
        finally:
            if prepared_path and os.path.exists(prepared_path):
                try:
                    os.unlink(prepared_path)
                except OSError:
                    pass

    def transcribe_audio_bytes(self, audio_bytes: bytes, file_format: str = "mp3") -> Dict[str, Any]:
        try:
            with tempfile.NamedTemporaryFile(suffix=f".{file_format}", delete=False) as tmp_file:
                tmp_file.write(audio_bytes)
                tmp_path = tmp_file.name

            result = self.transcribe_audio_file(tmp_path)
            os.unlink(tmp_path)
            return result

        except Exception as e:
            logger.error("Bytes transcription error: %s", e)
            return {
                "success": False,
                "error": str(e),
                "text": "",
                "segments": [],
            }


transcription_service = TranscriptionService()
