"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import {
  readLocalChannelLibrary,
  recordLocalChannelVisit,
  subscribeToLocalChannelLibrary,
  toggleLocalChannelFavorite,
  writeLocalChannelLibrary,
} from "@/lib/local-channel-library";

export function ChannelLocalActions({ channelId }: { channelId: string }) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const updateFavoriteState = () => {
      setIsFavorite(readLocalChannelLibrary().favorites.includes(channelId));
    };
    updateFavoriteState();
    writeLocalChannelLibrary(
      recordLocalChannelVisit(readLocalChannelLibrary(), channelId),
    );
    return subscribeToLocalChannelLibrary(updateFavoriteState);
  }, [channelId]);

  function toggleFavorite() {
    const next = toggleLocalChannelFavorite(readLocalChannelLibrary(), channelId);
    writeLocalChannelLibrary(next);
    setIsFavorite(next.favorites.includes(channelId));
  }

  return (
    <button
      aria-pressed={isFavorite}
      className="secondary-button channel-local-action"
      onClick={toggleFavorite}
      type="button"
    >
      <Heart aria-hidden="true" fill={isFavorite ? "currentColor" : "none"} size={18} />
      {isFavorite ? "Remover dos favoritos" : "Favoritar"}
    </button>
  );
}
