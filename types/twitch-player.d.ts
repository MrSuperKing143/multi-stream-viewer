declare global {
  interface Window {
    Twitch?: TwitchEmbed.Namespace;
  }

  namespace TwitchEmbed {
    interface PlayerOptions {
      width?: string | number;
      height?: string | number;
      channel?: string;
      video?: string;
      collection?: string;
      layout?: "video" | "chat";
      autoplay?: boolean;
      muted?: boolean;
      parent: string[];
    }

    interface PlayerInstance {
      play?: () => void;
      pause?: () => void;
      setChannel?: (channel: string) => void;
      setMuted: (muted: boolean) => void;
      getMuted: () => boolean;
      setVolume: (volume: number) => void;
      getVolume: () => number;
      setQuality?: (quality: string) => void;
      getQuality?: () => string;
      isPaused?: () => boolean;
      destroy?: () => void;
      addEventListener?: (event: string, callback: () => void) => void;
      removeEventListener?: (event: string, callback: () => void) => void;
    }

    interface PlayerConstructor {
      new (
        element: string | HTMLElement,
        options: PlayerOptions,
      ): PlayerInstance;
      READY?: string;
      PLAY?: string;
      PAUSE?: string;
      ENDED?: string;
      ONLINE?: string;
      OFFLINE?: string;
    }

    interface Namespace {
      Player: PlayerConstructor;
    }
  }
}

export {};
