"use client";

import { useState } from "react";

import type { ViewerPlayer, ViewerSettings } from "@/types/viewer";
import { cn } from "@/lib/cn";
import styles from "@/styles/settings-modal.module.scss";

interface SettingsModalProps {
  players: ViewerPlayer[];
  settings: ViewerSettings;
  defaultChatPlayerId: string | null;
  onClose: () => void;
  onAddStreams: (channels: string[]) => number;
  onRemovePlayer: (playerId: string) => void;
  onReorderPlayer: (playerId: string, direction: -1 | 1) => void;
  onSetDefaultChatPlayer: (playerId: string | null) => void;
  onUpdateSettings: (settings: Partial<ViewerSettings>) => void;
  onResetLayout: () => void;
}

function parseDraftChannels(value: string) {
  return value
    .split(/[\s,]+/)
    .map((channel) => channel.trim())
    .filter(Boolean);
}

export function SettingsModal({
  players,
  settings,
  defaultChatPlayerId,
  onClose,
  onAddStreams,
  onRemovePlayer,
  onReorderPlayer,
  onSetDefaultChatPlayer,
  onUpdateSettings,
  onResetLayout,
}: SettingsModalProps) {
  const [streamDraft, setStreamDraft] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleAddStreams() {
    const channels = parseDraftChannels(streamDraft);

    if (channels.length === 0) {
      setFeedback("Enter at least one Twitch channel name.");
      return;
    }

    const addedCount = onAddStreams(channels);

    if (addedCount === 0) {
      setFeedback("No new valid channels were added.");
      return;
    }

    setStreamDraft("");
    setFeedback(`Added ${addedCount} stream${addedCount === 1 ? "" : "s"}.`);
  }

  return (
    <div
      aria-modal="true"
      className={styles.settingsModalBackdrop}
      onClick={onClose}
      role="dialog"
    >
      <div className={styles.settingsModal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.settingsModalHeader}>
          <div>
            <p className={styles.eyebrow}>Settings</p>
            <h2>Streams, grid, chat, and embed domains</h2>
          </div>
          <button onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className={styles.settingsModalBody}>
          <section className={styles.settingsBlock}>
            <h3>Add streams</h3>
            <p>
              Paste one or more Twitch channels, separated by commas or new lines.
            </p>
            <div className={styles.settingsInlineForm}>
              <textarea
                onChange={(event) => setStreamDraft(event.target.value)}
                placeholder="example_channel"
                rows={3}
                value={streamDraft}
              />
              <button onClick={handleAddStreams} type="button">
                Add Streams
              </button>
            </div>
          </section>

          <section className={styles.settingsBlock}>
            <h3>Manage streams</h3>
            {players.length === 0 ? (
              <div className={styles.sectionEmptyState}>
                <p>No streams yet. Add your first channel above.</p>
              </div>
            ) : (
              <div className={styles.settingsStreamList}>
                {players.map((player, index) => (
                  <div className={styles.settingsStreamRow} key={player.id}>
                    <div>
                      <strong>{player.channel}</strong>
                      {player.id === defaultChatPlayerId ? (
                        <span className={cn(styles.statusPill, styles.statusPillChat)}>
                          Default chat
                        </span>
                      ) : null}
                    </div>
                    <div className={styles.settingsStreamActions}>
                      <button
                        disabled={index === 0}
                        onClick={() => onReorderPlayer(player.id, -1)}
                        type="button"
                      >
                        Up
                      </button>
                      <button
                        disabled={index === players.length - 1}
                        onClick={() => onReorderPlayer(player.id, 1)}
                        type="button"
                      >
                        Down
                      </button>
                      <button
                        onClick={() => onSetDefaultChatPlayer(player.id)}
                        type="button"
                      >
                        Default Chat
                      </button>
                      <button
                        className={styles.dangerButton}
                        onClick={() => onRemovePlayer(player.id)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={styles.settingsBlock}>
            <h3>Workspace behavior</h3>
            <div className={styles.settingsGrid}>
              <label className={styles.toggleRow}>
                <span>Snap players to grid</span>
                <input
                  checked={settings.snapToGrid}
                  onChange={(event) =>
                    onUpdateSettings({ snapToGrid: event.target.checked })
                  }
                  type="checkbox"
                />
              </label>
              <label className={styles.toggleRow}>
                <span>Show grid overlay</span>
                <input
                  checked={settings.showGrid}
                  onChange={(event) =>
                    onUpdateSettings({ showGrid: event.target.checked })
                  }
                  type="checkbox"
                />
              </label>
              <label className={styles.fieldRow}>
                <span>Grid size</span>
                <input
                  max={96}
                  min={8}
                  onChange={(event) =>
                    onUpdateSettings({ gridSize: Number(event.target.value) })
                  }
                  type="number"
                  value={settings.gridSize}
                />
              </label>
              <label className={styles.fieldRow}>
                <span>Default chat stream</span>
                <select
                  onChange={(event) =>
                    onSetDefaultChatPlayer(event.target.value || null)
                  }
                  value={defaultChatPlayerId ?? ""}
                >
                  <option value="">First available stream</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.channel}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.settingsResetRow}>
              <button onClick={onResetLayout} type="button">
                Reset Layout
              </button>
            </div>
          </section>
        </div>

        <div className={styles.settingsModalFooter}>
          <p>{feedback ?? "Changes are applied immediately and saved to localStorage."}</p>
        </div>
      </div>
    </div>
  );
}
