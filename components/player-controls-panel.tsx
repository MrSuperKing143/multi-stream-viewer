"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  ChevronDownIcon,
  ChevronRightIcon,
  MuteIcon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
  VolumeIcon,
} from "@/components/control-icons";
import type { PlayerRuntimeState, ViewerPlayer } from "@/types/viewer";
import { cn } from "@/lib/cn";
import styles from "@/styles/player-controls-panel.module.scss";

const CONTROL_ROW_LIMIT = 3;

interface PlayerControlsPanelProps {
  players: ViewerPlayer[];
  runtimeByPlayerId: Record<string, PlayerRuntimeState | undefined>;
  selectedPlayerId: string | null;
  onSelect: (playerId: string) => void;
  onTogglePlay: (playerId: string) => void;
  onToggleMute: (playerId: string) => void;
  onVolumeChange: (playerId: string, volume: number) => void;
  onReload: (playerId: string) => void;
}

function resolveState(player: ViewerPlayer, runtime?: PlayerRuntimeState) {
  const volume =
    typeof runtime?.volume === "number" && Number.isFinite(runtime.volume)
      ? runtime.volume
      : player.preferences.volume;

  return {
    muted: runtime?.muted ?? player.preferences.muted,
    paused: runtime?.paused ?? player.preferences.paused,
    volume,
    ready: runtime?.ready ?? false,
    loading: runtime?.loading ?? true,
    error: runtime?.error ?? null,
  };
}

interface PlayerActionButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
}

function PlayerActionButton({
  label,
  onClick,
  children,
  active = false,
}: PlayerActionButtonProps) {
  return (
    <button
      aria-label={label}
      className={cn(styles.iconActionButton, active && styles.iconActionButtonActive)}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

export function PlayerControlsPanel({
  players,
  runtimeByPlayerId,
  selectedPlayerId,
  onSelect,
  onTogglePlay,
  onToggleMute,
  onVolumeChange,
  onReload,
}: PlayerControlsPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [listMaxHeight, setListMaxHeight] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const playerIdsKey = players.map((player) => player.id).join(",");
  const controlsCollapsed = players.length > 0 && collapsed;
  const showControlsBody = !controlsCollapsed;

  useEffect(() => {
    const listElement = listRef.current;

    if (!listElement || players.length === 0 || !showControlsBody) {
      return;
    }

    const controlList = listElement;

    // Cap the panel to the combined height of the first three rows.
    function measureVisibleRows() {
      const rows = Array.from(
        controlList.querySelectorAll<HTMLElement>("[data-control-row='true']"),
      );
      const visibleRows = rows.slice(0, CONTROL_ROW_LIMIT);

      if (visibleRows.length === 0) {
        setListMaxHeight(null);
        return;
      }

      const computedStyle = window.getComputedStyle(controlList);
      const gap = Number.parseFloat(computedStyle.rowGap || computedStyle.gap || "0");
      const nextHeight =
        visibleRows.reduce(
          (totalHeight, row) => totalHeight + row.getBoundingClientRect().height,
          0,
        ) +
        gap * Math.max(visibleRows.length - 1, 0);

      setListMaxHeight(Math.ceil(nextHeight));
    }

    const frameId = window.requestAnimationFrame(() => {
      measureVisibleRows();
    });

    const resizeObserver = new ResizeObserver(() => {
      measureVisibleRows();
    });

    resizeObserver.observe(controlList);

    Array.from(
      controlList.querySelectorAll<HTMLElement>("[data-control-row='true']"),
    ).forEach((row) => {
      resizeObserver.observe(row);
    });

    window.addEventListener("resize", measureVisibleRows);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureVisibleRows);
    };
  }, [playerIdsKey, players.length, showControlsBody]);

  const controlListStyle =
    listMaxHeight === null
      ? undefined
      : ({ maxHeight: `${listMaxHeight}px` } as CSSProperties);

  return (
    <section
      className={cn(
        styles.sidebarSection,
        styles.playerControlsSection,
        collapsed && styles.playerControlsSectionCollapsed,
      )}
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Player Controls</p>
        </div>
        <div className={styles.sectionHeadingActions}>
          <span className={styles.sectionCounter}>{players.length}</span>
          <button
            aria-expanded={!controlsCollapsed}
            aria-label={
              players.length > 0
                ? controlsCollapsed
                  ? "Expand player controls"
                  : "Collapse player controls"
                : "Player controls unavailable"
            }
            className={styles.collapseButton}
            disabled={players.length === 0}
            onClick={() => setCollapsed((current) => !current)}
            title={
              players.length > 0
                ? controlsCollapsed
                  ? "Expand player controls"
                  : "Collapse player controls"
                : "Player controls unavailable"
            }
            type="button"
          >
            {controlsCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
          </button>
        </div>
      </div>

      {showControlsBody && players.length === 0 ? (
        <div className={styles.sectionEmptyState}>
          <p>Add streams from Settings to unlock per-player controls.</p>
        </div>
      ) : null}

      {showControlsBody && players.length > 0 ? (
        <div
          className={styles.controlRowList}
          ref={listRef}
          style={controlListStyle}
        >
          {players.map((player) => {
            const state = resolveState(player, runtimeByPlayerId[player.id]);
            const selected = player.id === selectedPlayerId;

            return (
              <article
                className={cn(
                  styles.controlRow,
                  selected && styles.controlRowSelected,
                )}
                data-control-row="true"
                key={player.id}
              >
                <div className={styles.controlRowHeader}>
                  <button
                    className={styles.controlRowTitle}
                    onClick={() => onSelect(player.id)}
                    type="button"
                  >
                    {player.channel}
                  </button>
                  <div className={styles.controlRowActions}>
                    <PlayerActionButton
                      label={`${state.paused ? "Play" : "Pause"} ${player.channel}`}
                      onClick={() => onTogglePlay(player.id)}
                    >
                      {state.paused ? <PlayIcon /> : <PauseIcon />}
                    </PlayerActionButton>
                    <PlayerActionButton
                      label={`${state.muted ? "Unmute" : "Mute"} ${player.channel}`}
                      onClick={() => onToggleMute(player.id)}
                    >
                      {state.muted ? <MuteIcon /> : <VolumeIcon />}
                    </PlayerActionButton>
                    <PlayerActionButton
                      label={`Reload ${player.channel}`}
                      onClick={() => onReload(player.id)}
                    >
                      <RefreshIcon />
                    </PlayerActionButton>
                  </div>
                </div>

                <label className={styles.volumeControl}>
                  <span>Volume</span>
                  <input
                    aria-label={`${player.channel} volume`}
                    max={100}
                    min={0}
                    onChange={(event) =>
                      onVolumeChange(player.id, Number(event.target.value) / 100)
                    }
                    type="range"
                    value={Math.round(state.volume * 100)}
                  />
                  <strong>{Math.round(state.volume * 100)}%</strong>
                </label>

                {state.ready ? null : (
                  <p className={styles.controlRowMeta}>
                    {state.error
                      ? state.error
                      : state.loading
                        ? "Waiting for Twitch"
                        : "Applying saved state"}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
