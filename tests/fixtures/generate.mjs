import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname);

async function save(name, buffer) {
  const path = resolve(outDir, name);
  writeFileSync(path, buffer);
  console.log(`  ${name}: ${buffer.length} bytes`);
}

function makeGradientPNG(width, height, withAlpha) {
  const channels = withAlpha ? 4 : 3;
  const raw = Buffer.alloc(width * height * channels);
  let off = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      raw[off++] = Math.round((x / width) * 255);
      raw[off++] = Math.round((y / height) * 255);
      raw[off++] = 128;
      if (withAlpha) {
        raw[off++] = x < width / 2 ? 0 : 255;
      }
    }
  }
  return sharp(raw, { raw: { width, height, channels } }).png().toBuffer();
}

async function main() {
  console.log('Generating test fixtures with sharp...');

  await save('sample-jpeg-small.jpg', await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 100, b: 50 } } }).jpeg({ quality: 80 }).toBuffer());

  await save('sample-jpeg-medium.jpg', await sharp({ create: { width: 2000, height: 2000, channels: 3, background: { r: 100, g: 200, b: 50 } } }).jpeg({ quality: 85 }).toBuffer());

  await save('sample-png-with-alpha.png', await makeGradientPNG(200, 200, true));

  await save('sample-png-opaque.png', await makeGradientPNG(200, 200, false));

  await save('sample-webp.webp', await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 50, g: 100, b: 200 } } }).webp({ quality: 80 }).toBuffer());

  await save('sample-gif.gif', await sharp({ create: { width: 50, height: 50, channels: 3, background: { r: 255, g: 0, b: 0 } } }).gif().toBuffer());

  const validJpeg = await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 128, g: 128, b: 128 } } }).jpeg().toBuffer();
  await save('corrupted-jpeg.jpg', validJpeg.subarray(0, validJpeg.length - 50));

  const bmpData = Buffer.alloc(54 + 30);
  bmpData.write('BM', 0);
  bmpData.writeUInt32LE(84, 2);
  bmpData.writeUInt32LE(54, 10);
  bmpData.writeUInt32LE(40, 14);
  bmpData.writeUInt32LE(10, 18);
  bmpData.writeUInt32LE(1, 22);
  bmpData.writeUInt16LE(1, 26);
  bmpData.writeUInt16LE(24, 28);
  bmpData.writeUInt32LE(30, 34);
  await save('unsupported.bmp', bmpData);

  const tiffData = Buffer.alloc(98);
  tiffData.write('II', 0);
  tiffData.writeUInt16LE(42, 2);
  tiffData.writeUInt32LE(8, 4);
  tiffData.writeUInt16LE(6, 8);
  await save('unsupported.tiff', tiffData);

  await save('id-photo-5mb.jpg', await sharp({ create: { width: 3000, height: 4000, channels: 3, background: { r: 200, g: 180, b: 160 } } }).jpeg({ quality: 90 }).toBuffer());

  await save('high-res-photo.jpg', await sharp({ create: { width: 4000, height: 4000, channels: 3, background: { r: 100, g: 150, b: 200 } } }).jpeg({ quality: 85 }).toBuffer());

  await save('sample-jpeg-large.jpg', await sharp({ create: { width: 5000, height: 5000, channels: 3, background: { r: 50, g: 100, b: 150 } } }).jpeg({ quality: 95 }).toBuffer());

  console.log('Done.');
}

main().catch(console.error);
