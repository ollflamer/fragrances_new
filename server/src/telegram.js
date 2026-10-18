export async function deliverRequest(db, config, id, fetcher = fetch) {
  if (!config.telegramToken || !config.telegramChatId) return 'pending';
  const claim = await db.sampleRequest.updateMany({
    where: { id, telegramStatus: { in: ['pending', 'failed'] }, telegramAttempts: { lt: 5 } },
    data: { telegramStatus: 'sending', telegramAttempts: { increment: 1 } },
  });
  if (!claim.count) return 'skipped';
  const item = await db.sampleRequest.findUnique({ where: { id } });
  try {
    const response = await fetcher(`https://api.telegram.org/bot${config.telegramToken}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        chat_id: config.telegramChatId,
        text: `Новая заявка · Fragrances & Co\n№ ${item.id}\nИмя: ${item.name}\nКонтакт: ${item.contact}\nКомпания: ${item.company || '—'}\nПродукт: ${item.productName || 'Консультация'}\nСообщение: ${item.message || '—'}\nЯзык: ${item.locale}`,
      }),
    });
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error('Telegram delivery failed');
    await db.sampleRequest.update({ where: { id }, data: { telegramStatus: 'sent' } });
    return 'sent';
  } catch {
    await db.sampleRequest.update({ where: { id }, data: { telegramStatus: 'failed' } });
    return 'failed';
  }
}

export async function retryRequests(db, config) {
  if (!config.telegramToken || !config.telegramChatId) return;
  const rows = await db.sampleRequest.findMany({
    where: { telegramStatus: { in: ['pending', 'failed'] }, telegramAttempts: { lt: 5 } },
    orderBy: { createdAt: 'asc' }, take: 10,
  });
  for (const row of rows) await deliverRequest(db, config, row.id);
}
