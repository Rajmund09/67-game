/**
 * HARDCODED OVERRIDE FOR TESTING
 * Set to: 'auto' | 'low' | 'medium' | 'high'
 */
const DEBUG_TIER = 'auto';

/**
 * Detects the device performance tier based on hardware capabilities.
 * @returns {'low' | 'medium' | 'high'}
 */
export function getDeviceTier() {
  if (DEBUG_TIER !== 'auto') {
    return DEBUG_TIER;
  }

  // Safe checks for SSR or environments where navigator is not available
  if (typeof navigator === 'undefined') {
    return 'medium'; // Safe fallback
  }

  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency || 2;
  const memory = navigator.deviceMemory || 4; // usually maxes out at 8 in Chrome

  // Low Tier: Mobile devices or very weak PCs (< 4 cores)
  if (isMobile || cores < 4) {
    return 'low';
  }

  // High Tier: Desktop, 8+ cores, 8+ GB RAM
  if (cores >= 8 && memory >= 8) {
    return 'high';
  }

  // Medium Tier: Everything else (e.g. 4-core laptops)
  return 'medium';
}

/**
 * Returns configuration settings for MediaPipe based on the given tier.
 */
export function getMediaPipeConfig(tier) {
  switch (tier) {
    case 'high':
      return {
        modelPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task",
        segmentation: true,
        cameraFps: 60
      };
    case 'low':
      return {
        modelPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        segmentation: false,
        cameraFps: 30
      };
    case 'medium':
    default:
      return {
        modelPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
        segmentation: true,
        cameraFps: 60
      };
  }
}
