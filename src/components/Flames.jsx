import React, { useEffect, useRef } from 'react';

const FLAME_COLORS = [
  '#ff00a0', '#ff2ebc', '#ff69d4', // pink tones
  '#d4ff00', '#e8ff44', '#ffee00', // yellow tones  
  '#ff6b00', '#ff4400',            // orange accents
];

const MAX_FLAME_PARTICLES = 120;

const Flames = ({ active }) => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animRef = useRef(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });

    const W = canvas.width;
    const H = canvas.height;

    // Camera rect within the canvas (centered, with padding around for flames)
    const pad = 120;
    const camX = pad;
    const camY = pad;
    const camW = W - pad * 2;
    const camH = H - pad * 2;

    const spawnParticle = () => {
      // Spawn from bottom edge, left edge, or right edge of camera area
      const side = Math.random();
      let x, y, vx, vy;

      if (side < 0.5) {
        // Bottom edge
        x = camX + Math.random() * camW;
        y = camY + camH + Math.random() * 10;
        vx = (Math.random() - 0.5) * 1.2;
        vy = -(1.5 + Math.random() * 2.5);
      } else if (side < 0.75) {
        // Left edge
        x = camX - Math.random() * 15;
        y = camY + camH * 0.3 + Math.random() * camH * 0.7;
        vx = -(0.5 + Math.random() * 1.0);
        vy = -(1.0 + Math.random() * 2.0);
      } else {
        // Right edge
        x = camX + camW + Math.random() * 15;
        y = camY + camH * 0.3 + Math.random() * camH * 0.7;
        vx = 0.5 + Math.random() * 1.0;
        vy = -(1.0 + Math.random() * 2.0);
      }

      return {
        x, y, vx, vy,
        life: 1,
        decay: 0.01 + Math.random() * 0.012,
        size: 4 + Math.random() * 8,
        color: FLAME_COLORS[(Math.random() * FLAME_COLORS.length) | 0],
        isSquare: Math.random() > 0.6,
        wobbleSpeed: 2 + Math.random() * 4,
        wobbleAmount: 0.3 + Math.random() * 0.8,
        age: 0,
      };
    };

    const animate = () => {
      ctx.clearRect(0, 0, W, H);
      const parts = particlesRef.current;
      let len = parts.length;

      // Spawn new particles when active (reduced rate)
      if (activeRef.current && len < MAX_FLAME_PARTICLES) {
        const spawnCount = 1 + ((Math.random() > 0.5) ? 1 : 0);
        for (let i = 0; i < spawnCount; i++) {
          parts.push(spawnParticle());
          len++;
        }
      }

      // Update and draw
      for (let i = len - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += 1;
        p.x += p.vx + Math.sin(p.age * 0.05 * p.wobbleSpeed) * p.wobbleAmount;
        p.y += p.vy;
        p.vy *= 0.995;
        p.life -= p.decay;
        p.size *= 0.997;

        if (p.life <= 0 || p.size < 1) {
          // Swap-and-pop
          parts[i] = parts[len - 1];
          parts.pop();
          len--;
          continue;
        }

        ctx.globalAlpha = Math.min(1, p.life * 1.8);
        ctx.fillStyle = p.color;
        // No shadowBlur — too expensive on mobile

        if (p.isSquare) {
          const s = p.size;
          ctx.fillRect(p.x - s, p.y - s, s * 2, s * 2);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;

      // Stop the loop when inactive AND all particles have died — save GPU cycles
      if (!activeRef.current && parts.length === 0) {
        animRef.current = null;
        return;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Restart loop when active changes from false to true and loop is stopped
  useEffect(() => {
    if (active && !animRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { alpha: true });
      const W = canvas.width;
      const H = canvas.height;

      const pad = 120;
      const camX = pad;
      const camY = pad;
      const camW = W - pad * 2;
      const camH = H - pad * 2;

      const spawnParticle = () => {
        const side = Math.random();
        let x, y, vx, vy;
        if (side < 0.5) {
          x = camX + Math.random() * camW;
          y = camY + camH + Math.random() * 10;
          vx = (Math.random() - 0.5) * 1.2;
          vy = -(1.5 + Math.random() * 2.5);
        } else if (side < 0.75) {
          x = camX - Math.random() * 15;
          y = camY + camH * 0.3 + Math.random() * camH * 0.7;
          vx = -(0.5 + Math.random() * 1.0);
          vy = -(1.0 + Math.random() * 2.0);
        } else {
          x = camX + camW + Math.random() * 15;
          y = camY + camH * 0.3 + Math.random() * camH * 0.7;
          vx = 0.5 + Math.random() * 1.0;
          vy = -(1.0 + Math.random() * 2.0);
        }
        return {
          x, y, vx, vy, life: 1, decay: 0.01 + Math.random() * 0.012,
          size: 4 + Math.random() * 8,
          color: FLAME_COLORS[(Math.random() * FLAME_COLORS.length) | 0],
          isSquare: Math.random() > 0.6,
          wobbleSpeed: 2 + Math.random() * 4,
          wobbleAmount: 0.3 + Math.random() * 0.8,
          age: 0,
        };
      };

      const animate = () => {
        ctx.clearRect(0, 0, W, H);
        const parts = particlesRef.current;
        let len = parts.length;
        if (activeRef.current && len < MAX_FLAME_PARTICLES) {
          const spawnCount = 1 + ((Math.random() > 0.5) ? 1 : 0);
          for (let i = 0; i < spawnCount; i++) { parts.push(spawnParticle()); len++; }
        }
        for (let i = len - 1; i >= 0; i--) {
          const p = parts[i];
          p.age += 1;
          p.x += p.vx + Math.sin(p.age * 0.05 * p.wobbleSpeed) * p.wobbleAmount;
          p.y += p.vy; p.vy *= 0.995; p.life -= p.decay; p.size *= 0.997;
          if (p.life <= 0 || p.size < 1) { parts[i] = parts[len - 1]; parts.pop(); len--; continue; }
          ctx.globalAlpha = Math.min(1, p.life * 1.8);
          ctx.fillStyle = p.color;
          if (p.isSquare) { const s = p.size; ctx.fillRect(p.x - s, p.y - s, s * 2, s * 2); }
          else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.globalAlpha = 1;
        if (!activeRef.current && parts.length === 0) { animRef.current = null; return; }
        animRef.current = requestAnimationFrame(animate);
      };
      animate();
    }
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      width={760}
      height={620}
      className="flames-canvas"
    />
  );
};

export default Flames;
