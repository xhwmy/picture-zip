import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../../public');

async function generateDemoPhoto(width, height) {
  const channels = 3;
  const raw = Buffer.alloc(width * height * channels);
  let off = 0;

  const noise = randomBytes(width * height * channels);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;

      let r = Math.round(180 + 60 * Math.sin(x / 200) * Math.cos(y / 180));
      let g = Math.round(160 + 50 * Math.cos(x / 220 + y / 150));
      let b = Math.round(140 + 70 * Math.sin(y / 200));

      const cx = width / 2;
      const cy = height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const vignette = 1 - Math.min(1, dist / (Math.max(width, height) * 0.7)) * 0.4;
      r *= vignette;
      g *= vignette;
      b *= vignette;

      if (x > width * 0.15 && x < width * 0.55 && y > height * 0.2 && y < height * 0.5) {
        const t = (Math.sin(x / 8) + Math.cos(y / 6)) * 20;
        r = Math.min(255, r + t);
        g = Math.min(255, g + t * 0.8);
        b = Math.min(255, b + t * 0.6);
      }

      if (x > width * 0.6 && x < width * 0.85 && y > height * 0.55 && y < height * 0.8) {
        r = Math.min(255, r + 40);
        g = Math.min(255, g + 30);
        b = Math.min(255, b + 20);
      }

      const n = noise[i] - 128;
      r = Math.max(0, Math.min(255, r + n * 0.15));
      g = Math.max(0, Math.min(255, g + n * 0.15));
      b = Math.max(0, Math.min(255, b + n * 0.15));

      raw[off++] = Math.round(r);
      raw[off++] = Math.round(g);
      raw[off++] = Math.round(b);
    }
  }

  return sharp(raw, { raw: { width, height, channels } });
}

async function main() {
  console.log('Generating demo images...');

  mkdirSync(publicDir, { recursive: true });

  const width = 1600;
  const height = 1200;

  const photo = await generateDemoPhoto(width, height);

  const beforeBuffer = await photo.clone().jpeg({ quality: 92 }).toBuffer();
  writeFileSync(resolve(publicDir, 'demo-before.jpg'), beforeBuffer);
  console.log(`  demo-before.jpg: ${beforeBuffer.length} bytes (${(beforeBuffer.length / 1024).toFixed(0)} KB)`);

  const afterBuffer = await photo.clone().resize(800, 600).jpeg({ quality: 30 }).toBuffer();
  writeFileSync(resolve(publicDir, 'demo-after.jpg'), afterBuffer);
  console.log(`  demo-after.jpg: ${afterBuffer.length} bytes (${(afterBuffer.length / 1024).toFixed(0)} KB)`);

  const beforeKB = beforeBuffer.length / 1024;
  const afterKB = afterBuffer.length / 1024;
  const reduction = Math.round((1 - afterBuffer.length / beforeBuffer.length) * 100);
  console.log(`\nLabels:`);
  console.log(`  Before: ${beforeKB > 1024 ? (beforeKB / 1024).toFixed(1) + ' MB' : Math.round(beforeKB) + ' KB'}`);
  console.log(`  After: ${Math.round(afterKB)} KB`);
  console.log(`  Reduction: ${reduction}% smaller`);

  console.log('Done.');
}

main().catch(console.error);