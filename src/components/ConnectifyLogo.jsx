import React from 'react';

const ConnectifyLogo = ({ width = 350, height = 120, className = "" }) => {
  return (
    <svg
      viewBox="0 0 350 120"
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      className={className}
    >
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: "#0ea5e9", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#38bdf8", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#60a5fa", stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: "#0284c7", stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: "#0ea5e9", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#38bdf8", stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* Atomic/Electron structure */}
      <g transform="translate(175, 50)">
        {/* Electron orbital rings */}
        <ellipse cx="0" cy="0" rx="25" ry="10" fill="none" stroke="url(#gradient)" strokeWidth="1.5" opacity="0.6" />
        <ellipse cx="0" cy="0" rx="25" ry="10" fill="none" stroke="url(#gradient)" strokeWidth="1.5" opacity="0.6" transform="rotate(60)" />
        <ellipse cx="0" cy="0" rx="25" ry="10" fill="none" stroke="url(#gradient)" strokeWidth="1.5" opacity="0.6" transform="rotate(120)" />

        {/* Central nucleus */}
        <circle cx="0" cy="0" r="6" fill="url(#nodeGradient)" opacity="0.9" />
        <circle cx="0" cy="0" r="3" fill="#0ea5e9" opacity="0.8" />

        {/* Electrons on orbitals */}
        <circle cx="25" cy="0" r="3" fill="url(#nodeGradient)">
          <animateTransform attributeName="transform" type="rotate" values="0 0 0;360 0 0" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx="-12.5" cy="22" r="2.5" fill="url(#nodeGradient)">
          <animateTransform attributeName="transform" type="rotate" values="0 0 0;360 0 0" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="-12.5" cy="-22" r="2.5" fill="url(#nodeGradient)">
          <animateTransform attributeName="transform" type="rotate" values="0 0 0;360 0 0" dur="5s" repeatCount="indefinite" />
        </circle>

        {/* Energy pulses */}
        <circle cx="0" cy="0" r="8" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.3">
          <animate attributeName="r" values="8;15;8" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* Company name */}
      <text x="175" y="95" fontFamily="Helvetica, Arial, sans-serif" fontSize="28" fontWeight="800" fill="url(#textGradient)" letterSpacing="-0.5px" textAnchor="middle">
        connectif<tspan fill="#1a1a1a">ai</tspan>
      </text>

      {/* Tagline */}
      <text x="175" y="110" fontFamily="Helvetica, Arial, sans-serif" fontSize="9" fill="#666" fontWeight="500" letterSpacing="0.5px" textAnchor="middle">
        INTELLIGENT CONNECTIONS
      </text>
    </svg>
  );
};

export default ConnectifyLogo;
