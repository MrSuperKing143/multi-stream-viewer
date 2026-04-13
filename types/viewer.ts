export interface PlayerLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface PlayerPreferences {
  muted: boolean;
  volume: number;
  paused: boolean;
}

export interface ViewerPlayer {
  id: string;
  channel: string;
  layout: PlayerLayout;
  preferences: PlayerPreferences;
}

export interface ViewerSettings {
  snapToGrid: boolean;
  gridSize: number;
  showGrid: boolean;
  streamStackOrder: "bottom-above-top" | "top-above-bottom";
}

export interface ViewerPersistedState {
  players: ViewerPlayer[];
  selectedPlayerId: string | null;
  selectedChatPlayerId: string | null;
  defaultChatPlayerId: string | null;
  activeAudioPlayerId: string | null;
  settings: ViewerSettings;
}

export interface PlayerRuntimeState {
  ready: boolean;
  loading: boolean;
  muted: boolean;
  volume: number;
  paused: boolean;
  error: string | null;
}

export interface TwitchPlayerController {
  play: () => void;
  pause: () => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  sync: () => void;
}

export interface ResolvedPlayerState {
  muted: boolean;
  paused: boolean;
  volume: number;
  ready: boolean;
  loading: boolean;
  error: string | null;
}
