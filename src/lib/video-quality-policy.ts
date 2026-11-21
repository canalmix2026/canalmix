export type VideoQualityLevel = {
  bitrate: number;
  width?: number;
  height?: number;
};

export type AdaptiveQualityController = {
  autoLevelEnabled: boolean;
  currentLevel: number;
  minAutoLevel: number;
  levels: readonly VideoQualityLevel[];
  nextAutoLevel: number;
};

export const GLOBAL_VIDEO_QUALITY_POLICY = {
  preferredInitialQuality: "highest",
  allowAdaptiveFallback: true,
  capLevelToPlayerSize: false,
  respectManualSelection: true,
  applyToFuturePlayers: true,
  bufferingFallbackDelayMs: 8_000,
  bufferingFallbackCooldownMs: 15_000,
} as const;

export function getHighestBitrateLevelIndex(
  levels: readonly VideoQualityLevel[],
) {
  if (levels.length === 0) {
    return -1;
  }

  return levels.reduce((bestIndex, level, index) => {
    return level.bitrate > levels[bestIndex].bitrate ? index : bestIndex;
  }, 0);
}

export function getAdaptiveFallbackLevelIndex(
  levels: readonly VideoQualityLevel[],
  currentLevelIndex: number,
  minimumLevelIndex: number,
) {
  const currentLevel = levels[currentLevelIndex];
  if (!currentLevel) {
    return null;
  }

  let fallbackIndex = -1;
  for (let index = minimumLevelIndex; index < levels.length; index += 1) {
    const level = levels[index];
    if (!level || level.bitrate >= currentLevel.bitrate) {
      continue;
    }

    if (
      fallbackIndex === -1 ||
      level.bitrate > levels[fallbackIndex].bitrate
    ) {
      fallbackIndex = index;
    }
  }

  return fallbackIndex === -1 ? null : fallbackIndex;
}

export function requestAdaptiveFallback(
  controller: AdaptiveQualityController,
  currentLevelIndex = controller.currentLevel,
) {
  if (
    !GLOBAL_VIDEO_QUALITY_POLICY.allowAdaptiveFallback ||
    (GLOBAL_VIDEO_QUALITY_POLICY.respectManualSelection &&
      !controller.autoLevelEnabled)
  ) {
    return null;
  }

  const fallbackIndex = getAdaptiveFallbackLevelIndex(
    controller.levels,
    currentLevelIndex,
    controller.minAutoLevel,
  );
  if (fallbackIndex === null) {
    return null;
  }

  controller.nextAutoLevel = fallbackIndex;
  return fallbackIndex;
}
