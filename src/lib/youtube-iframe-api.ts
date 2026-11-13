export type YouTubePlayerInstance = {
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  playVideo(): void;
  pauseVideo(): void;
  getPlayerState(): number;
  destroy(): void;
};

type YouTubePlayerReadyEvent = { target: YouTubePlayerInstance };

type YouTubePlayerOptions = {
  events: {
    onReady(event: YouTubePlayerReadyEvent): void;
    onAutoplayBlocked(event: YouTubePlayerReadyEvent): void;
  };
};

export type YouTubeIframeApi = {
  Player: new (
    iframe: HTMLIFrameElement,
    options: YouTubePlayerOptions,
  ) => YouTubePlayerInstance;
};

declare global {
  interface Window {
    YT?: YouTubeIframeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeIframeApi> | null = null;

export function loadYouTubeIframeApi() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise<YouTubeIframeApi>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error("O controle de áudio do YouTube não ficou disponível."));
      }, 15_000);

      const onReady = () => {
        window.clearTimeout(timeoutId);
        if (window.YT?.Player) {
          resolve(window.YT);
        } else {
          reject(new Error("A API do YouTube não está disponível."));
        }
      };

      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        onReady();
      };

      let script = document.querySelector<HTMLScriptElement>(
        'script[src="https://www.youtube.com/iframe_api"]',
      );
      if (script) {
        script.addEventListener(
          "error",
          () => {
            window.clearTimeout(timeoutId);
            reject(new Error("Não foi possível carregar a API do YouTube."));
          },
          { once: true },
        );
      } else {
        script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        script.addEventListener(
          "error",
          () => {
            window.clearTimeout(timeoutId);
            reject(new Error("Não foi possível carregar a API do YouTube."));
          },
          { once: true },
        );
        document.head.append(script);
      }
    }).catch((error: unknown) => {
      youtubeApiPromise = null;
      throw error;
    });
  }

  return youtubeApiPromise;
}
