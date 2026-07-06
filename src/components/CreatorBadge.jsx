import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';


const CreatorBadge = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href="https://prabhu-shankar-portfolio.vercel.app/"
      target="_blank"
      rel="noopener noreferrer"
      className={`creator-badge ${isHovered ? 'creator-badge--hover' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Check out my portfolio!"
    >

      <div className="creator-badge__info">
        <span className="creator-badge__label">MADE BY</span>
        <span className="creator-badge__name">Rajmund09</span>
      </div>
      <div className="creator-badge__qr">
        <QRCodeSVG
          value="https://prabhu-shankar-portfolio.vercel.app/"
          size={64}
          level="L"
          bgColor="transparent"
          fgColor="#111111"
        />
      </div>
    </a>
  );
};

export default CreatorBadge;
