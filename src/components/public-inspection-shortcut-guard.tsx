"use client";

import { useEffect } from "react";

const INSPECTION_SHORTCUT_KEYS = new Set(["i", "j", "c"]);

export function PublicInspectionShortcutGuard() {
  useEffect(() => {
    const isMacOS = /mac/i.test(navigator.platform);

    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const usesControlShift =
        event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey;
      const usesCommandOption =
        isMacOS && event.metaKey && event.altKey && !event.ctrlKey && !event.shiftKey;
      const isInspectionShortcut =
        event.key === "F12" || (
          INSPECTION_SHORTCUT_KEYS.has(key) && (usesControlShift || usesCommandOption)
        );

      if (isInspectionShortcut && event.cancelable) {
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  return null;
}
