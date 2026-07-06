import React, { forwardRef, useState, useEffect } from 'react';
import useLanguage from '../hooks/useLanguage';

const Leaderboard = forwardRef(({ leaderboard }, ref) => {
  const { t } = useLanguage();
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diffMs = tomorrow - now;

      const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diffMs / 1000 / 60) % 60);
      const seconds = Math.floor((diffMs / 1000) % 60);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Always pad the leaderboard array to exactly 5 elements
  const paddedLeaderboard = [...(leaderboard || [])];
  while (paddedLeaderboard.length < 5) {
    paddedLeaderboard.push(null);
  }

  return (
    <div className="leaderboard-container" ref={ref}>
      <h3 className="glow-text-small" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{t('top5Today')}</span>
        <span style={{ fontSize: '0.6em', opacity: 0.8, fontWeight: 'normal' }}>
          {t('resetIn')} {timeLeft}
        </span>
      </h3>
      <ul className="leaderboard-list">
        {paddedLeaderboard.map((entry, index) => (
          <li key={index} className={`leaderboard-item ${!entry ? 'empty-slot' : ''}`}>
            <span className="rank">#{index + 1}</span>
            <span className="name">{entry ? entry.name : '---'}</span>
            <span className="score">{entry ? entry.score : '-'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
});

Leaderboard.displayName = 'Leaderboard';
export default Leaderboard;
