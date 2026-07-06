import React from 'react';

const ComboCounter = ({ combo }) => {
  if (combo < 3) return null;

  let tier = 'warm';
  let emoji = '';
  if (combo >= 15) { tier = 'legendary'; emoji = ' ⚡'; }
  else if (combo >= 10) { tier = 'epic'; emoji = ' 🔥'; }
  else if (combo >= 5) { tier = 'hot'; emoji = ''; }

  return (
    <div className={`combo-counter combo-${tier}`}>
      <span className="combo-label">COMBO</span>
      <span className="combo-value" key={combo}>
        x{combo}{emoji}
      </span>
    </div>
  );
};

export default ComboCounter;
