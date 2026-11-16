"use client";

import { useState, useSyncExternalStore } from "react";
import { Shield } from "lucide-react";

const failedShieldUrls = new Set<string>();
const subscribeToHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

function safeShieldUrl(value: string | null) {
  if (!value) return null;
  const candidate = value.trim();
  if (!candidate || /[\\\s]/.test(candidate)) return null;
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && !url.username && !url.password
      ? candidate
      : null;
  } catch {
    return null;
  }
}

export function TeamCrest({
  shieldUrl,
  className = "",
}: {
  shieldUrl: string | null;
  className?: string;
}) {
  const src = safeShieldUrl(shieldUrl);
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const markAsFailed = () => {
    if (src) failedShieldUrls.add(src);
    setFailedSource(src);
  };

  if (!src || !hydrated || failedSource === src || failedShieldUrls.has(src)) {
    return (
      <span aria-hidden="true" className={`team-crest team-crest--fallback ${className}`}>
        <Shield size="58%" strokeWidth={1.8} />
      </span>
    );
  }

  // Shields are administrator-managed remote assets, so they bypass Next's fixed remote-host allowlist.
  /* eslint-disable @next/next/no-img-element */
  return (
    <span aria-hidden="true" className={"team-crest " + className}>
      <img
        alt=""
        onError={markAsFailed}
        onErrorCapture={markAsFailed}
        src={src}
      />
    </span>
  );
  /* eslint-enable @next/next/no-img-element */
}
