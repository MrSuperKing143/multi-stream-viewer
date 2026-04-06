import type { ReactNode } from "react";

import {
  MuteIcon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
  VolumeIcon,
} from "@/components/control-icons";
import type { PlayerRuntimeState, ViewerPlayer } from "@/types/viewer";
import { cn } from "@/lib/cn";
import styles from "@/styles/player-controls-panel.module.scss";

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
  return {
    muted: runtime?.muted ?? player.preferences.muted,
    paused: runtime?.paused ?? player.preferences.paused,
    volume: runtime?.volume ?? player.preferences.volume,
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
  return (
    <section className={cn(styles.sidebarSection, styles.playerControlsSection)}>
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Player Controls</p>
        </div>
        <span className={styles.sectionCounter}>{players.length}</span>
      </div>

      {players.length === 0 ? (
        <div className={styles.sectionEmptyState}>
          <p>Add streams from Settings to unlock per-player controls.</p>
        </div>
      ) : (
        <div className={styles.controlRowList}>
          {players.map((player) => {
            const state = resolveState(player, runtimeByPlayerId[player.id]);
            const selected = player.id === selectedPlayerId;

            return (
              <article
                className={cn(
                  styles.controlRow,
                  selected && styles.controlRowSelected,
                )}
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
      )}
    </section>
  );
}
