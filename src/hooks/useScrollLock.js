import { useLayoutEffect, useRef, useCallback } from 'react';

/**
 * Manages scroll locking during screen transitions.
 * Temporarily adds 'is-animating' class to html+body to prevent
 * scrollbar flashing during CSS exit/entry animations.
 *
 * @param {string} screen - Current screen state (locks on every change)
 * @returns {Function} lockScrollForAnimation(durationMs)
 */
export default function useScrollLock(screen) {
  const animationLockTimeoutRef = useRef(null);

  const lockScrollForAnimation = useCallback((duration = 1000) => {
    document.documentElement.classList.add('is-animating');
    document.body.classList.add('is-animating');

    if (animationLockTimeoutRef.current) {
      clearTimeout(animationLockTimeoutRef.current);
    }

    animationLockTimeoutRef.current = setTimeout(() => {
      document.documentElement.classList.remove('is-animating');
      document.body.classList.remove('is-animating');
    }, duration);
  }, []);

  // Lock scroll on mount and every screen change
  useLayoutEffect(() => {
    lockScrollForAnimation(1200);
  }, [screen, lockScrollForAnimation]);

  return lockScrollForAnimation;
}
