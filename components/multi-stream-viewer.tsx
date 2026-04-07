"use client";

import {
  startTransition,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import { ChatPanel } from "@/components/chat-panel";
import {
  ChatIcon,
  MuteIcon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
  SoloIcon,
  VolumeIcon,
} from "@/components/control-icons";
import { PlayerControlsPanel } from "@/components/player-controls-panel";
import { SettingsModal } from "@/components/settings-modal";
import { TwitchPlayerWindow } from "@/components/twitch-player-window";
import { cn } from "@/lib/cn";
import {
  createDefaultViewerState,
  normalizeChannelInput,
  viewerReducer,
} from "@/lib/viewer-state";
import { loadViewerState, saveViewerState } from "@/lib/viewer-storage";
import styles from "@/styles/multi-stream-viewer.module.scss";
import type {
  PlayerRuntimeState,
  TwitchPlayerController,
  ViewerPlayer,
} from "@/types/viewer";

interface ToolbarIconButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}

function ToolbarIconButton({
  label,
  onClick,
  children,
  disabled = false,
}: ToolbarIconButtonProps) {
  return (
    <button
      aria-label={label}
      className={styles.toolbarActionButton}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

export function MultiStreamViewer() {
  const [viewerState, dispatch] = useReducer(
    viewerReducer,
    undefined,
    () => loadViewerState() ?? createDefaultViewerState(),
  );
  const [runtimeByPlayerId, setRuntimeByPlayerId] = useState<
    Record<string, PlayerRuntimeState | undefined>
  >({});
  const [reloadTokens, setReloadTokens] = useState<Record<string, number>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const controllersRef = useRef<Record<string, TwitchPlayerController>>({});

  function registerRuntimeState(playerId: string, runtime: PlayerRuntimeState) {
    startTransition(() => {
      setRuntimeByPlayerId((current) => ({
        ...current,
        [playerId]: runtime,
      }));
    });
  }

  useEffect(() => {
    saveViewerState(viewerState);
  }, [viewerState]);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    document.body.classList.add("hasModalOpen");
    return () => document.body.classList.remove("hasModalOpen");
  }, [settingsOpen]);

  const selectedPlayer =
    viewerState.players.find((player) => player.id === viewerState.selectedPlayerId) ??
    null;
  const activeChatPlayer =
    viewerState.players.find(
      (player) => player.id === viewerState.selectedChatPlayerId,
    ) ??
    viewerState.players.find(
      (player) => player.id === viewerState.defaultChatPlayerId,
    ) ??
    viewerState.players[0] ??
    null;

  function bumpReloadTokens(playerIds: string[]) {
    setReloadTokens((current) => {
      const nextState = { ...current };

      playerIds.forEach((playerId) => {
        nextState[playerId] = (nextState[playerId] ?? 0) + 1;
      });

      return nextState;
    });
  }

  function registerController(
    playerId: string,
    controller: TwitchPlayerController | null,
  ) {
    if (controller) {
      controllersRef.current[playerId] = controller;
    } else {
      delete controllersRef.current[playerId];
    }
  }

  function focusPlayer(playerId: string) {
    dispatch({
      type: "bring-to-front",
      playerId,
    });
  }

  function addStreams(channels: string[]) {
    const uniqueChannels = channels
      .map(normalizeChannelInput)
      .filter((channel): channel is string => Boolean(channel))
      .filter((channel, index, all) => all.indexOf(channel) === index)
      .filter(
        (channel) =>
          !viewerState.players.some((player) => player.channel === channel),
      );

    if (uniqueChannels.length === 0) {
      return 0;
    }

    dispatch({
      type: "add-players",
      channels: uniqueChannels,
    });

    return uniqueChannels.length;
  }

  function findPlayer(playerId: string) {
    return viewerState.players.find((player) => player.id === playerId) ?? null;
  }

  function getResolvedPlayerState(player: ViewerPlayer) {
    const runtime = runtimeByPlayerId[player.id];
    return {
      muted: runtime?.muted ?? player.preferences.muted,
      paused: runtime?.paused ?? player.preferences.paused,
      volume: runtime?.volume ?? player.preferences.volume,
    };
  }

  function togglePlay(playerId: string) {
    const player = findPlayer(playerId);

    if (!player) {
      return;
    }

    const currentState = getResolvedPlayerState(player);
    const nextPaused = !currentState.paused;

    dispatch({
      type: "set-player-preferences",
      playerId,
      preferences: {
        paused: nextPaused,
      },
    });

    if (nextPaused) {
      controllersRef.current[playerId]?.pause();
    } else {
      controllersRef.current[playerId]?.play();
    }
  }

  function toggleMute(playerId: string) {
    const player = findPlayer(playerId);

    if (!player) {
      return;
    }

    const currentState = getResolvedPlayerState(player);
    const nextMuted = !currentState.muted;

    dispatch({
      type: "set-player-preferences",
      playerId,
      preferences: {
        muted: nextMuted,
      },
    });

    controllersRef.current[playerId]?.setMuted(nextMuted);

    if (!nextMuted) {
      dispatch({
        type: "set-active-audio-player",
        playerId,
      });
    }
  }

  function setVolume(playerId: string, volume: number) {
    dispatch({
      type: "set-player-preferences",
      playerId,
      preferences: {
        volume,
      },
    });

    controllersRef.current[playerId]?.setVolume(volume);
  }

  function reloadPlayers(playerIds: string[]) {
    bumpReloadTokens(playerIds);
  }

  function handleMuteAll() {
    dispatch({
      type: "mute-all",
    });

    Object.values(controllersRef.current).forEach((controller) => {
      controller.setMuted(true);
    });
  }

  function handlePauseAll() {
    dispatch({
      type: "pause-all",
    });

    Object.values(controllersRef.current).forEach((controller) => {
      controller.pause();
    });
  }

  function handlePlaySelected() {
    if (!selectedPlayer) {
      return;
    }

    dispatch({
      type: "play-selected",
    });

    controllersRef.current[selectedPlayer.id]?.play();
  }

  function handleUnmuteSelected() {
    if (!selectedPlayer) {
      return;
    }

    dispatch({
      type: "unmute-selected",
    });

    controllersRef.current[selectedPlayer.id]?.setMuted(false);
  }

  function handleSoloSelected() {
    if (!selectedPlayer) {
      return;
    }

    dispatch({
      type: "solo-selected",
    });

    viewerState.players.forEach((player) => {
      const controller = controllersRef.current[player.id];

      if (!controller) {
        return;
      }

      controller.setMuted(player.id !== selectedPlayer.id);

      if (player.id === selectedPlayer.id) {
        controller.play();
      }
    });
  }

  return (
    <>
      <div className={styles.viewerShell}>
        <header className={styles.viewerToolbar}>
          <div className={styles.brandCluster}>
            <div>
              <h1>Multi Stream Viewer</h1>
            </div>
          </div>

          <div className={styles.toolbarStatus}>
            <span className={styles.toolbarChip}>
              Selected: {selectedPlayer?.channel ?? "None"}
            </span>
            <span className={styles.toolbarChip}>
              Chat: {activeChatPlayer?.channel ?? "None"}
            </span>
            <span className={styles.toolbarChip}>
              Grid {viewerState.settings.showGrid ? "Visible" : "Hidden"} ·{" "}
              {viewerState.settings.gridSize}px
            </span>
          </div>

          <div className={styles.toolbarActions}>
            <button onClick={() => setSettingsOpen(true)} type="button">
              Add Streams
            </button>
            <ToolbarIconButton label="Mute all players" onClick={handleMuteAll}>
              <MuteIcon />
            </ToolbarIconButton>
            <ToolbarIconButton label="Pause all players" onClick={handlePauseAll}>
              <PauseIcon />
            </ToolbarIconButton>
            <ToolbarIconButton
              disabled={!selectedPlayer}
              label="Play selected player"
              onClick={handlePlaySelected}
            >
              <PlayIcon />
            </ToolbarIconButton>
            <ToolbarIconButton
              disabled={!selectedPlayer}
              label="Unmute selected player"
              onClick={handleUnmuteSelected}
            >
              <VolumeIcon />
            </ToolbarIconButton>
            <ToolbarIconButton
              disabled={!selectedPlayer}
              label="Solo selected player"
              onClick={handleSoloSelected}
            >
              <SoloIcon />
            </ToolbarIconButton>
            <ToolbarIconButton
              disabled={viewerState.players.length === 0}
              label="Reload all players"
              onClick={() => reloadPlayers(viewerState.players.map((player) => player.id))}
            >
              <RefreshIcon />
            </ToolbarIconButton>
            <ToolbarIconButton
              disabled={!selectedPlayer}
              label="Sync chat to selected player"
              onClick={() => dispatch({ type: "sync-chat-to-selected" })}
            >
              <ChatIcon />
            </ToolbarIconButton>
            <button onClick={() => setSettingsOpen(true)} type="button">
              Settings
            </button>
          </div>
        </header>

        <div className={styles.viewerMain}>
          <section className={styles.viewerCanvasPanel}>
            <div
              className={cn(
                styles.viewerCanvas,
                viewerState.settings.showGrid && styles.viewerCanvasGridVisible,
              )}
              style={
                {
                  "--grid-size": `${viewerState.settings.gridSize}px`,
                } as CSSProperties
              }
            >
              {viewerState.players.map((player) => (
                <TwitchPlayerWindow
                  activeAudio={player.id === viewerState.activeAudioPlayerId}
                  activeChat={player.id === activeChatPlayer?.id}
                  gridSize={viewerState.settings.gridSize}
                  key={player.id}
                  onControllerChange={registerController}
                  onLayoutChange={(playerId, layout) =>
                    dispatch({
                      type: "update-layout",
                      playerId,
                      layout,
                    })
                  }
                  onRemove={(playerId) =>
                    dispatch({
                      type: "remove-player",
                      playerId,
                    })
                  }
                  onRuntimeChange={registerRuntimeState}
                  onSelect={focusPlayer}
                  player={player}
                  reloadToken={reloadTokens[player.id] ?? 0}
                  selected={player.id === viewerState.selectedPlayerId}
                  snapToGrid={viewerState.settings.snapToGrid}
                />
              ))}

              {viewerState.players.length === 0 ? (
                <div className={styles.canvasEmptyState}>
                  <p className={styles.eyebrow}>Empty workspace</p>
                  <h2>Add Twitch channels and build your layout.</h2>
                  <p>
                    Drag, resize, overlap, and persist every player window. The
                    side panel keeps controls and chat cleanly separated.
                  </p>
                  <div className={styles.emptyStateActions}>
                    <button onClick={() => setSettingsOpen(true)} type="button">
                      Open Settings
                    </button>
                    <button
                      onClick={() =>
                        dispatch({
                          type: "update-settings",
                          settings: {
                            showGrid: !viewerState.settings.showGrid,
                          },
                        })
                      }
                      type="button"
                    >
                      Toggle Grid
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <aside className={styles.viewerSidebar}>
            <PlayerControlsPanel
              onReload={(playerId) => reloadPlayers([playerId])}
              onSelect={focusPlayer}
              onToggleMute={toggleMute}
              onTogglePlay={togglePlay}
              onVolumeChange={setVolume}
              players={viewerState.players}
              runtimeByPlayerId={runtimeByPlayerId}
              selectedPlayerId={viewerState.selectedPlayerId}
            />

            <ChatPanel
              defaultChatPlayerId={viewerState.defaultChatPlayerId}
              onChangeChat={(playerId) =>
                dispatch({
                  type: "set-chat-player",
                  playerId,
                })
              }
              onCycleChat={(direction) =>
                dispatch({
                  type: "cycle-chat",
                  direction,
                })
              }
              players={viewerState.players}
              selectedChatPlayerId={activeChatPlayer?.id ?? null}
            />
          </aside>
        </div>
      </div>

      {settingsOpen ? (
        <SettingsModal
          defaultChatPlayerId={viewerState.defaultChatPlayerId}
          onAddStreams={addStreams}
          onClose={() => setSettingsOpen(false)}
          onRemovePlayer={(playerId) =>
            dispatch({
              type: "remove-player",
              playerId,
            })
          }
          onReorderPlayer={(playerId, direction) =>
            dispatch({
              type: "reorder-player",
              playerId,
              direction,
            })
          }
          onResetLayout={() =>
            dispatch({
              type: "reset-layout",
            })
          }
          onSetDefaultChatPlayer={(playerId) =>
            dispatch({
              type: "set-default-chat-player",
              playerId,
            })
          }
          onUpdateSettings={(settings) =>
            dispatch({
              type: "update-settings",
              settings,
            })
          }
          players={viewerState.players}
          settings={viewerState.settings}
        />
      ) : null}
    </>
  );
}
