import React, { useEffect, useRef, useCallback } from 'react';

// ── Simplex-inspired noise (fast, no dependencies) ──────────────
// Generates smooth pseudo-random values for flame displacement
const PERM = new Uint8Array(512);
(() => {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

function noise2D(x, y) {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = PERM[xi] + yi;
  const b = PERM[xi + 1] + yi;
  const aa = PERM[a & 511] / 255;
  const ab = PERM[(a + 1) & 511] / 255;
  const ba = PERM[b & 511] / 255;
  const bb = PERM[(b + 1) & 511] / 255;
  return aa + u * (ba - aa) + v * (ab - aa + u * (aa - ba - ab + bb));
}

// ── Combo tier color palettes ───────────────────────────────────
const TIERS = {
  warm: {
    inner:  [255, 255, 200],  // bright yellow-white
    mid:    [255, 200, 0],    // yellow
    outer:  [255, 120, 0],    // orange
  },
  fire: {
    inner:  [255, 255, 150],  // hotter yellow
    mid:    [255, 120, 0],    // orange
    outer:  [255, 40, 0],     // red-orange
  },
  ultra: {
    inner:  [255, 255, 255],  // white-hot core
    mid:    [255, 80, 0],     // intense orange-red
    outer:  [220, 0, 0],      // dark crimson red
  },
};

// ── Smooth Phase Interpolation ──────────────────────────────────
function interpColors(c1, c2, t) {
  const interp = (a, b) => [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
  return {
    inner: interp(c1.inner, c2.inner),
    mid: interp(c1.mid, c2.mid),
    outer: interp(c1.outer, c2.outer)
  };
}

function getAuraProps(combo) {
  const c = Math.max(0, combo);
  
  if (c < 60) {
    // Phase 1: Fade from Warm to Fire (combo 30 to 60)
    // At c=30, t=0. At c=60, t=1.
    const t = Math.max(0, (c - 30) / 30);
    return {
      colors: interpColors(TIERS.warm, TIERS.fire, t),
      intensityBase: 0.7 + 0.15 * t, // 0.7 -> 0.85
      dilateRadius: 2,
    };
  } else if (c < 100) {
    // Phase 2: Fade from Fire to Ultra (combo 60 to 100)
    const t = Math.max(0, (c - 60) / 40);
    return {
      colors: interpColors(TIERS.fire, TIERS.ultra, t),
      intensityBase: 0.85 + 0.15 * t, // 0.85 -> 1.0
      dilateRadius: 3 + Math.round(3 * t), // 3 to 6
    };
  } else {
    // Phase 3: Ultra (combo 100+)
    return {
      colors: TIERS.ultra,
      intensityBase: 1.0,
      dilateRadius: 6,
    };
  }
}

// ── Processing dimensions (super low res for 60fps performance) ──
const PROC_W = 80;
const PROC_H = 60;

// ── AuraCanvas Component ────────────────────────────────────────
const AuraCanvas = ({ maskRef, combo, active }) => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);
  const comboRef = useRef(combo);

  // Downscaled processing buffers (allocated once)
  const procMaskRef = useRef(new Float32Array(PROC_W * PROC_H));
  const dilatedRef = useRef(new Float32Array(PROC_W * PROC_H));
  const outlineRef = useRef(new Float32Array(PROC_W * PROC_H));

  // Keep refs in sync
  useEffect(() => { comboRef.current = combo; }, [combo]);

  // ── Downscale mask to processing resolution ──────────────────
  const downsampleMask = useCallback((srcMask, srcW, srcH) => {
    const dst = procMaskRef.current;
    const scaleX = srcW / PROC_W;
    const scaleY = srcH / PROC_H;
    for (let y = 0; y < PROC_H; y++) {
      const srcY = (y * scaleY) | 0;
      for (let x = 0; x < PROC_W; x++) {
        const srcX = (x * scaleX) | 0;
        dst[y * PROC_W + x] = srcMask[srcY * srcW + srcX];
      }
    }
    return dst;
  }, []);

  // ── Dilate mask (expand body outline) ────────────────────────
  const dilateMask = useCallback((src, radius) => {
    const dst = dilatedRef.current;
    dst.fill(0);
    for (let y = 0; y < PROC_H; y++) {
      for (let x = 0; x < PROC_W; x++) {
        let maxVal = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < PROC_H && nx >= 0 && nx < PROC_W) {
              // Circular kernel
              if (dx * dx + dy * dy <= radius * radius) {
                const v = src[ny * PROC_W + nx];
                if (v > maxVal) maxVal = v;
              }
            }
          }
        }
        dst[y * PROC_W + x] = maxVal;
      }
    }
    return dst;
  }, []);

  // ── Main render loop ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
    
    const render = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const { data: mask, w: maskWidth, h: maskHeight } = maskRef.current || {};
      if (!mask || !active) {
        animRef.current = requestAnimationFrame(render);
        return;
      }

      timeRef.current += 0.016; // ~60fps timestep
      const t = timeRef.current;
      const auraProps = getAuraProps(comboRef.current);
      const colors = auraProps.colors;

      // 1. Downsample mask
      const smallMask = downsampleMask(mask, maskWidth || 640, maskHeight || 480);

      // 2. Dilate to create expanded body area
      const dilateRadius = auraProps.dilateRadius;
      const dilated = dilateMask(smallMask, dilateRadius);

      // 3. Create outline (dilated - original) with strict cutout
      const outline = outlineRef.current;
      for (let i = 0; i < PROC_W * PROC_H; i++) {
        const d = dilated[i];
        const m = smallMask[i];
        // Strictly erase any pixels inside the body (m > 0.3)
        // so the fire NEVER spills onto the user's silhouette.
        outline[i] = m > 0.3 ? 0 : d;
      }

      // 4. Render flames to canvas using ImageData
      const imageData = ctx.createImageData(W, H);
      const pixels = imageData.data;
      const scaleX = PROC_W / W;
      const scaleY = PROC_H / H;

      // Intensity pulsation based on combo tier
      const pulse = 0.7 + 0.3 * Math.sin(t * 4);
      const intensity = auraProps.intensityBase;

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          // Map to processing coords
          const px = (x * scaleX) | 0;
          const py = (y * scaleY) | 0;
          
          if (px >= PROC_W || py >= PROC_H) continue;
          
          const outlineVal = outline[py * PROC_W + px];
          if (outlineVal < 0.05) continue; // Skip transparent pixels

          // Noise-based flame displacement (adjusted for 80x60)
          const noiseScale1 = 0.06;
          const noiseScale2 = 0.12;
          const noiseScale3 = 0.24;
          
          const n1 = noise2D(x * noiseScale1, y * noiseScale1 - t * 2.0);
          const n2 = noise2D(x * noiseScale2 + 100, y * noiseScale2 - t * 3.5) * 0.5;
          const n3 = noise2D(x * noiseScale3 + 200, y * noiseScale3 - t * 5.0) * 0.25;
          const flameNoise = n1 + n2 + n3;

          // Vertical bias — flames rise upward, stronger at top
          const verticalFactor = 1.0 - (y / H) * 0.4;
          
          // Combine outline strength with flame noise
          const flameIntensity = outlineVal * flameNoise * verticalFactor * intensity * pulse;
          
          if (flameIntensity < 0.02) continue;

          let r, g, b, a;
          
          // Neo-brutalist / cartoon hard thresholds
          if (flameIntensity > 0.45) {
            // Core
            r = colors.inner[0]; g = colors.inner[1]; b = colors.inner[2];
            a = 255;
          } else if (flameIntensity > 0.25) {
            // Mid flame
            r = colors.mid[0]; g = colors.mid[1]; b = colors.mid[2];
            a = 255;
          } else if (flameIntensity > 0.08) {
            // Outer edges
            r = colors.outer[0]; g = colors.outer[1]; b = colors.outer[2];
            a = 255;
          } else {
            continue;
          }

          const idx = (y * W + x) * 4;
          pixels[idx] = Math.min(255, r) | 0;
          pixels[idx + 1] = Math.min(255, g) | 0;
          pixels[idx + 2] = Math.min(255, b) | 0;
          pixels[idx + 3] = Math.min(255, a) | 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // No bloom for neo-brutalist style — keep it sharp and flat

      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [active, downsampleMask, dilateMask]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={240}
      className="aura-canvas"
    />
  );
};

AuraCanvas.displayName = 'AuraCanvas';
export default React.memo(AuraCanvas);
