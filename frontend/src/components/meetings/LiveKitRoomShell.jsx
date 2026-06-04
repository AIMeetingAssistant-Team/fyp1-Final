import { memo } from 'react';
import { DisconnectReason, MediaDeviceFailure } from 'livekit-client';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import LiveKitParticipantCount from './LiveKitParticipantCount';
import LiveKitVideoStage from './LiveKitVideoStage';

function LiveKitRoomShell({
  token,
  serverUrl,
  onConnected,
  onDisconnected,
  onError,
  onMediaDeviceFailure,
  onParticipantCountChange,
  layoutMode,
  onLayoutModeChange,
  meetingControls,
  children,
}) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      data-lk-theme="default"
      onConnected={onConnected}
      onError={onError}
      onMediaDeviceFailure={onMediaDeviceFailure}
      onDisconnected={onDisconnected}
      className="vm-lk-room"
    >
      <LiveKitVideoStage
        layoutMode={layoutMode}
        onLayoutModeChange={onLayoutModeChange}
        meetingControls={meetingControls}
      >
        {children}
      </LiveKitVideoStage>
      <RoomAudioRenderer />
      {onParticipantCountChange && (
        <LiveKitParticipantCount onChange={onParticipantCountChange} />
      )}
    </LiveKitRoom>
  );
}

export default memo(LiveKitRoomShell);

export { DisconnectReason, MediaDeviceFailure };
