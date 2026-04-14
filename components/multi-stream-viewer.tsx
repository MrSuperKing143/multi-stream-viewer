"use client";

import {
  startTransition,
  type CSSProperties,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import { ChatPanel } from "@/components/chat-panel";
import { PlayerControlsPanel } from "@/components/player-controls-panel";
import { SettingsModal } from "@/components/settings-modal";
import { TwitchPlayerWindow } from "@/components/twitch-player-window";
import { cn } from "@/lib/cn";
import {
  createDefaultViewerState,
  normalizeChannelInput,
  viewerReducer,
} from "@/lib/viewer-state";
import { CogIcon } from "@/components/control-icons";
import { loadViewerState, saveViewerState } from "@/lib/viewer-storage";
import styles from "@/styles/multi-stream-viewer.module.scss";
import type {
  PlayerRuntimeState,
  TwitchPlayerController,
  ViewerPlayer,
} from "@/types/viewer";

function isSameRuntimeState(
  current: PlayerRuntimeState | undefined,
  next: PlayerRuntimeState,
) {
  return (
    current?.ready === next.ready &&
    current?.loading === next.loading &&
    current?.muted === next.muted &&
    current?.volume === next.volume &&
    current?.paused === next.paused &&
    current?.quality === next.quality &&
    current?.error === next.error
  );
}

function getPlayerZIndex(
  order: number,
  playerCount: number,
  streamStackOrder: "bottom-above-top" | "top-above-bottom",
) {
  return streamStackOrder === "top-above-bottom" ? playerCount - order + 1 : order;
}

function getRuntimePreferenceVolume(
  player: ViewerPlayer,
  runtime: PlayerRuntimeState,
) {
  return typeof runtime.volume === "number" && Number.isFinite(runtime.volume)
    ? runtime.volume
    : player.preferences.volume;
}

function getRuntimePreferenceQuality(
  player: ViewerPlayer,
  runtime: PlayerRuntimeState,
) {
  return runtime.quality || player.preferences.quality;
}

function runtimeMatchesPreferences(
  player: ViewerPlayer,
  runtime: PlayerRuntimeState,
) {
  return (
    player.preferences.muted === runtime.muted &&
    player.preferences.paused === runtime.paused &&
    player.preferences.volume === getRuntimePreferenceVolume(player, runtime) &&
    player.preferences.quality === getRuntimePreferenceQuality(player, runtime)
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
      setRuntimeByPlayerId((current) => {
        if (isSameRuntimeState(current[playerId], runtime)) {
          return current;
        }

        return {
          ...current,
          [playerId]: runtime,
        };
      });
    });

    const player = findPlayer(playerId);

    if (!player || !runtime.ready || runtime.error || runtimeMatchesPreferences(player, runtime)) {
      return;
    }

    startTransition(() => {
      dispatch({
        type: "set-player-preferences",
        playerId,
        preferences: {
          muted: runtime.muted,
          paused: runtime.paused,
          volume: getRuntimePreferenceVolume(player, runtime),
          quality: getRuntimePreferenceQuality(player, runtime),
        },
      });
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

  const activeChatPlayer =
    viewerState.players.find(
      (player) => player.id === viewerState.selectedChatPlayerId,
    ) ??
    viewerState.players.find(
      (player) => player.id === viewerState.defaultChatPlayerId,
    ) ??
    viewerState.players[0] ??
    null;
  const visiblePlayers = viewerState.players.filter(
    (player) => !player.preferences.hidden,
  );

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

  function selectPlayer(playerId: string) {
    dispatch({
      type: "select-player",
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
    const volume =
      typeof runtime?.volume === "number" && Number.isFinite(runtime.volume)
        ? runtime.volume
        : player.preferences.volume;

    return {
      muted: runtime?.muted ?? player.preferences.muted,
      paused: runtime?.paused ?? player.preferences.paused,
      volume,
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
    controllersRef.current[playerId]?.setVolume(volume);

    startTransition(() => {
      dispatch({
        type: "set-player-preferences",
        playerId,
        preferences: {
          volume,
        },
      });
    });
  }

  function toggleHidden(playerId: string) {
    const player = findPlayer(playerId);

    if (!player) {
      return;
    }

    dispatch({
      type: "set-player-preferences",
      playerId,
      preferences: {
        hidden: !player.preferences.hidden,
      },
    });
  }

  function reloadPlayers(playerIds: string[]) {
    bumpReloadTokens(playerIds);
  }

  return (
    <>
      <div className={styles.viewerShell}>
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
              {visiblePlayers.map((player) => (
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
                  onSelect={selectPlayer}
                  player={player}
                  reloadToken={reloadTokens[player.id] ?? 0}
                  selected={player.id === viewerState.selectedPlayerId}
                  snapToGrid={viewerState.settings.snapToGrid}
                  zIndex={getPlayerZIndex(
                    player.layout.zIndex,
                    viewerState.players.length,
                    viewerState.settings.streamStackOrder,
                  )}
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
              ) : visiblePlayers.length === 0 ? (
                <div className={styles.canvasEmptyState}>
                  <p className={styles.eyebrow}>Canvas hidden</p>
                  <h2>All player windows are hidden.</h2>
                  <p>Use Player Controls to show a stream again without removing it.</p>
                </div>
              ) : null}
            </div>
          </section>

          <aside className={styles.viewerSidebar}>
            <div className={styles.sidebarActions}>
              <button onClick={() => setSettingsOpen(true)} type="button">
                Add Streams
              </button>
              <button
                aria-label="Open settings"
                className={styles.sidebarIconButton}
                onClick={() => setSettingsOpen(true)}
                title="Settings"
                type="button"
              >
                <CogIcon />
              </button>
            </div>

            <PlayerControlsPanel
              onToggleHidden={toggleHidden}
              onReload={(playerId) => reloadPlayers([playerId])}
              onSelect={selectPlayer}
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
