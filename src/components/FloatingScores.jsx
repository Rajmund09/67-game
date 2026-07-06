import React, { useState, useImperativeHandle, forwardRef } from 'react';

let nextId = 0;

const FloatingScores = forwardRef((props, ref) => {
  const [scores, setScores] = useState([]);

  useImperativeHandle(ref, () => ({
    add(value) {
      const id = nextId++;
      const x = 25 + Math.random() * 50;
      const drift = Math.random() > 0.5 ? 'drift-left' : 'drift-right';
      setScores(prev => [...prev, { id, value, x, drift }]);
      setTimeout(() => {
        setScores(prev => prev.filter(s => s.id !== id));
      }, 1100);
    }
  }));

  return (
    <div className="floating-scores-layer">
      {scores.map(s => (
        <div
          key={s.id}
          className={`floating-score ${s.drift}`}
          style={{ left: `${s.x}%` }}
        >
          +{s.value}
        </div>
      ))}
    </div>
  );
});

FloatingScores.displayName = 'FloatingScores';
export default FloatingScores;
