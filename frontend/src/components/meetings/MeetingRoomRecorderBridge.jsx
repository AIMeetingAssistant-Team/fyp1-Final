import { useCallback, useEffect, useRef } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent, Track } from 'livekit-client';

/** Full meeting chrome (header, banners, video, chat, controls). */
const APP_ROOT_SELECTORS = ['[data-meeting-recording-app]', '.vm-app'];
/** Video + chat panel (fallback when tab share is unavailable). */
const VIEW_ROOT_SELECTORS = ['[data-meeting-recording-view]', '.vm-room-stage'];
const STAGE_ROOT_SELECTORS = ['[data-meeting-recording-stage]', '.vm-lk-inner', '.vm-video-area'];

const CAPTURE_FPS = 24;
const MAX_CANVAS_WIDTH = 1920;
const MAX_CANVAS_HEIGHT = 1080;
const WARMUP_MS = 800;
const STAGE_BG = '#0a0d12';

function getSupportedMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

function findRoot(selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.getBoundingClientRect().width > 40) return el;
  }
  return null;
}

function canvasSizeForElement(el) {
  const rect = el.getBoundingClientRect();
  const w = Math.max(320, Math.round(rect.width));
  const h = Math.max(240, Math.round(rect.height));
  const scale = Math.min(MAX_CANVAS_WIDTH / w, MAX_CANVAS_HEIGHT / h, 1);
  return {
    width: Math.round(w * scale),
    height: Math.round(h * scale),
  };
}

function mapRectToCanvas(rect, rootRect, canvas) {
  return {
    x: ((rect.left - rootRect.left) / rootRect.width) * canvas.width,
    y: ((rect.top - rootRect.top) / rootRect.height) * canvas.height,
    w: (rect.width / rootRect.width) * canvas.width,
    h: (rect.height / rootRect.height) * canvas.height,
  };
}

function drawPlaceholder(ctx, x, y, w, h, name) {
  const grd = ctx.createLinearGradient(x, y, x + w, y + h);
  grd.addColorStop(0, '#1c2433');
  grd.addColorStop(1, '#10151d');
  ctx.fillStyle = grd;
  ctx.fillRect(x, y, w, h);

  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#c5d0de';
  ctx.font = `600 ${Math.max(20, Math.floor(h * 0.12))}px system-ui, sans-serif`;
  ctx.fillText(initials || '?', x + w / 2, y + h / 2 - 8);
  ctx.fillStyle = '#8b9cb3';
  ctx.font = `400 ${Math.max(12, Math.floor(h * 0.05))}px system-ui, sans-serif`;
  ctx.fillText(name, x + w / 2, y + h / 2 + 14);
}

function drawCoverImage(ctx, image, x, y, w, h) {
  const iw = image.videoWidth || image.width;
  const ih = image.videoHeight || image.height;
  if (!iw || !ih || w < 2 || h < 2) return false;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  return true;
}

function getTileParticipantName(tile) {
  return (
    tile.querySelector('.lk-participant-name')?.textContent?.trim()
    || tile.querySelector('[data-lk-participant-name]')?.textContent?.trim()
    || 'Participant'
  );
}

function drawLiveKitVideosInRoot(ctx, canvas, rootEl) {
  const rootRect = rootEl.getBoundingClientRect();
  if (rootRect.width < 20 || rootRect.height < 20) return 0;

  let drawn = 0;
  const paintedVideos = new WeakSet();

  rootEl.querySelectorAll('.lk-participant-tile').forEach((tile) => {
    const rect = tile.getBoundingClientRect();
    if (rect.width < 6 || rect.height < 6) return;

    const { x, y, w, h } = mapRectToCanvas(rect, rootRect, canvas);
    const video = tile.querySelector('video');

    if (video && !paintedVideos.has(video)) {
      if (drawCoverImage(ctx, video, x, y, w, h)) {
        paintedVideos.add(video);
        drawn += 1;
        return;
      }
    }

    drawPlaceholder(ctx, x, y, w, h, getTileParticipantName(tile));
    drawn += 1;
  });

  rootEl.querySelectorAll(
    '.lk-focus-layout video, .lk-focus-layout-wrapper video, .vm-focus-wrap video',
  ).forEach((video) => {
    if (paintedVideos.has(video)) return;
    const rect = video.getBoundingClientRect();
    if (rect.width < 6 || rect.height < 6) return;
    const { x, y, w, h } = mapRectToCanvas(rect, rootRect, canvas);
    if (drawCoverImage(ctx, video, x, y, w, h)) {
      paintedVideos.add(video);
      drawn += 1;
    }
  });

  rootEl.querySelectorAll('video').forEach((video) => {
    if (paintedVideos.has(video)) return;
    const rect = video.getBoundingClientRect();
    if (rect.width < 6 || rect.height < 6) return;
    const { x, y, w, h } = mapRectToCanvas(rect, rootRect, canvas);
    if (drawCoverImage(ctx, video, x, y, w, h)) {
      paintedVideos.add(video);
      drawn += 1;
    }
  });

  return drawn;
}

function paintChromeOverVideos(ctx, canvas, appRoot) {
  const appRect = appRoot.getBoundingClientRect();
  const chromeSelectors = [
    'header.vm-top-header',
    '.vm-room-banner',
    '.vm-toast',
    'footer.vm-bottom-bar',
    '.vm-chat-side',
  ];

  chromeSelectors.forEach((selector) => {
    appRoot.querySelectorAll(selector).forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) return;
      const { x, y, w, h } = mapRectToCanvas(rect, appRect, canvas);
      ctx.fillStyle = selector.includes('header') || selector.includes('footer')
        ? '#161b22'
        : '#1f2633';
      ctx.fillRect(x, y, w, h);
    });
  });
}

function createDomCompositor(rootSelectors, { paintAppChrome = false } = {}) {
  const rootEl = findRoot(rootSelectors);
  const { width, height } = rootEl
    ? canvasSizeForElement(rootEl)
    : { width: 1280, height: 720 };

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  let running = false;
  let rafId = null;

  const drawFrame = () => {
    if (!running) return;

    ctx.fillStyle = STAGE_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const root = findRoot(rootSelectors);
    if (!root) {
      ctx.fillStyle = '#8b9cb3';
      ctx.font = '18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Meeting view not found', canvas.width / 2, canvas.height / 2);
    } else if (paintAppChrome) {
      const appRoot = findRoot(APP_ROOT_SELECTORS) || root;
      paintChromeOverVideos(ctx, canvas, appRoot);
      const stage = findRoot(STAGE_ROOT_SELECTORS);
      if (stage) drawLiveKitVideosInRoot(ctx, canvas, appRoot);
      else drawLiveKitVideosInRoot(ctx, canvas, root);
    } else {
      drawLiveKitVideosInRoot(ctx, canvas, root);
    }

    rafId = requestAnimationFrame(drawFrame);
  };

  const stream = canvas.captureStream(CAPTURE_FPS);

  return {
    stream,
    start() {
      running = true;
      drawFrame();
    },
    stop() {
      running = false;
      if (rafId != null) cancelAnimationFrame(rafId);
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

async function captureHostTabStream(onRecordingError) {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Screen capture is not supported in this browser.');
  }

  const constraints = {
    video: {
      displaySurface: 'browser',
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: CAPTURE_FPS, max: 30 },
    },
    audio: true,
    preferCurrentTab: true,
    selfBrowserSurface: 'include',
    surfaceSwitching: 'exclude',
    monitorTypeSurfaces: 'exclude',
  };

  onRecordingError?.(
    'Choose "This tab" in the share dialog and enable "Share tab audio" if available.',
  );

  const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error('No video track from screen capture.');
  }

  return stream;
}

function createLiveAudioMixer(room, extraStream = null) {
  const audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();
  const masterGain = audioContext.createGain();
  masterGain.gain.value = 1;
  masterGain.connect(destination);
  const connected = new Map();

  const disconnect = (id) => {
    const e = connected.get(id);
    if (!e) return;
    try { e.source.disconnect(); } catch { /* noop */ }
    connected.delete(id);
  };

  const connect = (mediaTrack, key) => {
    if (!mediaTrack || mediaTrack.readyState === 'ended') return;
    const id = key || mediaTrack.id;
    if (connected.has(id)) return;

    let track = mediaTrack;
    try {
      if (typeof mediaTrack.clone === 'function') track = mediaTrack.clone();
    } catch { /* use original */ }

    try {
      const source = audioContext.createMediaStreamSource(new MediaStream([track]));
      const gain = audioContext.createGain();
      gain.gain.value = 1;
      source.connect(gain);
      gain.connect(masterGain);
      connected.set(id, { source, track });
    } catch (err) {
      console.warn('Audio connect failed:', err?.message || err);
    }
  };

  const tabAudio = extraStream?.getAudioTracks?.()[0];
  if (tabAudio) connect(tabAudio, 'tab-audio');

  const syncAudio = () => {
    if (!room) return;
    const live = new Set();

    const visit = (participant) => {
      participant.trackPublications.forEach((pub) => {
        if (pub.kind !== Track.Kind.Audio) return;
        const lk = pub.track;
        if (!lk || pub.isMuted || lk.isMuted) return;
        const mt = lk.mediaStreamTrack;
        if (!mt || mt.readyState !== 'live') return;
        live.add(mt.id);
        connect(mt);
      });
    };

    visit(room.localParticipant);
    room.remoteParticipants.forEach(visit);
    connected.forEach((_, id) => {
      if (id !== 'tab-audio' && !live.has(id)) disconnect(id);
    });
  };

  const onChange = () => syncAudio();
  room.on(RoomEvent.TrackSubscribed, onChange);
  room.on(RoomEvent.TrackUnsubscribed, onChange);
  room.on(RoomEvent.TrackMuted, onChange);
  room.on(RoomEvent.TrackUnmuted, onChange);
  room.on(RoomEvent.ParticipantConnected, onChange);
  room.on(RoomEvent.ParticipantDisconnected, onChange);
  room.on(RoomEvent.LocalTrackPublished, onChange);
  room.on(RoomEvent.LocalTrackUnpublished, onChange);
  syncAudio();

  return {
    audioContext,
    mixedTrack: () => destination.stream.getAudioTracks()[0] || null,
    syncAudio,
    hasAudio: () => connected.size > 0,
    destroy() {
      room.off(RoomEvent.TrackSubscribed, onChange);
      room.off(RoomEvent.TrackUnsubscribed, onChange);
      room.off(RoomEvent.TrackMuted, onChange);
      room.off(RoomEvent.TrackUnmuted, onChange);
      room.off(RoomEvent.ParticipantConnected, onChange);
      room.off(RoomEvent.ParticipantDisconnected, onChange);
      room.off(RoomEvent.LocalTrackPublished, onChange);
      room.off(RoomEvent.LocalTrackUnpublished, onChange);
      connected.forEach((_, id) => disconnect(id));
      if (audioContext.state !== 'closed') audioContext.close().catch(() => {});
    },
  };
}

export default function MeetingRoomRecorderBridge({
  isHost = false,
  recordingActive,
  onReady,
  onRecordingError,
}) {
  const room = useRoomContext();
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const compositorRef = useRef(null);
  const displayStreamRef = useRef(null);
  const audioMixerRef = useRef(null);
  const startingRef = useRef(false);
  const audioSyncIntervalRef = useRef(null);
  const shareEndedHandlerRef = useRef(null);

  const cleanupCapture = useCallback(() => {
    if (audioSyncIntervalRef.current) {
      clearInterval(audioSyncIntervalRef.current);
      audioSyncIntervalRef.current = null;
    }
    if (shareEndedHandlerRef.current) {
      const track = displayStreamRef.current?.getVideoTracks?.()[0];
      track?.removeEventListener?.('ended', shareEndedHandlerRef.current);
      shareEndedHandlerRef.current = null;
    }
    displayStreamRef.current?.getTracks().forEach((t) => t.stop());
    displayStreamRef.current = null;
    compositorRef.current?.stop();
    compositorRef.current = null;
    audioMixerRef.current?.destroy();
    audioMixerRef.current = null;
  }, []);

  const stopAndFinalize = useCallback(() => new Promise((resolve) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      cleanupCapture();
      resolve(null);
      return;
    }

    const finish = () => {
      const mimeType = recorder.mimeType || 'video/webm';
      const blob = chunksRef.current.length
        ? new Blob(chunksRef.current, { type: mimeType })
        : null;
      chunksRef.current = [];
      mediaRecorderRef.current = null;
      cleanupCapture();
      resolve(blob);
    };

    const onStop = () => {
      recorder.removeEventListener('stop', onStop);
      finish();
    };

    recorder.addEventListener('stop', onStop);
    try {
      if (recorder.state === 'recording') recorder.requestData();
    } catch { /* noop */ }
    if (recorder.state === 'recording') recorder.stop();
    else finish();
  }), [cleanupCapture]);

  useEffect(() => {
    onReady?.({ stopAndFinalize });
  }, [onReady, stopAndFinalize]);

  const startCapture = useCallback(async () => {
    if (startingRef.current || mediaRecorderRef.current || !room) return;
    startingRef.current = true;

    try {
      let videoTrack = null;
      let tabStream = null;

      if (isHost) {
        try {
          tabStream = await captureHostTabStream(onRecordingError);
          displayStreamRef.current = tabStream;
          videoTrack = tabStream.getVideoTracks()[0];

          const onShareEnded = () => {
            onRecordingError?.('Tab sharing stopped — recording ended.');
            if (mediaRecorderRef.current?.state === 'recording') {
              try { mediaRecorderRef.current.stop(); } catch { /* noop */ }
            }
          };
          shareEndedHandlerRef.current = onShareEnded;
          videoTrack.addEventListener('ended', onShareEnded);
        } catch (err) {
          if (err?.name === 'NotAllowedError') {
            throw new Error('Screen capture was cancelled. Recording needs "This tab" to capture the full meeting.');
          }
          console.warn('Tab capture failed, using DOM fallback:', err?.message || err);
          onRecordingError?.('Tab share unavailable — recording meeting layout (video area) instead.');
        }
      }

      if (!videoTrack) {
        const compositor = createDomCompositor(
          isHost ? APP_ROOT_SELECTORS : VIEW_ROOT_SELECTORS,
          { paintAppChrome: isHost },
        );
        compositorRef.current = compositor;
        compositor.start();
        await new Promise((r) => { setTimeout(r, WARMUP_MS); });
        videoTrack = compositor.stream.getVideoTracks()[0];
      }

      const audioMixer = createLiveAudioMixer(room, tabStream);
      audioMixerRef.current = audioMixer;
      if (audioMixer.audioContext.state === 'suspended') {
        await audioMixer.audioContext.resume();
      }

      if (!tabStream) await new Promise((r) => { setTimeout(r, WARMUP_MS); });
      audioMixer.syncAudio();
      audioSyncIntervalRef.current = setInterval(() => audioMixer.syncAudio(), 1500);

      const tracks = [videoTrack].filter(Boolean);
      const mixedAudio = audioMixer.mixedTrack();
      if (mixedAudio) tracks.push(mixedAudio);

      if (!tracks.length) throw new Error('No media available to record.');

      const mimeType = getSupportedMimeType();
      if (!mimeType) throw new Error('This browser cannot record WebM video.');

      const recorder = new MediaRecorder(new MediaStream(tracks), {
        mimeType,
        videoBitsPerSecond: 4_000_000,
        audioBitsPerSecond: 128_000,
      });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onerror = () => onRecordingError?.('Recording failed unexpectedly.');

      recorder.start(1000);
      mediaRecorderRef.current = recorder;

      if (!audioMixer.hasAudio()) {
        onRecordingError?.(
          'No meeting audio detected yet. Enable "Share tab audio" or unmute microphones.',
        );
      }
    } catch (err) {
      cleanupCapture();
      onRecordingError?.(err.message || 'Failed to start recording');
    } finally {
      startingRef.current = false;
    }
  }, [room, isHost, cleanupCapture, onRecordingError]);

  useEffect(() => {
    if (recordingActive) {
      startCapture();
      return undefined;
    }
    if (mediaRecorderRef.current) stopAndFinalize();
    return undefined;
  }, [recordingActive, startCapture, stopAndFinalize]);

  useEffect(() => () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      try { mediaRecorderRef.current.requestData(); } catch { /* noop */ }
      mediaRecorderRef.current.stop();
    }
    cleanupCapture();
  }, [cleanupCapture]);

  return null;
}
