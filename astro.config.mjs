// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://picture-zip.com',
  output: 'static',
  integrations: [
    preact({ compat: true }),
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en-US', zh: 'zh-CN' },
      },
    }),
  ],
  vite: {
    worker: {
      format: 'es',
    },
    build: {
      target: 'es2022',
    },
  },
});