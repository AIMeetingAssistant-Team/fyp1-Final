import { Track } from 'livekit-client';
import { supportsScreenSharing } from '@livekit/components-core';
import {
  useTrackToggle,
  useMaybeLayoutContext,
} from '@livekit/components-react';
import {
  Circle,
  Square,
  MessageSquare,
  Loader2,
  MonitorUp,
  MonitorOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  LayoutGrid,
  Presentation,
  FileText,
} from 'lucide-react';
import MediaDevicePicker from './MediaDevicePicker';

function ToolButton({
  label,
  active,
  variant,
  disabled,
  onClick,
  title,
  children,
  badge,
}) {
  return (
    <div className="vm-tool">
      <button
        type="button"
        className={`vm-tool-btn ${variant ? `vm-tool-btn--${variant}` : ''} ${active ? 'is-active' : ''}`}
        onClick={onClick}
        disabled={disabled}
        title={title || label}
      >
        {children}
        {badge != null && badge > 0 && <em className="vm-tool-badge">{badge}</em>}
      </button>
      <span className="vm-tool-label">{label}</span>
    </div>
  );
}

function MediaTool({ source, label, onIcon: OnIcon, offIcon: OffIcon, deviceKind, captureOptions }) {
  const { buttonProps, enabled } = useTrackToggle({ source, captureOptions });
  const { className: lkClass = '', ...restProps } = buttonProps;
  const Icon = enabled ? OnIcon : OffIcon;

  return (
    <div className="vm-tool vm-tool--media">
      <div className={`vm-tool-split ${enabled ? 'is-on' : 'is-off'}`}>
        <button
          type="button"
          {...restProps}
          className={`vm-tool-btn vm-tool-btn--main ${lkClass}`.trim()}
          title={enabled ? `Mute ${label.toLowerCase()}` : `Unmute ${label.toLowerCase()}`}
        >
          <Icon size={20} strokeWidth={1.75} aria-hidden />
        </button>
        <MediaDevicePicker kind={deviceKind} label={label} />
      </div>
      <span className="vm-tool-label">{label}</span>
    </div>
  );
}

export default function MeetingControlBar({
  isHost,
  recordingActive,
  recordingLoading,
  onToggleRecording,
  layoutMode = 'grid',
  onLayoutModeChange,
  transcriptActive = false,
  onToggleTranscript,
}) {
  const layoutContext = useMaybeLayoutContext();
  const chatOpen = layoutContext?.widget.state?.showChat ?? false;
  const unread = layoutContext?.widget.state?.unreadMessages ?? 0;

  const toggleChat = () => {
    layoutContext?.widget.dispatch?.({ msg: 'toggle_chat' });
  };

  const share = useTrackToggle({
    source: Track.Source.ScreenShare,
    captureOptions: { audio: true, selfBrowserSurface: 'include' },
  });
  const { className: shareLkClass = '', ...shareProps } = share.buttonProps;
  const ShareIcon = share.enabled ? MonitorUp : MonitorOff;

  return (
    <footer className="vm-bottom-bar">
      <div className="vm-toolbar">
        <div className="vm-toolbar-group">
          <MediaTool
            source={Track.Source.Microphone}
            label="Audio"
            onIcon={Mic}
            offIcon={MicOff}
            deviceKind="audioinput"
          />
          <MediaTool
            source={Track.Source.Camera}
            label="Video"
            onIcon={Video}
            offIcon={VideoOff}
            deviceKind="videoinput"
          />
          {supportsScreenSharing() && (
            <div className="vm-tool">
              <button
                type="button"
                {...shareProps}
                className={`vm-tool-btn ${share.enabled ? 'is-active' : ''} ${shareLkClass}`.trim()}
                title={share.enabled ? 'Stop sharing' : 'Share screen'}
              >
                <ShareIcon size={20} strokeWidth={1.75} />
              </button>
              <span className="vm-tool-label">Share</span>
            </div>
          )}
        </div>

        <div className="vm-toolbar-divider" />

        <div className="vm-toolbar-group">
          <ToolButton
            label={recordingActive ? 'Stop' : 'Record'}
            active={recordingActive}
            variant="record"
            disabled={recordingLoading || !isHost}
            onClick={onToggleRecording}
          >
            {recordingLoading ? (
              <Loader2 size={20} className="vm-spin" />
            ) : recordingActive ? (
              <Square size={20} strokeWidth={1.75} />
            ) : (
              <Circle size={20} strokeWidth={1.75} />
            )}
          </ToolButton>

          <ToolButton
            label="Transcript"
            active={transcriptActive}
            variant="transcript"
            onClick={onToggleTranscript}
            title={transcriptActive ? 'Turn off live transcript' : 'Turn on live transcript'}
          >
            <FileText size={20} strokeWidth={1.75} />
          </ToolButton>

          <ToolButton
            label="Chat"
            active={chatOpen}
            onClick={toggleChat}
            badge={!chatOpen ? unread : 0}
          >
            <MessageSquare size={20} strokeWidth={1.75} />
          </ToolButton>
        </div>

        <div className="vm-toolbar-divider vm-toolbar-divider--hide-sm" />

        <div className="vm-toolbar-group">
          <ToolButton
            label="Grid"
            active={layoutMode === 'grid'}
            onClick={() => onLayoutModeChange?.('grid')}
          >
            <LayoutGrid size={20} strokeWidth={1.75} />
          </ToolButton>
          <ToolButton
            label="Speaker"
            active={layoutMode === 'speaker'}
            onClick={() => onLayoutModeChange?.('speaker')}
          >
            <Presentation size={20} strokeWidth={1.75} />
          </ToolButton>
        </div>
      </div>
    </footer>
  );
}
