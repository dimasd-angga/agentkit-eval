import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/trace.ts', 'src/output.ts'],
  format: ['esm', 'cjs'],
  dts: { resolve: true, compilerOptions: { composite: false, incremental: false } },
  tsconfig: 'tsconfig.build.json',
  clean: true,
  sourcemap: true,
  target: 'node20',
});
