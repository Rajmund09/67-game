import React from 'react';
import useLanguage from '../hooks/useLanguage';

// Rank thresholds optimized for 10pts/sec gameplay (15s = ~150 max theoretical)
const RANKS = [
  { min: 0,   key: 'rank0', color: '#e5e7eb' },
  { min: 20,  key: 'rank1', color: '#d4ff00' },
  { min: 45,  key: 'rank2', color: '#00e676' },
  { min: 70,  key: 'rank3', color: '#0055ff' },
  { min: 100, key: 'rank4', color: '#ff00a0' },
  { min: 130, key: 'rank5', color: '#ff6b00' },
];

const MAX_BAR = RANKS[RANKS.length - 1].min + 20; // 150

export const getRank = (score, t = (k) => k) => {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].min) {
      return { ...RANKS[i], label: t(RANKS[i].key) };
    }
  }
  return { ...RANKS[0], label: t(RANKS[0].key) };
};

export const getNextRank = (score, t = (k) => k) => {
  for (let i = 0; i < RANKS.length; i++) {
    if (score < RANKS[i].min) {
      return { ...RANKS[i], label: t(RANKS[i].key) };
    }
  }
  return null;
};

const ProgressBar = ({ score }) => {
  const { t } = useLanguage();
  const currentRank = getRank(score, t);
  const nextRank = getNextRank(score, t);

  let progress = 1;
  let progressLabel = '';

  if (nextRank) {
    const prevMin = currentRank.min;
    const range = nextRank.min - prevMin;
    progress = Math.min(1, (score - prevMin) / range);
    progressLabel = `→ ${nextRank.label} (${nextRank.min})`;
  } else {
    progressLabel = t('maxRank');
  }

  return (
    <div className="progress-bar-container">
      <div className="progress-rank-labels">
        <span className="progress-current">{currentRank.label}</span>
        <span className="progress-next">{progressLabel}</span>
      </div>
      <div className="progress-track">
        <div 
          className="progress-fill"
          style={{ 
            width: `${progress * 100}%`,
            background: currentRank.color,
          }}
        />
        {RANKS.slice(1).map((rank, i) => {
          const pos = (rank.min / MAX_BAR) * 100;
          return (
            <div 
              key={`rank-${i}`}
              className="progress-marker"
              style={{ left: `${pos}%` }}
              title={t(rank.key)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;
