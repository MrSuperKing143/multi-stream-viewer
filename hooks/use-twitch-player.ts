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
  parentDomains: string[];
  preferences: PlayerPreferences;
  reloadToken: number;
  onStateChange?: (state: PlayerRuntimeState) => void;
  onControllerChange?: (controller: TwitchPlayerController | null) => void;
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
  parentDomains,
  preferences,
  reloadToken,
  onStateChange,
  onControllerChange,
}: UseTwitchPlayerArgs) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<TwitchEmbed.PlayerInstance | null>(null);
  const pollRef = useRef<number | null>(null);
  const preferencesRef = useRef(preferences);
  const [status, setStatus] = useState<PlayerRuntimeState>({
    ready: false,
    loading: true,
    muted: preferences.muted,
    volume: preferences.volume,
    paused: preferences.paused,
    error: null,
  });

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  const publishState = useEffectEvent((nextState: PlayerRuntimeState) => {
    startTransition(() => {
      setStatus(nextState);
    });

    onStateChange?.(nextState);
  });

  const publishController = useEffectEvent(
    (controller: TwitchPlayerController | null) => {
      onControllerChange?.(controller);
    },
  );

  const syncFromPlayer = useEffectEvent(() => {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    const nextState: PlayerRuntimeState = {
      ready: true,
      loading: false,
      muted: preferences.muted,
      volume: preferences.volume,
      paused: preferences.paused,
      error: null,
    };

    try {
      nextState.muted = player.getMuted();
      nextState.volume = player.getVolume();
      nextState.paused = player.isPaused?.() ?? preferences.paused;
    } catch {
      // Keep the last requested values if Twitch does not expose fresh state yet.
    }

    publishState(nextState);
  });

  useEffect(() => {
    const player = playerRef.current;

    if (!player || !status.ready) {
      return;
    }

    safeRun(() => player.setMuted(preferences.muted));
    safeRun(() => player.setVolume(preferences.volume));

    if (preferences.paused) {
      safeRun(() => player.pause?.());
    } else {
      safeRun(() => player.play?.());
    }

    const timer = window.setTimeout(syncFromPlayer, 140);
    return () => window.clearTimeout(timer);
  }, [
    preferences.muted,
    preferences.paused,
    preferences.volume,
    status.ready,
  ]);

  useEffect(() => {
    let cancelled = false;
    let detachListeners: Array<() => void> = [];
    let initializeTimer: number | null = null;
    const initialPreferences = preferencesRef.current;

    if (!hostRef.current) {
      return;
    }

    hostRef.current.innerHTML = "";
    publishState({
      ready: false,
      loading: true,
      muted: initialPreferences.muted,
      volume: initialPreferences.volume,
      paused: initialPreferences.paused,
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

    const resolvedParents = resolveParentDomains(parentDomains);

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
            safeRun(() => playerRef.current?.play?.());
            window.setTimeout(syncFromPlayer, 120);
          },
          pause: () => {
            safeRun(() => playerRef.current?.pause?.());
            window.setTimeout(syncFromPlayer, 120);
          },
          setMuted: (muted) => {
            safeRun(() => playerRef.current?.setMuted(muted));
            window.setTimeout(syncFromPlayer, 120);
          },
          setVolume: (volume) => {
            safeRun(() => playerRef.current?.setVolume(volume));
            window.setTimeout(syncFromPlayer, 120);
          },
          sync: syncFromPlayer,
        };

        publishController(controller);

        const attachListener = (eventName: string | undefined) => {
          if (!eventName || !player.addEventListener) {
            return undefined;
          }

          const listener = () => syncFromPlayer();
          player.addEventListener(eventName, listener);
          return () => player.removeEventListener?.(eventName, listener);
        };

        detachListeners = [
          attachListener(Twitch.Player.READY ?? "ready"),
          attachListener(Twitch.Player.PLAY ?? "play"),
          attachListener(Twitch.Player.PAUSE ?? "pause"),
          attachListener(Twitch.Player.ENDED ?? "ended"),
          attachListener(Twitch.Player.ONLINE ?? "online"),
          attachListener(Twitch.Player.OFFLINE ?? "offline"),
        ].filter((listener): listener is () => void => Boolean(listener));

        initializeTimer = window.setTimeout(() => {
          if (cancelled) {
            return;
          }

          safeRun(() => player.setMuted(initialPreferences.muted));
          safeRun(() => player.setVolume(initialPreferences.volume));

          if (initialPreferences.paused) {
            safeRun(() => player.pause?.());
          }

          syncFromPlayer();
        }, 500);

        pollRef.current = window.setInterval(syncFromPlayer, 1500);
      })
      .catch((error: unknown) => {
        publishState({
          ready: false,
          loading: false,
          muted: initialPreferences.muted,
          volume: initialPreferences.volume,
          paused: initialPreferences.paused,
          error:
            error instanceof Error
              ? error.message
              : "Failed to initialize the Twitch player.",
        });
      });

    return () => {
      cancelled = true;
      publishController(null);

      if (initializeTimer) {
        window.clearTimeout(initializeTimer);
      }

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
    parentDomains,
    reloadToken,
  ]);

  return {
    hostRef,
    status,
  };
}
