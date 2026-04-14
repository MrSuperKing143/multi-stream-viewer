import type {
  PlayerLayout,
  ViewerPersistedState,
  ViewerPlayer,
  ViewerSettings,
} from "@/types/viewer";

export const TWITCH_MIN_PLAYER_SIZE = {
  width: 400,
  height: 300,
};

export const DEFAULT_PLAYER_SIZE = {
  width: 480,
  height: 300,
};

export const DEFAULT_VIEWER_SETTINGS: ViewerSettings = {
  snapToGrid: false,
  gridSize: 24,
  showGrid: true,
  streamStackOrder: "bottom-above-top",
};

export const DEFAULT_RUNTIME_STATUS = {
  ready: false,
  loading: true,
  muted: true,
  volume: 0.2,
  paused: false,
  quality: "",
  error: null,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeQuality(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function createPlayerId() {
  return `stream-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeChannelInput(value: string) {
  const trimmed = value
    .trim()
    .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "")
    .replace(/^@/, "")
    .replace(/\/$/, "");

  const channel = trimmed.split(/[/?#]/)[0] ?? "";

  if (!/^[a-zA-Z0-9_]{3,25}$/.test(channel)) {
    return null;
  }

  return channel.toLowerCase();
}

function createPlayerLayout(index: number): PlayerLayout {
  const offset = (index % 6) * 36;
  return {
    x: 32 + offset,
    y: 32 + offset,
    width: DEFAULT_PLAYER_SIZE.width,
    height: DEFAULT_PLAYER_SIZE.height,
    zIndex: index + 1,
  };
}

function createViewerPlayer(channel: string, index: number): ViewerPlayer {
  return {
    id: createPlayerId(),
    channel,
    layout: createPlayerLayout(index),
    preferences: {
      muted: false,
      volume: 0.1,
      paused: false,
      hidden: false,
      quality: "",
    },
  };
}

function nextPlayerOrder(players: ViewerPlayer[]) {
  return players.reduce((max, player) => Math.max(max, player.layout.zIndex), 0) + 1;
}

function normalizePlayerOrder(players: ViewerPlayer[]) {
  const orderById = new Map(
    [...players]
      .sort((left, right) => {
        const orderDelta = left.layout.zIndex - right.layout.zIndex;
        if (orderDelta !== 0) {
          return orderDelta;
        }

        return left.channel.localeCompare(right.channel);
      })
      .map((player, index) => [player.id, index + 1]),
  );

  return players.map((player) => ({
    ...player,
    layout: {
      ...player.layout,
      zIndex: orderById.get(player.id) ?? player.layout.zIndex,
    },
  }));
}

function cleanLayout(value: Partial<PlayerLayout> | undefined, fallback: PlayerLayout): PlayerLayout {
  const nextWidth = Number(value?.width ?? fallback.width);
  const nextHeight = Number(value?.height ?? fallback.height);
  const nextZIndex = Number(value?.zIndex ?? fallback.zIndex);

  return {
    x: clamp(Number(value?.x ?? fallback.x), 0, 9999),
    y: clamp(Number(value?.y ?? fallback.y), 0, 9999),
    width:
      Number.isFinite(nextWidth) && nextWidth >= TWITCH_MIN_PLAYER_SIZE.width
        ? nextWidth
        : fallback.width,
    height:
      Number.isFinite(nextHeight) && nextHeight >= TWITCH_MIN_PLAYER_SIZE.height
        ? nextHeight
        : fallback.height,
    zIndex:
      Number.isFinite(nextZIndex) && nextZIndex >= 1 ? Math.floor(nextZIndex) : fallback.zIndex,
  };
}

export function createDefaultViewerState(): ViewerPersistedState {
  return {
    players: [],
    selectedPlayerId: null,
    selectedChatPlayerId: null,
    defaultChatPlayerId: null,
    activeAudioPlayerId: null,
    settings: { ...DEFAULT_VIEWER_SETTINGS },
  };
}

export function sanitizeViewerState(input: unknown): ViewerPersistedState | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const value = input as Partial<ViewerPersistedState>;
  const safePlayers = Array.isArray(value.players)
    ? value.players
        .map((player, index) => {
          if (!player || typeof player !== "object") {
            return null;
          }

          const fallbackLayout = createPlayerLayout(index);
          const channel = normalizeChannelInput(String(player.channel ?? ""));

          if (!channel) {
            return null;
          }

          return {
            id:
              typeof player.id === "string" && player.id.trim().length > 0
                ? player.id
                : createPlayerId(),
            channel,
            layout: cleanLayout(player.layout, fallbackLayout),
            preferences: {
              muted: Boolean(player.preferences?.muted ?? index !== 0),
              volume: clamp(
                Number(player.preferences?.volume ?? (index === 0 ? 0.85 : 0.35)),
                0,
                1,
              ),
              paused: Boolean(player.preferences?.paused),
              hidden: Boolean(player.preferences?.hidden),
              quality: normalizeQuality(player.preferences?.quality),
            },
          } satisfies ViewerPlayer;
        })
        .filter((player): player is ViewerPlayer => Boolean(player))
    : [];
  const orderedPlayers = normalizePlayerOrder(safePlayers);

  const safeSettings = {
    snapToGrid: Boolean(value.settings?.snapToGrid),
    gridSize: clamp(Number(value.settings?.gridSize ?? DEFAULT_VIEWER_SETTINGS.gridSize), 8, 96),
    showGrid:
      value.settings?.showGrid === undefined
        ? DEFAULT_VIEWER_SETTINGS.showGrid
        : Boolean(value.settings.showGrid),
    streamStackOrder:
      value.settings?.streamStackOrder === "top-above-bottom"
        ? "top-above-bottom"
        : DEFAULT_VIEWER_SETTINGS.streamStackOrder,
  };

  const ids = new Set(safePlayers.map((player) => player.id));
  const firstId = orderedPlayers[0]?.id ?? null;

  const resolveId = (candidate: string | null | undefined) =>
    candidate && ids.has(candidate) ? candidate : firstId;

  return {
    players: orderedPlayers,
    selectedPlayerId: resolveId(value.selectedPlayerId),
    selectedChatPlayerId: resolveId(value.selectedChatPlayerId),
    defaultChatPlayerId: resolveId(value.defaultChatPlayerId),
    activeAudioPlayerId: resolveId(value.activeAudioPlayerId),
    settings: safeSettings,
  };
}

export type ViewerAction =
  | { type: "hydrate"; state: ViewerPersistedState }
  | { type: "add-players"; channels: string[] }
  | { type: "remove-player"; playerId: string }
  | { type: "reorder-player"; playerId: string; direction: -1 | 1 }
  | { type: "update-layout"; playerId: string; layout: Partial<PlayerLayout> }
  | { type: "select-player"; playerId: string | null }
  | { type: "set-chat-player"; playerId: string | null }
  | { type: "cycle-chat"; direction: -1 | 1 }
  | { type: "set-default-chat-player"; playerId: string | null }
  | { type: "set-active-audio-player"; playerId: string | null }
  | {
      type: "set-player-preferences";
      playerId: string;
      preferences: Partial<ViewerPlayer["preferences"]>;
    }
  | { type: "mute-all" }
  | { type: "pause-all" }
  | { type: "play-selected" }
  | { type: "unmute-selected" }
  | { type: "solo-selected" }
  | { type: "sync-chat-to-selected" }
  | { type: "update-settings"; settings: Partial<ViewerSettings> }
  | { type: "reset-layout" };

function selectFallbackPlayerId(players: ViewerPlayer[], preferredId?: string | null) {
  if (preferredId && players.some((player) => player.id === preferredId)) {
    return preferredId;
  }

  return players[0]?.id ?? null;
}

export function viewerReducer(
  state: ViewerPersistedState,
  action: ViewerAction,
): ViewerPersistedState {
  switch (action.type) {
    case "hydrate":
      return action.state;

    case "add-players": {
      const nextPlayers = [...state.players];
      let nextSelectedId = state.selectedPlayerId;
      let nextChatId = state.selectedChatPlayerId;
      let nextDefaultChatId = state.defaultChatPlayerId;
      let nextActiveAudioId = state.activeAudioPlayerId;

      action.channels.forEach((rawChannel) => {
        const channel = normalizeChannelInput(rawChannel);

        if (!channel) {
          return;
        }

        const existingPlayer = nextPlayers.find((player) => player.channel === channel);

        if (existingPlayer) {
          nextSelectedId = existingPlayer.id;
          return;
        }

        const player = createViewerPlayer(channel, nextPlayers.length);
        player.layout.zIndex = nextPlayerOrder(nextPlayers);
        nextPlayers.push(player);
        nextSelectedId = player.id;

        if (!nextChatId) {
          nextChatId = player.id;
        }

        if (!nextDefaultChatId) {
          nextDefaultChatId = player.id;
        }

        if (!nextActiveAudioId) {
          nextActiveAudioId = player.id;
        }
      });

      return {
        ...state,
        players: nextPlayers,
        selectedPlayerId: nextSelectedId,
        selectedChatPlayerId: nextChatId,
        defaultChatPlayerId: nextDefaultChatId,
        activeAudioPlayerId: nextActiveAudioId,
      };
    }

    case "remove-player": {
      const nextPlayers = normalizePlayerOrder(
        state.players.filter((player) => player.id !== action.playerId),
      );
      const fallbackId = nextPlayers[0]?.id ?? null;

      return {
        ...state,
        players: nextPlayers,
        selectedPlayerId: selectFallbackPlayerId(nextPlayers, state.selectedPlayerId === action.playerId ? fallbackId : state.selectedPlayerId),
        selectedChatPlayerId: selectFallbackPlayerId(nextPlayers, state.selectedChatPlayerId === action.playerId ? state.defaultChatPlayerId : state.selectedChatPlayerId),
        defaultChatPlayerId: selectFallbackPlayerId(nextPlayers, state.defaultChatPlayerId === action.playerId ? fallbackId : state.defaultChatPlayerId),
        activeAudioPlayerId: selectFallbackPlayerId(nextPlayers, state.activeAudioPlayerId === action.playerId ? fallbackId : state.activeAudioPlayerId),
      };
    }

    case "reorder-player": {
      const orderedPlayers = [...state.players].sort(
        (left, right) => left.layout.zIndex - right.layout.zIndex,
      );
      const index = orderedPlayers.findIndex((player) => player.id === action.playerId);
      const targetIndex = index + action.direction;

      if (index < 0 || targetIndex < 0 || targetIndex >= orderedPlayers.length) {
        return state;
      }

      const currentPlayer = orderedPlayers[index];
      const targetPlayer = orderedPlayers[targetIndex];

      if (!currentPlayer || !targetPlayer) {
        return state;
      }

      return {
        ...state,
        players: state.players.map((player) => {
          if (player.id === currentPlayer.id) {
            return {
              ...player,
              layout: {
                ...player.layout,
                zIndex: targetPlayer.layout.zIndex,
              },
            };
          }

          if (player.id === targetPlayer.id) {
            return {
              ...player,
              layout: {
                ...player.layout,
                zIndex: currentPlayer.layout.zIndex,
              },
            };
          }

          return player;
        }),
      };
    }

    case "update-layout":
      return {
        ...state,
        players: state.players.map((player) =>
          player.id === action.playerId
            ? {
                ...player,
                layout: cleanLayout(
                  { ...player.layout, ...action.layout },
                  player.layout,
                ),
              }
            : player,
        ),
      };

    case "select-player":
      return {
        ...state,
        selectedPlayerId: selectFallbackPlayerId(state.players, action.playerId),
      };

    case "set-chat-player":
      return {
        ...state,
        selectedChatPlayerId: selectFallbackPlayerId(state.players, action.playerId),
      };

    case "cycle-chat": {
      if (state.players.length === 0) {
        return state;
      }

      const currentIndex = state.players.findIndex(
        (player) => player.id === state.selectedChatPlayerId,
      );
      const nextIndex =
        currentIndex >= 0
          ? (currentIndex + action.direction + state.players.length) % state.players.length
          : 0;

      return {
        ...state,
        selectedChatPlayerId: state.players[nextIndex]?.id ?? null,
      };
    }

    case "set-default-chat-player":
      return {
        ...state,
        defaultChatPlayerId: selectFallbackPlayerId(state.players, action.playerId),
      };

    case "set-active-audio-player":
      return {
        ...state,
        activeAudioPlayerId: selectFallbackPlayerId(state.players, action.playerId),
        players: state.players.map((player) =>
          player.id === action.playerId
            ? {
                ...player,
                preferences: {
                  ...player.preferences,
                  muted: false,
                },
              }
            : player,
        ),
      };

    case "set-player-preferences":
      {
        let changed = false;

        const nextPlayers = state.players.map((player) => {
          if (player.id !== action.playerId) {
            return player;
          }

          const nextPreferences = {
            ...player.preferences,
            ...action.preferences,
            volume:
              action.preferences.volume === undefined
                ? player.preferences.volume
                : clamp(action.preferences.volume, 0, 1),
            quality:
              action.preferences.quality === undefined
                ? player.preferences.quality
                : normalizeQuality(action.preferences.quality),
          };

          if (
            player.preferences.muted === nextPreferences.muted &&
            player.preferences.volume === nextPreferences.volume &&
            player.preferences.paused === nextPreferences.paused &&
            player.preferences.hidden === nextPreferences.hidden &&
            player.preferences.quality === nextPreferences.quality
          ) {
            return player;
          }

          changed = true;

          return {
            ...player,
            preferences: nextPreferences,
          };
        });

        return changed
          ? {
              ...state,
              players: nextPlayers,
            }
          : state;
      }

    case "mute-all":
      return {
        ...state,
        players: state.players.map((player) => ({
          ...player,
          preferences: {
            ...player.preferences,
            muted: true,
          },
        })),
      };

    case "pause-all":
      return {
        ...state,
        players: state.players.map((player) => ({
          ...player,
          preferences: {
            ...player.preferences,
            paused: true,
          },
        })),
      };

    case "play-selected":
      return {
        ...state,
        players: state.players.map((player) =>
          player.id === state.selectedPlayerId
            ? {
                ...player,
                preferences: {
                  ...player.preferences,
                  paused: false,
                },
              }
            : player,
        ),
      };

    case "unmute-selected":
      return {
        ...state,
        activeAudioPlayerId: state.selectedPlayerId ?? state.activeAudioPlayerId,
        players: state.players.map((player) =>
          player.id === state.selectedPlayerId
            ? {
                ...player,
                preferences: {
                  ...player.preferences,
                  muted: false,
                },
              }
            : player,
        ),
      };

    case "solo-selected":
      return {
        ...state,
        activeAudioPlayerId: state.selectedPlayerId,
        players: state.players.map((player) => ({
          ...player,
          preferences: {
            ...player.preferences,
            muted: player.id !== state.selectedPlayerId,
            paused:
              player.id === state.selectedPlayerId
                ? false
                : player.preferences.paused,
          },
        })),
      };

    case "sync-chat-to-selected":
      return {
        ...state,
        selectedChatPlayerId: selectFallbackPlayerId(
          state.players,
          state.selectedPlayerId,
        ),
      };

    case "update-settings":
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.settings,
          gridSize:
            action.settings.gridSize === undefined
              ? state.settings.gridSize
              : clamp(action.settings.gridSize, 8, 96),
        },
      };

    case "reset-layout":
      return {
        ...state,
        players: state.players.map((player, index) => ({
          ...player,
          layout: {
            ...createPlayerLayout(index),
            zIndex: player.layout.zIndex,
          },
        })),
      };

    default:
      return state;
  }
}
