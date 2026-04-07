"use client";

import { Rnd } from "react-rnd";

import { useTwitchPlayer } from "@/hooks/use-twitch-player";
import { TWITCH_MIN_PLAYER_SIZE } from "@/lib/viewer-state";
import type {
  PlayerLayout,
  PlayerRuntimeState,
  TwitchPlayerController,
  ViewerPlayer,
} from "@/types/viewer";
import { cn } from "@/lib/cn";
import styles from "@/styles/twitch-player-window.module.scss";

interface TwitchPlayerWindowProps {
  player: ViewerPlayer;
  selected: boolean;
  activeChat: boolean;
  activeAudio: boolean;
  reloadToken: number;
  snapToGrid: boolean;
  gridSize: number;
  onSelect: (playerId: string) => void;
  onRemove: (playerId: string) => void;
  onLayoutChange: (playerId: string, layout: Partial<PlayerLayout>) => void;
  onRuntimeChange: (playerId: string, runtime: PlayerRuntimeState) => void;
  onControllerChange: (
    playerId: string,
    controller: TwitchPlayerController | null,
  ) => void;
}

export function TwitchPlayerWindow({
  player,
  selected,
  activeChat,
  activeAudio,
  reloadToken,
  snapToGrid,
  gridSize,
  onSelect,
  onRemove,
  onLayoutChange,
  onRuntimeChange,
  onControllerChange,
}: TwitchPlayerWindowProps) {
  const { hostRef, status } = useTwitchPlayer({
    channel: player.channel,
    preferences: player.preferences,
    reloadToken,
    onStateChange: (runtime) => onRuntimeChange(player.id, runtime),
    onControllerChange: (controller) => onControllerChange(player.id, controller),
  });

  return (
    <Rnd
      bounds="parent"
      className={cn(styles.streamWindow, selected && styles.streamWindowSelected)}
      dragHandleClassName={styles.streamWindowHeader}
      dragGrid={snapToGrid ? [gridSize, gridSize] : undefined}
      enableUserSelectHack={false}
      minHeight={TWITCH_MIN_PLAYER_SIZE.height}
      minWidth={TWITCH_MIN_PLAYER_SIZE.width}
      onDragStart={() => onSelect(player.id)}
      onDragStop={(_, data) => {
        onLayoutChange(player.id, {
          x: data.x,
          y: data.y,
        });
      }}
      onMouseDown={() => onSelect(player.id)}
      onResizeStart={() => onSelect(player.id)}
      onResizeStop={(_, __, ref, ___, position) => {
        onLayoutChange(player.id, {
          x: position.x,
          y: position.y,
          width: ref.offsetWidth,
          height: ref.offsetHeight,
        });
      }}
      position={{
        x: player.layout.x,
        y: player.layout.y,
      }}
      resizeGrid={snapToGrid ? [gridSize, gridSize] : undefined}
      size={{
        width: player.layout.width,
        height: player.layout.height,
      }}
      style={{
        zIndex: player.layout.zIndex,
      }}
    >
      <div className={styles.streamWindowChrome}>
        <div className={styles.streamWindowHeader}>
          <button
            className={styles.streamWindowTitle}
            onClick={() => onSelect(player.id)}
            type="button"
          >
            {player.channel}
          </button>
          <div className={styles.streamWindowMarkers}>
            {activeAudio ? <span className={styles.statusPill}>Audio</span> : null}
            {activeChat ? (
              <span className={cn(styles.statusPill, styles.statusPillChat)}>Chat</span>
            ) : null}
            {selected ? (
              <span className={cn(styles.statusPill, styles.statusPillSelected)}>
                Selected
              </span>
            ) : null}
          </div>
          <button
            aria-label={`Remove ${player.channel}`}
            className={styles.windowIconButton}
            onClick={() => onRemove(player.id)}
            type="button"
          >
            Close
          </button>
        </div>
        <div className={styles.streamWindowBody}>
          <div className={styles.twitchEmbedHost} ref={hostRef} />
          {status.loading ? (
            <div className={styles.streamWindowOverlay}>
              <span>Loading {player.channel}…</span>
            </div>
          ) : null}
          {status.error ? (
            <div className={cn(styles.streamWindowOverlay, styles.streamWindowOverlayError)}>
              <span>{status.error}</span>
            </div>
          ) : null}
        </div>
      </div>
    </Rnd>
  );
}
