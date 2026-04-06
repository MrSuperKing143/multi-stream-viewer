import { TWITCH_EMBED_SCRIPT_SRC } from "@/lib/twitch-config";

let twitchScriptPromise: Promise<TwitchEmbed.Namespace> | null = null;

function resolveLoadedTwitch() {
  if (!window.Twitch?.Player) {
    throw new Error("The Twitch embed script loaded, but window.Twitch.Player is unavailable.");
  }

  return window.Twitch;
}

export function loadTwitchEmbedScript() {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Twitch embeds can only be created in the browser."),
    );
  }

  if (window.Twitch?.Player) {
    return Promise.resolve(window.Twitch);
  }

  if (twitchScriptPromise) {
    return twitchScriptPromise;
  }

  twitchScriptPromise = new Promise<TwitchEmbed.Namespace>((resolve, reject) => {
    const complete = () => {
      try {
        resolve(resolveLoadedTwitch());
      } catch (error) {
        twitchScriptPromise = null;
        reject(error);
      }
    };

    const fail = () => {
      twitchScriptPromise = null;
      reject(new Error("Failed to load the Twitch embed script."));
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${TWITCH_EMBED_SCRIPT_SRC}"]`,
    );

    if (existingScript) {
      if (window.Twitch?.Player) {
        complete();
        return;
      }

      existingScript.addEventListener("load", complete, { once: true });
      existingScript.addEventListener("error", fail, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = TWITCH_EMBED_SCRIPT_SRC;
    script.async = true;
    script.onload = complete;
    script.onerror = fail;
    document.head.appendChild(script);
  });

  return twitchScriptPromise;
}
