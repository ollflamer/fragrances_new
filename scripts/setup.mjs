import { existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
if (!existsSync(`${root}.env`)) copyFileSync(`${root}.env.example`, `${root}.env`);
mkdirSync(`${root}images/uploads`, { recursive: true });
for (const file of ['logo.png', 'favicon.png']) {
  if (!existsSync(`${root}images/${file}`) && existsSync(`${root}img/${file}`)) {
    copyFileSync(`${root}img/${file}`, `${root}images/${file}`);
  }
}
console.log('Environment and image directory are ready. Set an admin password with npm run admin:password.');
