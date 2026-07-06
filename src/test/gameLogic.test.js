import { describe, it, expect } from 'vitest';
import { check67Gesture } from '../gameLogic';

describe('check67Gesture', () => {
  it('returns "neutral" when both wrists are null', () => {
    expect(check67Gesture(null, null)).toBe('neutral');
  });

  it('returns "neutral" when left wrist is null', () => {
    expect(check67Gesture(null, { y: 0.5 })).toBe('neutral');
  });

  it('returns "neutral" when right wrist is null', () => {
    expect(check67Gesture({ y: 0.5 }, null)).toBe('neutral');
  });

  it('returns "left_high" when left wrist is significantly higher', () => {
    // Lower y = higher on screen (0 = top)
    const leftWrist = { y: 0.2 };
    const rightWrist = { y: 0.5 };
    expect(check67Gesture(leftWrist, rightWrist)).toBe('left_high');
  });

  it('returns "right_high" when right wrist is significantly higher', () => {
    const leftWrist = { y: 0.5 };
    const rightWrist = { y: 0.2 };
    expect(check67Gesture(leftWrist, rightWrist)).toBe('right_high');
  });

  it('returns "neutral" when wrists are at the same level (within threshold)', () => {
    const leftWrist = { y: 0.5 };
    const rightWrist = { y: 0.52 }; // within 0.05 threshold
    expect(check67Gesture(leftWrist, rightWrist)).toBe('neutral');
  });

  it('detects gesture at exact threshold boundary', () => {
    const leftWrist = { y: 0.4 };
    const rightWrist = { y: 0.4 + 0.05 + 0.001 }; // just beyond threshold
    expect(check67Gesture(leftWrist, rightWrist)).toBe('left_high');
  });
});
