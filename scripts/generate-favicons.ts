import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svgPath = path.resolve('public/favicon.svg');
const destDir = path.resolve('public');

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
  console.log('Generating high-fidelity PWA, Apple touch, and standard favicon assets...');

  if (!fs.existsSync(svgPath)) {
    console.error(`Error: Source SVG not found at ${svgPath}`);
    process.exit(1);
  }

  try {
    // 1. Generate favicon-16x16.png (transparent background for clean tab integration)
    await sharp(svgPath)
      .resize(16, 16)
      .png()
      .toFile(path.join(destDir, 'favicon-16x16.png'));
    console.log('✔ Generated favicon-16x16.png (transparent)');

    // 2. Generate favicon-32x32.png (transparent)
    const png32Buffer = await sharp(svgPath)
      .resize(32, 32)
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(destDir, 'favicon-32x32.png'), png32Buffer);
    console.log('✔ Generated favicon-32x32.png (transparent)');

    // 3. Generate favicon.ico (transparent compatible ICO)
    const icoBuffer = createIcoFromPng(png32Buffer);
    fs.writeFileSync(path.join(destDir, 'favicon.ico'), icoBuffer);
    console.log('✔ Generated favicon.ico (transparent)');

    // 4. Generate premium apple-touch-icon.png with a solid black background matching the uploaded logo design exactly
    const svg140Buffer = await sharp(svgPath).resize(140, 140).toBuffer();
    await sharp({
      create: {
        width: 180,
        height: 180,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    })
    .composite([{ input: svg140Buffer, gravity: 'center' }])
    .png()
    .toFile(path.join(destDir, 'apple-touch-icon.png'));
    console.log('✔ Generated apple-touch-icon.png (180x180 with solid black background)');

    // 5. Generate android-chrome-192x192.png (PWA icon) with a solid black background
    const svg150Buffer = await sharp(svgPath).resize(150, 150).toBuffer();
    await sharp({
      create: {
        width: 192,
        height: 192,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    })
    .composite([{ input: svg150Buffer, gravity: 'center' }])
    .png()
    .toFile(path.join(destDir, 'android-chrome-192x192.png'));
    console.log('✔ Generated android-chrome-192x192.png (192x192 with solid black background)');

    // 6. Generate android-chrome-512x512.png (PWA icon) with a solid black background
    const svg400Buffer = await sharp(svgPath).resize(400, 400).toBuffer();
    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    })
    .composite([{ input: svg400Buffer, gravity: 'center' }])
    .png()
    .toFile(path.join(destDir, 'android-chrome-512x512.png'));
    console.log('✔ Generated android-chrome-512x512.png (512x512 with solid black background)');

    // 7. Generate favicon.png with solid black background for a general solid black backup image
    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    })
    .composite([{ input: svg400Buffer, gravity: 'center' }])
    .png()
    .toFile(path.join(destDir, 'favicon.png'));
    console.log('✔ Generated favicon.png (512x512 with solid black background)');

    console.log('All branding assets generated completely and successfully!');
  } catch (error) {
    console.error('Failed to generate favicon assets:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error generating favicon assets:', err);
  process.exit(1);
});
