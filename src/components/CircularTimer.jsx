import React from 'react';

const TOTAL_TIME = 15;
const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const CircularTimer = ({ timeLeft }) => {
  const progress = timeLeft / TOTAL_TIME;
  const offset = CIRCUMFERENCE * (1 - progress);

  // Color: green → yellow → red
  let color = '#00e676';
  if (timeLeft <= 5) color = '#ff2d2d';
  else if (timeLeft <= 10) color = '#f59e0b';

  const isUrgent = timeLeft <= 5 && timeLeft > 0;

  return (
    <div className={`circular-timer ${isUrgent ? 'circular-timer--urgent' : ''}`}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 90 90"
        className="circular-timer__svg"
      >
        {/* Background track */}
        <circle
          cx="45"
          cy="45"
          r={RADIUS}
          fill="none"
          stroke="var(--neo-black)"
          strokeWidth="4"
          opacity="0.15"
        />
        {/* Progress arc */}
        <circle
          cx="45"
          cy="45"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 45 45)"
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.5s ease' }}
        />
        {/* Outer brutalist ring */}
        <circle
          cx="45"
          cy="45"
          r="43"
          fill="none"
          stroke="var(--neo-black)"
          strokeWidth="3"
        />
      </svg>
      <span className="circular-timer__value" style={{ color }}>
        {timeLeft}
      </span>
    </div>
  );
};

export default CircularTimer;
