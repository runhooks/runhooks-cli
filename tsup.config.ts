import { defineConfig } from 'tsup';

// Bundles the CLI into a single self-contained ESM file for npm publishing.
//
// The CLI has no internal workspace dependencies at runtime — its API contract
// lives in src/api-contract.ts (see the note there). `commander` is the only
// real runtime dependency and stays external; everything else it imports
// (notably `zod`, used by the contract schemas) is a devDependency and is
// therefore inlined into dist/index.js by tsup.
//
// The shebang on src/index.ts is preserved by tsup and the output is marked executable.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  bundle: true,
  clean: true,
  dts: false, // a CLI bin ships no type declarations
  sourcemap: false,
  minify: false,
});
