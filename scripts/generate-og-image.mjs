import sharp from 'sharp';
import { writeFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, '..', 'public', 'og-image.png');

const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="50%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="630" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
  <g transform="translate(80, 200)">
    <rect width="64" height="64" rx="14" fill="#fff" opacity="0.95"/>
    <path d="M32 14l12 12-4 4-6-6v18h-4V24l-6 6-4-4z" fill="#2563eb"/>
    <path d="M18 44h28v4H18z" fill="#2563eb" opacity="0.9"/>
  </g>
  <text x="170" y="245" font-family="system-ui, -apple-system, sans-serif" font-size="56" font-weight="700" fill="#fff">picture-zip</text>
  <text x="80" y="330" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="400" fill="rgba(255,255,255,0.85)">Compress &amp; convert images — 100% local</text>
  <text x="80" y="380" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="400" fill="rgba(255,255,255,0.65)">JPEG · WebP · AVIF · PNG · GIF · HEIC</text>
  <g transform="translate(80, 460)">
    <rect width="180" height="44" rx="22" fill="rgba(255,255,255,0.15)"/>
    <text x="90" y="29" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#fff">No upload · No limits</text>
  </g>
  <g transform="translate(280, 460)">
    <rect width="160" height="44" rx="22" fill="rgba(255,255,255,0.15)"/>
    <text x="80" y="29" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#fff">Free &amp; open source</text>
  </g>
</svg>`;

async function generateOgImage() {
  const buffer = Buffer.from(svg);
  let pngBuffer = await sharp(buffer).png().toBuffer();

  if (pngBuffer.length > 300 * 1024) {
    pngBuffer = await sharp(buffer).png({ quality: 80, compressionLevel: 9 }).toBuffer();
  }

  if (pngBuffer.length > 300 * 1024) {
    pngBuffer = await sharp(buffer).jpeg({ quality: 85 }).toBuffer();
    const jpgPath = outputPath.replace('.png', '.jpg');
    writeFileSync(jpgPath, pngBuffer);
    console.log(`OG image generated: ${jpgPath} (${(pngBuffer.length / 1024).toFixed(0)}KB)`);
    return;
  }

  writeFileSync(outputPath, pngBuffer);
  console.log(`OG image generated: ${outputPath} (${(pngBuffer.length / 1024).toFixed(0)}KB)`);
}

generateOgImage().catch((err) => {
  console.error('Failed to generate OG image:', err);
  process.exit(1);
});