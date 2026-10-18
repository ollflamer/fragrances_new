import { useLocale } from '../context/LocaleContext';
import { useData } from '../context/DataContext';
import { telegramContact } from '../lib/contacts';

export function TelegramIcon({ size = 24, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}><path d="M21.67 3.1c.3.23.4.7.28 1.33l-3.3 15.56c-.25 1.1-.9 1.36-1.81.85l-5.03-3.71-2.43 2.34c-.27.27-.49.49-.99.49l.35-5.12 9.32-8.42c.4-.35-.09-.55-.61-.2L5.93 13.47l-4.96-1.55c-1.08-.34-1.1-1.08.23-1.6L20.6 2.84c.47-.17.82-.1 1.07.26Z" /></svg>;
}

export function TelegramLink({ value, className = '', children }) {
  const contact = telegramContact(value);
  if (!contact) return null;
  return <a className={className} href={contact.href} target="_blank" rel="noopener noreferrer">{children || contact.label}</a>;
}

export function DirectContacts() {
  const { settings } = useData();
  const { t } = useLocale();
  const contacts = settings.data?.contacts;
  if (!contacts?.phone && !contacts?.email && !telegramContact(contacts?.telegram)) return null;
  return <div className="direct-contact"><p>{t('request.contactUs')}</p>
    {contacts.phone && <a href={`tel:${contacts.phone.replace(/[^+\d]/g, '')}`}>{contacts.phone}</a>}
    {contacts.email && <a href={`mailto:${contacts.email}`}>{contacts.email}</a>}
    <TelegramLink value={contacts.telegram} />
  </div>;
}

export function FloatingTelegram() {
  const { settings } = useData();
  const { t } = useLocale();
  const contact = telegramContact(settings.data?.contacts?.telegram);
  if (!contact) return null;
  return <a className="telegram-floating" href={contact.href} target="_blank" rel="noopener noreferrer" aria-label={`${t('contacts.telegramAction')} — ${contact.label}`} title={`${t('contacts.telegramAction')} — ${contact.label}`}>
    <TelegramIcon size={27} />
    <span>{t('contacts.telegramAction')}<small>{contact.label}</small></span>
  </a>;
}
