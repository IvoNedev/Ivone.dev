import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../js/games');

mkdirSync(outDir, { recursive: true });

const games = [
  ['space-salvage-swarm', 'main.ts'],
  ['micro-kingdom-skirmish', 'main.ts'],
  ['sky-island-sprint', 'main.ts'],
  ['fungal-frontier', 'main.ts'],
  ['clockwork-siege', 'main.ts']
];

async function buildAll() {
  try {
    await Promise.all(
      games.map(([folder, entry]) =>
        build({
          entryPoints: [path.resolve(__dirname, folder, entry)],
          bundle: true,
          outfile: path.join(outDir, `${folder}.bundle.js`),
          sourcemap: true,
          target: 'es2020',
          format: 'iife',
          globalName: folder.replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
          loader: {
            '.png': 'file',
            '.jpg': 'file',
            '.mp3': 'file'
          }
        })
      )
    );
    console.log('Game bundles built successfully.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

buildAll();
