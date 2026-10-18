import { createInterface } from 'node:readline/promises';
import { readFile, writeFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
const terminal = createInterface({ input: process.stdin, output: process.stdout });
try {
  console.log('Choose a password with at least 12 characters. Input is visible in this terminal.');
  const password = await terminal.question('New admin password: ');
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw new Error('Password must have at least 12 characters and at most 72 UTF-8 bytes.');
  const path = new URL('../.env', import.meta.url);
  const content = await readFile(path, 'utf8');
  const hash = await bcrypt.hash(password, 12);
  const next = content.match(/^ADMIN_PASSWORD_HASH=.*$/m)
    ? content.replace(/^ADMIN_PASSWORD_HASH=.*$/gm, () => `ADMIN_PASSWORD_HASH=${hash}`)
    : `${content}\nADMIN_PASSWORD_HASH=${hash}\n`;
  // The generated hash replaces the plain setting so an old password is not retained.
  await writeFile(path, next.replace(/^ADMIN_PASSWORD=.*$/gm, 'ADMIN_PASSWORD='));
  console.log('Password updated. Restart the API.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { terminal.close(); }
