import React, { useState, useImperativeHandle, forwardRef } from 'react';

let ringId = 0;

const ShockwaveRing = forwardRef((props, ref) => {
  const [rings, setRings] = useState([]);

  useImperativeHandle(ref, () => ({
    trigger() {
      const id = ringId++;
      setRings(prev => [...prev, id]);
      setTimeout(() => {
        setRings(prev => prev.filter(r => r !== id));
      }, 600);
    }
  }));

  return (
    <>
      {rings.map(id => (
        <div key={id} className="shockwave-ring" />
      ))}
    </>
  );
});

ShockwaveRing.displayName = 'ShockwaveRing';
export default ShockwaveRing;
