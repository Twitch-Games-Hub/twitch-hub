import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  ssr: {
    // Bundle all deps into the SSR output so the runner image needs no
    // node_modules at all — avoids Bun workspace hoisting ambiguity.
    noExternal: true,
  },
  plugins: [
    sentrySvelteKit({
      sourceMapsUploadOptions: {
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          assets: ['./build/**/*'],
        },
      },
      autoUploadSourceMaps: !!process.env.SENTRY_AUTH_TOKEN,
      autoInstrument: {
        load: true,
        serverLoad: true,
      },
    }),
    tailwindcss(),
    sveltekit(),
  ],
});
