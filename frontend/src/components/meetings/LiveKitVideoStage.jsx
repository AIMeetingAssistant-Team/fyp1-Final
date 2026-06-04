import { useEffect, useRef } from 'react';
import { Track, RoomEvent } from 'livekit-client';
import { isEqualTrackRef, isTrackReference, isWeb } from '@livekit/components-core';
import {
  CarouselLayout,
  ConnectionStateToast,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  LayoutContextProvider,
  ParticipantTile,
  useCreateLayoutContext,
  usePinnedTracks,
  useTracks,
} from '@livekit/components-react';
import MeetingControlBar from './MeetingControlBar';
import MeetingChatPanel from './MeetingChatPanel';

export default function LiveKitVideoStage({
  layoutMode = 'grid',
  onLayoutModeChange,
  meetingControls,
  captionsPanel = null,
  children,
}) {
  const layoutContext = useCreateLayoutContext();
  const lastScreenShareRef = useRef(null);
  const chatOpen = layoutContext.widget.state?.showChat ?? false;

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false },
  );

  const screenShareTracks = tracks
    .filter(isTrackReference)
    .filter((track) => track.publication.source === Track.Source.ScreenShare);

  const focusTrack = usePinnedTracks(layoutContext)?.[0];
  const carouselTracks = tracks.filter((track) => !isEqualTrackRef(track, focusTrack));

  useEffect(() => {
    if (layoutMode === 'grid') {
      layoutContext.pin.dispatch?.({ msg: 'clear_pin' });
      return;
    }
    const first = tracks.find(isTrackReference);
    if (first && layoutMode === 'speaker') {
      layoutContext.pin.dispatch?.({ msg: 'set_pin', trackReference: first });
    }
  }, [layoutMode, tracks.length]);

  useEffect(() => {
    if (
      screenShareTracks.some((t) => t.publication.isSubscribed)
      && lastScreenShareRef.current === null
    ) {
      layoutContext.pin.dispatch?.({ msg: 'set_pin', trackReference: screenShareTracks[0] });
      lastScreenShareRef.current = screenShareTracks[0];
      onLayoutModeChange?.('speaker');
    } else if (
      lastScreenShareRef.current
      && !screenShareTracks.some(
        (t) => t.publication.trackSid === lastScreenShareRef.current?.publication?.trackSid,
      )
    ) {
      lastScreenShareRef.current = null;
      if (layoutMode === 'grid') {
        layoutContext.pin.dispatch?.({ msg: 'clear_pin' });
      }
    }
  }, [
    screenShareTracks.map((r) => `${r.publication.trackSid}_${r.publication.isSubscribed}`).join(),
    layoutMode,
    onLayoutModeChange,
  ]);

  const closeChat = () => {
    layoutContext.widget.dispatch?.({ msg: 'hide_chat' });
  };

  if (!isWeb()) return null;

  return (
    <LayoutContextProvider value={layoutContext}>
      <div className="vm-room-layout">
        <div
          className={`vm-room-stage ${chatOpen ? 'has-chat' : ''} ${captionsPanel ? 'has-captions' : ''}`}
          data-meeting-recording-view
        >
          <div className="vm-video-area">
            <div className="vm-lk-inner" data-meeting-recording-stage>
              {!focusTrack ? (
                <div className="lk-grid-layout-wrapper vm-grid-wrap">
                  <GridLayout tracks={tracks}>
                    <ParticipantTile />
                  </GridLayout>
                </div>
              ) : (
                <div className="lk-focus-layout-wrapper vm-focus-wrap">
                  <FocusLayoutContainer>
                    <CarouselLayout tracks={carouselTracks}>
                      <ParticipantTile />
                    </CarouselLayout>
                    {focusTrack && <FocusLayout trackRef={focusTrack} />}
                  </FocusLayoutContainer>
                </div>
              )}
            </div>
          </div>

          {chatOpen && <MeetingChatPanel onClose={closeChat} />}
          {captionsPanel}
          {children}
          <ConnectionStateToast />
        </div>

        <MeetingControlBar
          {...meetingControls}
          layoutMode={layoutMode}
          onLayoutModeChange={onLayoutModeChange}
        />
      </div>
    </LayoutContextProvider>
  );
}
