import { describe, it, expect } from 'vitest';
import { getRank, getNextRank } from '../components/ProgressBar';

describe('getRank', () => {
  it('returns lowest rank for score 0', () => {
    expect(getRank(0).label).toBe('rank0');
  });

  it('returns correct rank at exact threshold', () => {
    expect(getRank(20).label).toBe('rank1');
    expect(getRank(45).label).toBe('rank2');
    expect(getRank(70).label).toBe('rank3');
    expect(getRank(100).label).toBe('rank4');
    expect(getRank(130).label).toBe('rank5');
  });

  it('returns correct rank between thresholds', () => {
    expect(getRank(10).label).toBe('rank0');
    expect(getRank(30).label).toBe('rank1');
    expect(getRank(60).label).toBe('rank2');
  });

  it('returns highest rank for very high score', () => {
    expect(getRank(200).label).toBe('rank5');
  });

  it('returns rank color along with label', () => {
    const rank = getRank(50);
    expect(rank.color).toBeDefined();
    expect(rank.min).toBeDefined();
  });
});

describe('getNextRank', () => {
  it('returns next rank for low score', () => {
    expect(getNextRank(0).label).toBe('rank1');
    expect(getNextRank(0).min).toBe(20);
  });

  it('returns null when at max rank', () => {
    expect(getNextRank(130)).toBeNull();
    expect(getNextRank(200)).toBeNull();
  });

  it('returns correct next rank between thresholds', () => {
    expect(getNextRank(25).label).toBe('rank2');
    expect(getNextRank(50).label).toBe('rank3');
  });
});
