import React, { useState, useEffect } from 'react';

/**
 * Film grain overlay using SVG feTurbulence filter.
 * Ultra-subtle analog texture — renders at ~0.04 opacity.
 * Respects prefers-reduced-motion.
 * Zero impact on interactivity (pointer-events: none).
 * Deferred render to avoid blocking initial paint.
 */
const NoiseOverlay = React.memo(() => {
  const [mounted, setMounted] = useState(false);

  // Defer heavy SVG filter creation until after first paint
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!mounted) return null;

  return (
    <div className="noise-overlay" aria-hidden="true">
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id="grain-filter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>
    </div>
  );
});

NoiseOverlay.displayName = 'NoiseOverlay';
export default NoiseOverlay;

