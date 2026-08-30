import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

async function globalSetup() {
  const distIndex = resolve(process.cwd(), 'dist', 'index.html');
  if (!existsSync(distIndex)) {
    console.log('[global-setup] dist/ not found, running pnpm build...');
    execSync('pnpm build', { stdio: 'inherit', cwd: process.cwd() });
    if (!existsSync(distIndex)) {
      throw new Error('[global-setup] build completed but dist/index.html still missing');
    }
  }
  console.log('[global-setup] dist/ verified');

  const port = process.env.PREVIEW_PORT || '4321';
  process.env.PREVIEW_PORT = port;
  console.log(`[global-setup] preview port: ${port}`);
}

export default globalSetup;