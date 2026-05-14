// Generate PWA icons as SVG files (browsers accept SVG icons too)
// For production, you'd convert these to PNG using sharp or canvas

import { writeFileSync } from "fs";

function generateSvg(size: number): string {
  const pad = size * 0.15;
  const treeX = size / 2;
  const treeY = size * 0.55;
  const trunkH = size * 0.15;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#2f9e84"/>
  <g transform="translate(${treeX}, ${treeY})" fill="none" stroke="white" stroke-width="${size * 0.04}" stroke-linecap="round" stroke-linejoin="round">
    <line x1="0" y1="0" x2="0" y2="${trunkH}"/>
    <path d="M0,0 Q${-size*0.15},${-size*0.12} ${-size*0.22},${-size*0.2}"/>
    <path d="M0,${-size*0.02} Q${size*0.12},${-size*0.15} ${size*0.2},${-size*0.22}"/>
    <path d="M0,0 Q${-size*0.08},${-size*0.18} ${-size*0.1},${-size*0.28}"/>
    <path d="M0,${-size*0.02} Q${size*0.05},${-size*0.2} ${size*0.08},${-size*0.3}"/>
    <path d="M0,${-size*0.04} Q${-size*0.18},${-size*0.08} ${-size*0.28},${-size*0.1}"/>
  </g>
</svg>`;
}

writeFileSync("public/icons/icon-192.svg", generateSvg(192));
writeFileSync("public/icons/icon-512.svg", generateSvg(512));
console.log("SVG icons generated");
