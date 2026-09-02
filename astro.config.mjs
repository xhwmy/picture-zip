// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://xhwmy.github.io',
  base: '/picture-zip',
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
      rollupOptions: {
        output: {
          // Match the main build's asset naming so byte-identical WASM files
          // emitted by both the main graph and the worker graph share one
          // file instead of duplicating ~8MB in dist/.
          assetFileNames: '_astro/[name].[hash][extname]',
        },
      },
    },
    build: {
      target: 'es2022',
    },
  },
});