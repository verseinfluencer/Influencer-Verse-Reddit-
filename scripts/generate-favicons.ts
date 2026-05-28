import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Precise vector design of the Influencer Verse brand logo styled on a purple-blue brand gradient background
const svgLogo = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs>
    <!-- Purple-to-blue brand gradient background -->
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#7C3AED" />
      <stop offset="100%" stopColor="#1D4ED8" />
    </linearGradient>
    <linearGradient id="logo-white" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#FFFFFF" />
      <stop offset="100%" stopColor="#F3E8FF" />
    </linearGradient>
    <linearGradient id="star-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#FFA07A" />
      <stop offset="100%" stopColor="#EC4899" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background rounded canvas (Squircle-like rounded rect for high elegance) -->
  <rect x="0" y="0" width="100" height="100" rx="22" fill="url(#bg-gradient)" />

  <!-- Styled Circular Outer Orbit matching brand design -->
  <path
    d="M 37 80 C 18 73 10 50 18 30 C 26 10 49 5 68 15 C 80 22 86 35 84 48 C 83 55 80 61 74 67 C 69 72 63 76 56 79"
    stroke="url(#logo-white)"
    stroke-width="3"
    stroke-linecap="round"
    fill="none"
    opacity="0.85"
  />
  <path
    d="M 35 83 C 44 87 53 87 62 82 C 67 79 71 75 75 70"
    stroke="url(#logo-white)"
    stroke-width="3"
    stroke-linecap="round"
    fill="none"
    opacity="0.85"
  />

  <!-- Serif I Numeral in crisp white -->
  <g transform="translate(-1, 0)">
    <path
      d="M 43 31 L 43 69"
      stroke="#ffffff"
      stroke-width="5"
      stroke-linecap="square"
    />
    <path d="M 38 31 L 48 31" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
    <path d="M 38 69 L 48 69" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
  </g>

  <!-- Stylized V Numeral in crisp white -->
  <g>
    <path
      d="M 49.5 31.5 L 59 69"
      stroke="#ffffff"
      stroke-width="5.5"
      stroke-linecap="round"
    />
    <path
      d="M 59 69 L 71 31"
      stroke="#ffffff"
      stroke-width="3.2"
      stroke-linecap="round"
    />
    <path d="M 46.5 31.5 L 54.5 31.5" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
    <path d="M 66 31 L 74 31" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
  </g>

  <!-- Signature 4-pointed Star on V's top-right corner with glow -->
  <g transform="translate(71, 28)">
    <path
      d="M 0 -13 C 0 -3 3 0 13 0 C 3 0 0 3 0 13 C 0 3 -3 0 -13 0 C -3 0 0 -3 0 -13 Z"
      fill="url(#star-gradient)"
      filter="url(#glow)"
      opacity="0.7"
    />
    <path
      d="M 0 -11 C 0 -2 2 0 11 0 C 2 0 0 2 0 11 C 0 2 -2 0 -11 0 C -2 0 0 -2 0 -11 Z"
      fill="url(#star-gradient)"
    />
  </g>
</svg>
`;

const createIcoFromPng = (pngBuffer: Buffer): Buffer => {
  const header = Buffer.alloc(22);
  
  // ICONDIR Header
  header.writeUInt16LE(0, 0); // Reserved.
  header.writeUInt16LE(1, 2); // Resource Type (1 for icon)
  header.writeUInt16LE(1, 4); // Number of images (1)

  // ICONDIRENTRY structure
  header.writeUInt8(32, 6); // Width
  header.writeUInt8(32, 7); // Height
  header.writeUInt8(0, 8);  // Color count
  header.writeUInt8(0, 9);  // Reserved
  header.writeUInt16LE(1, 10); // Color planes
  header.writeUInt16LE(32, 12); // Bits per pixel
  header.writeUInt32LE(pngBuffer.length, 14); // Size of image data
  header.writeUInt32LE(22, 18); // Offset of image data

  return Buffer.concat([header, pngBuffer]);
};

async function main() {
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const svgBuffer = Buffer.from(svgLogo);

  console.log('Generating favicon assets in /public...');

  // 1. Generate 16x16 PNG favicon
  await sharp(svgBuffer)
    .resize(16, 16)
    .png()
    .toFile(path.join(publicDir, 'favicon-16x16.png'));
  console.log('✔ Generated favicon-16x16.png');

  // 2. Generate 32x32 PNG favicon
  const png32Buffer = await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), png32Buffer);
  console.log('✔ Generated favicon-32x32.png');

  // 3. Generate apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✔ Generated apple-touch-icon.png');

  // 4. Generate favicon.ico file using the 32x32 PNG buffer
  const icoBuffer = createIcoFromPng(png32Buffer);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('✔ Generated favicon.ico');

  console.log('All favicon assets built successfully!');
}

main().catch((err) => {
  console.error('Error generating favicon assets:', err);
  process.exit(1);
});
