import { useState, useLayoutEffect, useEffect } from 'react';

/**
 * Manages the FLIP-lite positioning system for the odometer slots.
 * Handles:
 * - Preloader CSS variable measurements (hero offset, odometer Y, horizon Y)
 * - Anchor point measurement for slot-to-card flight animation
 * - Curtain reveal timing (slots → card content transition)
 *
 * @param {Object} options
 * @param {string} options.screen - Current screen state
 * @param {boolean} options.isPreloaderExiting - Whether preloader exit animation is running
 * @param {boolean} options.isReturningToMenu - Whether user is returning from result → start
 * @param {React.RefObject} options.startCardRef - Ref to the left ghost card
 * @param {React.RefObject} options.leaderboardRef - Ref to the right leaderboard ghost
 * @param {React.RefObject} options.speedGameRef - Ref to the center "SPEED GAME" label
 * @returns {{ targetCoords: Object, slotsRevealed: boolean }}
 */
export default function useOdometerLayout({
  screen,
  isPreloaderExiting,
  isReturningToMenu,
  startCardRef,
  leaderboardRef,
  speedGameRef,
}) {
  const [targetCoords, setTargetCoords] = useState({ left: {}, center: {}, right: {} });
  const [slotsRevealed, setSlotsRevealed] = useState(false);

  // Measure preloader positioning — compute hero offset & odometer Y from actual viewport
  useLayoutEffect(() => {
    if (screen === 'PRELOADING' && !isPreloaderExiting) {
      const measurePreloader = () => {
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const marqueeEl = document.querySelector('.marquee-3d-container');
        const heroEl = document.querySelector('.hero-67');
        if (!marqueeEl || !heroEl) return;

        const marqueeH = marqueeEl.offsetHeight;
        const available = vh - marqueeH;

        // Hero natural center Y (offsetTop is unaffected by transforms)
        const headerEl = heroEl.closest('.header');
        const heroNaturalCenterY = marqueeH + (headerEl ? heroEl.offsetTop : 0) + heroEl.offsetHeight / 2;

        // Target: hero center at ~30% of available space below marquee
        const heroTargetY = marqueeH + available * 0.30;
        const heroOffset = Math.max(0, heroTargetY - heroNaturalCenterY);

        // Scale: larger on big screens, smaller on small
        const heroScale = vw > 768 ? 1.3 : vw > 480 ? 1.1 : 1.0;

        // Target: odometer center at ~55% of available space below marquee
        const odoTargetY = marqueeH + available * 0.55;

        // Odometer slot spacing based on viewport width
        const odoSpacing = Math.min(vw * 0.08, 112);

        // Horizon lines Y: ~72% of available space
        const horizonY = marqueeH + available * 0.72;

        const root = document.documentElement;
        root.style.setProperty('--pl-hero-offset', `${heroOffset}px`);
        root.style.setProperty('--pl-hero-scale', `${heroScale}`);
        root.style.setProperty('--pl-odo-y', `${odoTargetY}px`);
        root.style.setProperty('--pl-odo-spacing', `${odoSpacing}px`);
        root.style.setProperty('--pl-horizon-y', `${horizonY}px`);
        root.style.setProperty('--pl-content-top', `${odoTargetY + available * 0.12}px`);
      };

      measurePreloader();
      requestAnimationFrame(measurePreloader);
      window.addEventListener('resize', measurePreloader);
      return () => {
        window.removeEventListener('resize', measurePreloader);
        const root = document.documentElement;
        ['--pl-hero-offset','--pl-hero-scale','--pl-odo-y','--pl-odo-spacing','--pl-horizon-y','--pl-content-top']
          .forEach(v => root.style.removeProperty(v));
      };
    }
  }, [screen, isPreloaderExiting]);

  // Measure anchor points for slot flight animation
  useLayoutEffect(() => {
    if (screen === 'START' || isPreloaderExiting) {
      const measureAnchors = () => {
        const getCenter = (ref) => {
          if (!ref.current) return {};
          const rect = ref.current.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(ref.current);
          return {
            x: rect.left + window.scrollX + rect.width / 2,
            y: rect.top + window.scrollY + rect.height / 2,
            w: rect.width,
            h: rect.height,
            br: computedStyle.borderRadius
          };
        };

        setTargetCoords({
          left: getCenter(startCardRef),
          right: getCenter(leaderboardRef),
          center: getCenter(speedGameRef)
        });
      };

      measureAnchors();
      requestAnimationFrame(measureAnchors);
      window.addEventListener('resize', measureAnchors);
      return () => window.removeEventListener('resize', measureAnchors);
    }
  }, [screen, isPreloaderExiting, startCardRef, leaderboardRef, speedGameRef]);

  // Curtain reveal timing
  useEffect(() => {
    if (isPreloaderExiting) {
      const timer = setTimeout(() => setSlotsRevealed(true), 800);
      return () => clearTimeout(timer);
    } else if (screen === 'START' && isReturningToMenu) {
      setSlotsRevealed(true);
    } else if (screen !== 'START') {
      setSlotsRevealed(false);
    }
  }, [isPreloaderExiting, screen, isReturningToMenu]);

  return { targetCoords, slotsRevealed };
}
