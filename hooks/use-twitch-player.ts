"use client";

import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

import { resolveParentDomains } from "@/lib/twitch-config";
import { loadTwitchEmbedScript } from "@/lib/twitch-script-loader";
import type {
  PlayerPreferences,
  PlayerRuntimeState,
  TwitchPlayerController,
} from "@/types/viewer";

interface UseTwitchPlayerArgs {
  channel: string;
  preferences: PlayerPreferences;
  reloadToken: number;
  onStateChange?: (state: PlayerRuntimeState) => void;
  onControllerChange?: (controller: TwitchPlayerController | null) => void;
}

function clampVolume(volume: number) {
  if (!Number.isFinite(volume)) {
    return 0;
  }

  return Math.min(Math.max(volume, 0), 1);
}

function normalizeQuality(quality: unknown) {
  return typeof quality === "string" ? quality.trim() : "";
}

function normalizeRuntimeState(state: PlayerRuntimeState): PlayerRuntimeState {
  return {
    ...state,
    volume: Math.round(clampVolume(state.volume) * 100) / 100,
    quality: normalizeQuality(state.quality),
  };
}

function isSameRuntimeState(a: PlayerRuntimeState, b: PlayerRuntimeState) {
  return (
    a.ready === b.ready &&
    a.loading === b.loading &&
    a.muted === b.muted &&
    a.volume === b.volume &&
    a.paused === b.paused &&
    a.quality === b.quality &&
    a.error === b.error
  );
}

function safeRun(action: () => void) {
  try {
    action();
  } catch {
    // Twitch live embeds can reject some controls depending on stream state.
  }
}

export function useTwitchPlayer({
  channel,
  preferences,
  reloadToken,
  onStateChange,
  onControllerChange,
}: UseTwitchPlayerArgs) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<TwitchEmbed.PlayerInstance | null>(null);
  const pollRef = useRef<number | null>(null);
  const readyRef = useRef(false);
  const preferencesRef = useRef(preferences);
  const [status, setStatus] = useState<PlayerRuntimeState>(() =>
    normalizeRuntimeState({
      ready: false,
      loading: true,
      muted: preferences.muted,
      volume: preferences.volume,
      paused: preferences.paused,
      quality: preferences.quality,
      error: null,
    }),
  );
  const statusRef = useRef(status);

  const publishState = useEffectEvent((nextState: PlayerRuntimeState) => {
    const normalizedState = normalizeRuntimeState(nextState);

    if (isSameRuntimeState(statusRef.current, normalizedState)) {
      return;
    }

    statusRef.current = normalizedState;

    startTransition(() => {
      setStatus(normalizedState);
    });

    onStateChange?.(normalizedState);
  });

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  const publishController = useEffectEvent(
    (controller: TwitchPlayerController | null) => {
      onControllerChange?.(controller);
    },
  );

  const syncFromPlayer = useEffectEvent(() => {
    const player = playerRef.current;
    const ready = readyRef.current;

    if (!player) {
      return;
    }

    const nextState: PlayerRuntimeState = {
      ready,
      loading: !ready,
      muted: preferences.muted,
      volume: preferences.volume,
      paused: preferences.paused,
      quality: preferences.quality,
      error: null,
    };

    try {
      nextState.muted = player.getMuted();
      const volume = player.getVolume();
      nextState.volume =
        nextState.muted || !Number.isFinite(volume) ? preferences.volume : volume;
      nextState.paused = player.isPaused?.() ?? preferences.paused;
      nextState.quality =
        normalizeQuality(player.getQuality?.()) || preferences.quality;
    } catch {
      // Keep the last requested values if Twitch does not expose fresh state yet.
    }

    publishState(nextState);
  });

  useEffect(() => {
    let cancelled = false;
    let detachListeners: Array<() => void> = [];
    const initialPreferences = preferencesRef.current;

    if (!hostRef.current) {
      return;
    }

    readyRef.current = false;
    hostRef.current.innerHTML = "";
    publishState({
      ready: false,
      loading: true,
      muted: initialPreferences.muted,
      volume: initialPreferences.volume,
      paused: initialPreferences.paused,
      quality: initialPreferences.quality,
      error: null,
    });

    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (playerRef.current) {
      safeRun(() => playerRef.current?.destroy?.());
      playerRef.current = null;
    }

    publishController(null);

    const resolvedParents = resolveParentDomains();

    loadTwitchEmbedScript()
      .then((Twitch) => {
        if (cancelled || !hostRef.current) {
          return;
        }

        const player = new Twitch.Player(hostRef.current, {
          channel,
          width: "100%",
          height: "100%",
          muted: initialPreferences.muted,
          autoplay: !initialPreferences.paused,
          parent: resolvedParents,
        });

        playerRef.current = player;

        const controller: TwitchPlayerController = {
          play: () => {
            if (!readyRef.current) {
              return;
            }

            safeRun(() => playerRef.current?.play?.());
            window.setTimeout(syncFromPlayer, 120);
          },
          pause: () => {
            if (!readyRef.current) {
              return;
            }

            safeRun(() => playerRef.current?.pause?.());
            window.setTimeout(syncFromPlayer, 120);
          },
          setMuted: (muted) => {
            if (!readyRef.current) {
              return;
            }

            safeRun(() => playerRef.current?.setMuted(muted));
            window.setTimeout(syncFromPlayer, 120);
          },
          setVolume: (volume) => {
            if (!readyRef.current) {
              return;
            }

            safeRun(() => playerRef.current?.setVolume(volume));
            window.setTimeout(syncFromPlayer, 120);
          },
          setQuality: (quality) => {
            if (!readyRef.current) {
              return;
            }

            const nextQuality = normalizeQuality(quality);

            if (!nextQuality) {
              return;
            }

            safeRun(() => playerRef.current?.setQuality?.(nextQuality));
            window.setTimeout(syncFromPlayer, 120);
          },
          sync: syncFromPlayer,
        };

        publishController(controller);

        const attachListener = (
          eventName: string | undefined,
          onEvent: () => void = syncFromPlayer,
        ) => {
          if (!eventName || !player.addEventListener) {
            return undefined;
          }

          const listener = () => onEvent();
          player.addEventListener(eventName, listener);
          return () => player.removeEventListener?.(eventName, listener);
        };

        const handleReady = () => {
          if (cancelled) {
            return;
          }

          readyRef.current = true;
          const nextPreferences = preferencesRef.current;

          safeRun(() => player.setMuted(nextPreferences.muted));
          safeRun(() => player.setVolume(nextPreferences.volume));

          const nextQuality = normalizeQuality(nextPreferences.quality);

          if (nextQuality) {
            safeRun(() => player.setQuality?.(nextQuality));
          }

          if (nextPreferences.paused) {
            safeRun(() => player.pause?.());
          } else {
            safeRun(() => player.play?.());
          }

          if (pollRef.current) {
            window.clearInterval(pollRef.current);
          }

          pollRef.current = window.setInterval(syncFromPlayer, 1500);
          window.setTimeout(syncFromPlayer, 140);
        };

        detachListeners = [
          attachListener(Twitch.Player.READY ?? "ready", handleReady),
          attachListener(Twitch.Player.PLAY ?? "play"),
          attachListener(Twitch.Player.PAUSE ?? "pause"),
          attachListener(Twitch.Player.ENDED ?? "ended"),
          attachListener(Twitch.Player.ONLINE ?? "online"),
          attachListener(Twitch.Player.OFFLINE ?? "offline"),
        ].filter((listener): listener is () => void => Boolean(listener));
      })
      .catch((error: unknown) => {
        publishState({
          ready: false,
          loading: false,
          muted: initialPreferences.muted,
          volume: initialPreferences.volume,
          paused: initialPreferences.paused,
          quality: initialPreferences.quality,
          error:
            error instanceof Error
              ? error.message
              : "Failed to initialize the Twitch player.",
        });
      });

    return () => {
      cancelled = true;
      readyRef.current = false;
      publishController(null);

      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }

      detachListeners.forEach((listener) => listener());
      safeRun(() => playerRef.current?.destroy?.());
      playerRef.current = null;
    };
  }, [
    channel,
    reloadToken,
  ]);

  return {
    hostRef,
    status,
  };
}
