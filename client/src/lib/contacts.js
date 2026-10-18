export function telegramContact(value) {
  if (typeof value !== 'string') return null;
  const username = value.trim().replace(/^@/, '');
  if (!/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(username)) return null;
  return { label: `@${username}`, href: `https://t.me/${username}` };
}
