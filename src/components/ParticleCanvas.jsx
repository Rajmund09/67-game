import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

const COLORS = ['#ff00a0', '#d4ff00', '#00e676', '#0055ff', '#ffffff'];
const MAX_PARTICLES = 80;

const ParticleCanvas = forwardRef(({ active = true }, ref) => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);

  useImperativeHandle(ref, () => ({
    emit(xNorm, yNorm, count = 12) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parts = particlesRef.current;
      // Cap total particles to prevent lag
      const budget = Math.min(count, MAX_PARTICLES - parts.length);
      if (budget <= 0) return;
      const x = xNorm * canvas.width;
      const y = yNorm * canvas.height;
      for (let i = 0; i < budget; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        parts.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          life: 1,
          decay: 0.018 + Math.random() * 0.018,
          size: 3 + Math.random() * 5,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          isSquare: Math.random() > 0.45,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.15,
        });
      }
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });

    const animate = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const parts = particlesRef.current;
      let len = parts.length;

      // Update and draw — swap-and-pop for O(1) removal
      for (let i = len - 1; i >= 0; i--) {
        const p = parts[i];
        p.vy += 0.12;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.life -= p.decay;
        p.rotation += p.rotSpeed;

        if (p.life <= 0) {
          // Swap with last and pop — O(1) instead of splice O(n)
          parts[i] = parts[len - 1];
          parts.pop();
          len--;
          continue;
        }

        ctx.globalAlpha = Math.min(1, p.life * 1.5);
        ctx.fillStyle = p.color;
        // No shadowBlur — too expensive on mobile GPU
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.isSquare) {
          ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.globalAlpha = 1;
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={480}
      className="particle-canvas"
    />
  );
});

ParticleCanvas.displayName = 'ParticleCanvas';
export default ParticleCanvas;

