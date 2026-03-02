import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  ssr: {
    // Bundle all deps into the SSR output so the runner image needs no
    // node_modules at all — keeps production image minimal.
    //    noExternal: false,
    // OpenTelemetry packages are CJS-only and break Vite's SSR module
    // runner — let Node.js load them natively instead.
    //  external: [/^@opentelemetry\//, /^@sentry\//],
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
