"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ALLOWED_EXTERNAL_LINK_ATTRIBUTE = "data-canalmix-allow-external";
const PLAYER_SURFACE_SELECTOR = ".channel-player, .tv-iptv, .public-game-schedule";
const PLAYER_IFRAME_SELECTOR =
  ".channel-player__frame, .public-game-row__youtube-frame";

function resolveUrl(value: string, baseUrl: string) {
  try {
    return new URL(value, baseUrl);
  } catch {
    return null;
  }
}

function isHttpUrl(url: URL | null): url is URL {
  return url !== null && (url.protocol === "http:" || url.protocol === "https:");
}

function isSameOriginUrl(value: string, baseUrl: string) {
  const url = resolveUrl(value, baseUrl);
  return isHttpUrl(url) && url.origin === window.location.origin;
}

function getAnchor(target: EventTarget | null) {
  return target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;
}

function getEffectiveTarget(target: string) {
  return (target || document.querySelector<HTMLBaseElement>("base[target]")?.target || "_self")
    .trim()
    .toLowerCase();
}

function blockEvent(event: Event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}

function isExplicitExternalLink(anchor: HTMLAnchorElement, event: Event) {
  return (
    event.isTrusted &&
    anchor.hasAttribute(ALLOWED_EXTERNAL_LINK_ATTRIBUTE) &&
    anchor.target.toLowerCase() === "_blank" &&
    anchor.relList.contains("noopener")
  );
}

function removeUnexpectedRefresh(meta: HTMLMetaElement) {
  if (meta.httpEquiv.toLowerCase() !== "refresh") return;

  const target = meta.content.match(/(?:^|;)\s*url\s*=\s*["']?([^"']+?)["']?\s*$/i)?.[1]?.trim();
  if (!target) return;

  const url = resolveUrl(target, window.location.href);
  if (!isHttpUrl(url) || url.origin !== window.location.origin) {
    meta.remove();
  }
}

export function CanalMixPlayerProtection() {
  const pathname = usePathname();

  useEffect(() => {
    if (!document.querySelector(PLAYER_SURFACE_SELECTOR)) return;

    const originalWindowOpen = window.open;
    let explicitPopupAction = false;

    const guardedWindowOpen: typeof window.open = function (
      this: Window,
      url,
      target,
      features,
    ) {
      const activeElement = document.activeElement;

      // Calls made while a provider's iframe is active remain under provider control.
      if (
        activeElement instanceof HTMLIFrameElement &&
        activeElement.matches(PLAYER_IFRAME_SELECTOR)
      ) {
        return Reflect.apply(originalWindowOpen, this, [url, target, features]) as WindowProxy | null;
      }

      if (
        explicitPopupAction &&
        (navigator.userActivation?.isActive ?? true)
      ) {
        return Reflect.apply(originalWindowOpen, this, [url, target, features]) as WindowProxy | null;
      }

      return null;
    };

    const originalFormSubmit = HTMLFormElement.prototype.submit;
    const guardedFormSubmit: typeof HTMLFormElement.prototype.submit = function (
      this: HTMLFormElement,
    ) {
      if (
        !isSameOriginUrl(this.action || window.location.href, window.location.href) ||
        getEffectiveTarget(this.target) !== "_self"
      ) {
        return;
      }

      return Reflect.apply(originalFormSubmit, this, []);
    };

    function handleAnchorNavigation(event: Event) {
      const anchor = getAnchor(event.target);
      if (!anchor) return;

      const url = resolveUrl(anchor.href, window.location.href);
      if (url && (url.protocol === "mailto:" || url.protocol === "tel:")) {
        if (event.isTrusted) return;
        blockEvent(event);
        return;
      }

      if (!isHttpUrl(url)) {
        blockEvent(event);
        return;
      }

      if (url.origin !== window.location.origin) {
        if (isExplicitExternalLink(anchor, event)) return;
        blockEvent(event);
        return;
      }

      if (getEffectiveTarget(anchor.target) !== "_self" && !event.isTrusted) {
        blockEvent(event);
      }
    }

    function handleExplicitPopupIntent(event: Event) {
      const target = event.target;
      const control = target instanceof Element
        ? target.closest<HTMLElement>("[data-canalmix-allow-popup]")
        : null;
      if (!event.isTrusted || !control) return;

      explicitPopupAction = true;
      queueMicrotask(() => {
        explicitPopupAction = false;
      });
    }

    function handleFormSubmit(event: Event) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      const submitter = (event as SubmitEvent).submitter;
      const action =
        submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement
          ? submitter.formAction || form.action
          : form.action;

      if (!isSameOriginUrl(action || window.location.href, window.location.href)) {
        blockEvent(event);
        return;
      }

      const target =
        submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement
          ? submitter.formTarget || form.target
          : form.target;
      if (getEffectiveTarget(target) !== "_self" && !event.isTrusted) {
        blockEvent(event);
      }
    }

    function scanRefreshMeta(node: Node) {
      if (node instanceof HTMLMetaElement) {
        removeUnexpectedRefresh(node);
        return;
      }

      if (node instanceof Element) {
        node.querySelectorAll<HTMLMetaElement>('meta[http-equiv="refresh" i]').forEach(removeUnexpectedRefresh);
      }
    }

    window.open = guardedWindowOpen;
    HTMLFormElement.prototype.submit = guardedFormSubmit;

    document.addEventListener("click", handleAnchorNavigation, true);
    document.addEventListener("click", handleExplicitPopupIntent, true);
    document.addEventListener("auxclick", handleAnchorNavigation, true);
    document.addEventListener("auxclick", handleExplicitPopupIntent, true);
    document.addEventListener("submit", handleFormSubmit, true);

    document.head.querySelectorAll<HTMLMetaElement>('meta[http-equiv="refresh" i]').forEach(removeUnexpectedRefresh);
    const refreshObserver = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes") {
          scanRefreshMeta(record.target);
          continue;
        }
        record.addedNodes.forEach(scanRefreshMeta);
      }
    });
    refreshObserver.observe(document.head, {
      attributes: true,
      attributeFilter: ["content", "http-equiv"],
      childList: true,
      subtree: true,
    });

    return () => {
      if (window.open === guardedWindowOpen) window.open = originalWindowOpen;
      if (HTMLFormElement.prototype.submit === guardedFormSubmit) {
        HTMLFormElement.prototype.submit = originalFormSubmit;
      }
      document.removeEventListener("click", handleAnchorNavigation, true);
      document.removeEventListener("click", handleExplicitPopupIntent, true);
      document.removeEventListener("auxclick", handleAnchorNavigation, true);
      document.removeEventListener("auxclick", handleExplicitPopupIntent, true);
      document.removeEventListener("submit", handleFormSubmit, true);
      refreshObserver.disconnect();
    };
  }, [pathname]);

  return null;
}
