import bcrypt from 'bcryptjs';

export function resolveAdminPasswordHash(env) {
  const hash = env.ADMIN_PASSWORD_HASH || '';
  if (hash) {
    if (!/^\$2[aby]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/.test(hash)) {
      throw new Error('ADMIN_PASSWORD_HASH must contain a bcrypt hash. For a plain password, use ADMIN_PASSWORD instead, or run npm run admin:password.');
    }
    return hash;
  }
  const password = env.ADMIN_PASSWORD || '';
  if (!password) return '';
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('ADMIN_PASSWORD must be at most 72 UTF-8 bytes.');
  }
  return bcrypt.hashSync(password, 12);
}
