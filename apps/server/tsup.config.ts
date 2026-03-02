import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/instrument.ts'],
    outDir: 'dist',
    format: 'esm',
    target: 'node22',
    platform: 'node',
    splitting: false,
    sourcemap: true,
    clean: true,
    external: [/^[^./]/],
  },
  {
    entry: ['prisma/seed.ts', 'prisma/seed-achievements.ts'],
    outDir: 'dist/seeds',
    format: 'esm',
    target: 'node22',
    platform: 'node',
    external: [/^[^./]/],
  },
]);
