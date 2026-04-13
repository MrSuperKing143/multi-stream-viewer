"use client";

import { useState, type FocusEvent } from "react";
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
  zIndex: number;
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
  zIndex,
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
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const headerVisible = hovered || dragging || resizing || focusWithin;

  function handleChromeBlur(event: FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    setFocusWithin(false);
  }

  return (
    <Rnd
      bounds="parent"
      className={cn(styles.streamWindow, selected && styles.streamWindowSelected)}
      dragHandleClassName={styles.streamWindowHeader}
      dragGrid={snapToGrid ? [gridSize, gridSize] : undefined}
      enableUserSelectHack={false}
      minHeight={TWITCH_MIN_PLAYER_SIZE.height}
      minWidth={TWITCH_MIN_PLAYER_SIZE.width}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onDragStart={() => {
        setDragging(true);
        onSelect(player.id);
      }}
      onDragStop={(_, data) => {
        setDragging(false);
        onLayoutChange(player.id, {
          x: data.x,
          y: data.y,
        });
      }}
      onMouseDown={() => onSelect(player.id)}
      onResizeStart={() => {
        setResizing(true);
        onSelect(player.id);
      }}
      onResizeStop={(_, __, ref, ___, position) => {
        setResizing(false);
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
        zIndex,
      }}
    >
      <div
        className={styles.streamWindowChrome}
        onBlurCapture={handleChromeBlur}
        onFocusCapture={() => setFocusWithin(true)}
      >
        <div
          className={cn(
            styles.streamWindowHeader,
            headerVisible && styles.streamWindowHeaderVisible,
          )}
        >
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
