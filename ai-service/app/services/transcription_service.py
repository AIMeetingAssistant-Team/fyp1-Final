# FFmpeg path setup (Whisper uses it for decoding WebM/MP4/etc.)
import logging
import os
import platform
import shutil
import subprocess
import tempfile
from typing import Any, Dict, Optional

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
        # "base" is fast but inaccurate; "medium" is a good default; "large-v3" is best on GPU
        self.model_name = os.getenv("WHISPER_MODEL", "medium").strip() or "medium"
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info("Whisper device=%s model=%s", self.device, self.model_name)

    def load_model(self):
        if self.model is None:
            try:
                logger.info("Loading Whisper model: %s", self.model_name)
                self.model = whisper.load_model(self.model_name, device=self.device)
                logger.info("Whisper model loaded successfully")
            except Exception as e:
                logger.error("Failed to load Whisper model: %s", e)
                raise

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
