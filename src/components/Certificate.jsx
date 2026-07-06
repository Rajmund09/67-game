import React, { useRef, useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { getRank } from './ProgressBar';
import useLanguage from '../hooks/useLanguage';

const Certificate = ({ name, score, photoDataUrl, uploadedPhotoUrl, onClose }) => {
  const { t } = useLanguage();
  const canvasRef = useRef(null);
  const [certDataUrl, setCertDataUrl] = useState(null);

  const getDate = () => {
    const d = new Date();
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  };

  useEffect(() => {
    drawCertificate();
  }, [t, name, score, photoDataUrl, uploadedPhotoUrl]);

  const drawRoundRectPath = (ctx, x, y, width, height, radius) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const drawArcade3DBlock = (ctx, x, y, w, h, radius, faceColor, outlineColor = 'rgba(255,255,255,0.3)', shadowColor = 'rgba(0,0,0,0.5)') => {
    // Sleek shadowed block
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;
    
    // Face layer
    ctx.fillStyle = faceColor;
    drawRoundRectPath(ctx, x, y, w, h, radius);
    ctx.fill();

    // Soft outline
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    drawRoundRectPath(ctx, x, y, w, h, radius);
    ctx.stroke();
  };

  const drawSharp3DFrame = (ctx, x, y, w, h, thick) => {
    // Sleek Modern Frame
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, 'rgba(255, 0, 230, 0.8)');
    gradient.addColorStop(0.5, 'rgba(0, 255, 196, 0.8)');
    gradient.addColorStop(1, 'rgba(93, 0, 255, 0.8)');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = thick;
    ctx.lineJoin = 'round';
    ctx.strokeRect(x + thick/2, y + thick/2, w - thick, h - thick);
    
    // Inner sleek outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + thick, y + thick, w - thick * 2, h - thick * 2);
  };

  const drawCertificate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const W = 1200;
    const H = 850;
    canvas.width = W;
    canvas.height = H;

    // Background: Arcade Dark Space
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, W, H);
    
    // Synthwave / Arcade Grid (Maximalist Noise)
    ctx.lineWidth = 2;
    for (let i = 0; i < W; i += 40) {
      ctx.strokeStyle = (i % 120 === 0) ? '#FF00E6' : 'rgba(255, 0, 230, 0.2)';
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
    }
    for (let j = 0; j < H; j += 40) {
      ctx.strokeStyle = (j % 120 === 0) ? '#00FFC4' : 'rgba(0, 255, 196, 0.2)';
      ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke();
    }

    // Floating Arcade Pixels/Stars
    ctx.fillStyle = '#FF4D00';
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(Math.random() * W, Math.random() * H, 8, 8);
    }
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(Math.random() * W, Math.random() * H, 5, 5);
    }
    
    // Proper 3D Bevel Frame (Sharp corners, brutalist)
    drawSharp3DFrame(ctx, 15, 15, W - 30, H - 30, 25);
    
    // Top banner (Arcade 3D with colored shadow)
    drawArcade3DBlock(ctx, 70, 70, W - 140, 75, 0, '#111111', '#00FFC4', '#FF00E6');

    ctx.fillStyle = '#00FFC4';
    ctx.font = '900 30px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`/// ${t('globalChallenge').toUpperCase()} /// ${t('speedGame').toUpperCase()} /// ${t('certificateOf').toUpperCase()} ///`, W / 2, 113);

    // Title Block (Stacked Brutalist Glitch)
    ctx.font = '900 85px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    const titleY = 220;
    ctx.fillStyle = '#111111';
    ctx.fillText(t('certificateOf').toUpperCase(), W / 2 + 8, titleY + 8);
    ctx.fillStyle = '#00FFC4';
    ctx.fillText(t('certificateOf').toUpperCase(), W / 2 - 4, titleY - 4);
    ctx.fillStyle = '#FF4D00';
    ctx.fillText(t('certificateOf').toUpperCase(), W / 2, titleY);

    // Subtitle Pill
    const subtitleText = `>> ${t('challenge67').toUpperCase()} <<`;
    ctx.font = 'bold 24px "Space Grotesk", sans-serif';
    const textWidth = ctx.measureText(subtitleText).width;
    drawArcade3DBlock(ctx, W / 2 - textWidth / 2 - 40, 245, textWidth + 80, 60, 30, '#FF00E6');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitleText, W / 2, 283);

    // Photo area — left side (Aligned & Rounded)
    const photoX = 80;
    const photoY = 340;
    const photoW = 360;
    const photoH = 280;

    // Draw photo container
    drawArcade3DBlock(ctx, photoX, photoY, photoW, photoH, 15, '#ffffff', '#FF4D00');

    const photoSource = photoDataUrl || uploadedPhotoUrl;
    
    // Draw photo if available
    if (photoSource) {
      const img = new Image();
      if (photoSource.startsWith('http')) {
        img.crossOrigin = "anonymous";
      }
      
      img.onload = () => {
        ctx.save();
        drawRoundRectPath(ctx, photoX + 6, photoY + 6, photoW - 12, photoH - 12, 10);
        ctx.clip();
        
        const scale = Math.max((photoW - 12) / img.width, (photoH - 12) / img.height);
        const dx = photoX + 6 + ((photoW - 12) - img.width * scale) / 2;
        const dy = photoY + 6 + ((photoH - 12) - img.height * scale) / 2;
        ctx.drawImage(img, dx, dy, img.width * scale, img.height * scale);
        
        // No filter applied here for perfect photo quality
        ctx.restore();
        finishDraw(ctx, W, H);
      };
      
      img.onerror = () => {
        drawFallbackCamera(ctx, photoX, photoY, photoW, photoH);
        finishDraw(ctx, W, H);
      };
      
      img.src = photoSource;
    } else {
      drawFallbackCamera(ctx, photoX, photoY, photoW, photoH);
      finishDraw(ctx, W, H);
    }
  };

  const drawCameraIcon = (ctx, x, y) => {
    ctx.save();
    ctx.translate(x - 24, y - 24);
    ctx.scale(2, 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FF00E6';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke(new Path2D('M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z'));
    ctx.stroke(new Path2D('M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'));
    ctx.restore();
  };

  const drawLightningIcon = (ctx, x, y) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.5, 1.5);
    ctx.fillStyle = '#111111';
    ctx.fill(new Path2D('M13 2L3 14h9l-1 8 10-12h-9l1-8z'));
    ctx.restore();
  };

  const drawFallbackCamera = (ctx, photoX, photoY, photoW, photoH) => {
    ctx.fillStyle = '#111111';
    drawRoundRectPath(ctx, photoX + 6, photoY + 6, photoW - 12, photoH - 12, 10);
    ctx.fill();
    drawCameraIcon(ctx, photoX + photoW / 2, photoY + photoH / 2 - 15);
    ctx.fillStyle = '#FF00E6';
    ctx.font = 'bold 20px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NO SIGNAL', photoX + photoW / 2, photoY + photoH / 2 + 35);
  };

  const finishDraw = (ctx, W, H) => {
    const rank = getRank(score, t).label;
    const date = getDate();

    const infoX = 480;
    const infoY = 330;
    const boxW = 640;

    // Player name box
    drawArcade3DBlock(ctx, infoX, infoY, boxW, 90, 0, '#ffffff');
    
    ctx.fillStyle = '#111111';
    ctx.font = '900 55px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name.toUpperCase(), infoX + boxW / 2, infoY + 65);

    // Score & Rank Side by Side
    const halfBoxW = 305;
    const scoreX = infoX;
    const rankX = infoX + 335;
    
    drawArcade3DBlock(ctx, scoreX, infoY + 115, halfBoxW, 120, 0, '#00FFC4');
    drawArcade3DBlock(ctx, rankX, infoY + 115, halfBoxW, 120, 0, '#FF4D00');
    
    // Score Text
    ctx.fillStyle = '#111111';
    ctx.font = '900 22px "Space Grotesk", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(t('scoreHUD').replace(':', '').toUpperCase(), scoreX + 25, infoY + 155);
    ctx.font = '900 55px "Space Grotesk", sans-serif';
    ctx.fillText(`${score}`, scoreX + 25, infoY + 205);
    ctx.font = 'bold 20px "Space Grotesk", sans-serif';
    ctx.fillText(t('reps').toUpperCase(), scoreX + 115, infoY + 200);

    // Rank Text
    ctx.fillStyle = '#111111';
    ctx.font = '900 22px "Space Grotesk", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(t('rank').replace(':', '').toUpperCase(), rankX + 25, infoY + 155);
    ctx.font = '900 36px "Space Grotesk", sans-serif';
    ctx.fillText(rank.toUpperCase(), rankX + 25, infoY + 205);
    
    // Draw lightning icon right after rank text
    const rankWidth = ctx.measureText(rank.toUpperCase()).width;
    drawLightningIcon(ctx, rankX + 35 + rankWidth, infoY + 175);

    // Date box
    drawArcade3DBlock(ctx, infoX, infoY + 260, boxW, 60, 0, '#FF00E6');
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`[ ${date} ]  ***  ${t('globalChallenge').toUpperCase()}`, infoX + boxW / 2, infoY + 300);

    // Bottom banner
    drawArcade3DBlock(ctx, 60, H - 140, W - 120, 80, 0, '#111111', '#00FFC4');

    ctx.fillStyle = '#00FFC4';
    ctx.font = '900 28px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`/// ${t('speedGame').toUpperCase()} /// ${t('testSpeed').toUpperCase()} ///`, W / 2, H - 90);

    // Decorative stickers (Arcade style)
    ctx.save();
    ctx.translate(130, H - 190);
    ctx.rotate(-0.10);
    drawArcade3DBlock(ctx, 0, 0, 260, 60, 30, '#FF4D00');
    ctx.fillStyle = '#111111';
    ctx.font = '900 20px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MADE BY Rajmund09', 130, 38);
    ctx.restore();

    ctx.save();
    ctx.translate(W - 320, H - 195);
    ctx.rotate(0.08);
    drawArcade3DBlock(ctx, 0, 0, 260, 60, 0, '#5D00FF');
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VERIFIED 100%', 130, 38);
    ctx.restore();

    // Generate data URL
    const dataUrl = canvasRef.current.toDataURL('image/png');
    setCertDataUrl(dataUrl);
  };

  const downloadPDF = () => {
    if (!certDataUrl) return;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1200, 850] });
    pdf.addImage(certDataUrl, 'PNG', 0, 0, 1200, 850);
    pdf.save(`reflex_challenge_certificate_${name}.pdf`);
  };

  const downloadImage = () => {
    if (!certDataUrl) return;
    const link = document.createElement('a');
    link.download = `reflex_challenge_certificate_${name}.png`;
    link.href = certDataUrl;
    link.click();
  };

  const TrophyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 10px', color: '#FFD700' }}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );

  return (
    <div className="certificate-overlay">
      <div className="certificate-modal">
        <h2 className="glow-text" style={{ fontSize: '2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TrophyIcon /> {t('certificateOf').toUpperCase()} <TrophyIcon />
        </h2>

        <div className="cert-preview-wrapper">
          <canvas
            ref={canvasRef}
            className="cert-canvas"
          />
        </div>

        <div className="cert-actions">
          <div className="cert-buttons">
            <button className="btn-primary" onClick={downloadPDF}>
              📄 PDF
            </button>
            <button className="btn-secondary" onClick={downloadImage}>
              🖼️ {t('download')}
            </button>
          </div>
        </div>

        <button className="btn-secondary btn-close" onClick={onClose}>
          {t('close')}
        </button>
      </div>
    </div>
  );
};

export default Certificate;
