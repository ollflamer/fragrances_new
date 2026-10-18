import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, X, ArrowRight, FlaskConical } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useData } from '../context/DataContext';
import { FloatingTelegram, TelegramIcon, TelegramLink } from './TelegramContact';

export function Layout() {
  const { t, locale, setLocale, link } = useLocale();
  const { settings } = useData();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  const nav = ['about', 'collection', 'applications', 'contacts'];
  const contacts = settings.data?.contacts;
  return <>
    <a href="#main" className="skip-link">{locale === 'ru' ? 'Перейти к содержимому' : locale === 'uz' ? 'Kontentga o‘tish' : 'Skip to content'}</a>
    <div className="utility-bar"><div className="container flex items-center justify-between gap-4"><span>{t('common.tagline')}</span><div className="utility-contacts">{contacts?.phone && <a href={`tel:${contacts.phone.replace(/[^+\d]/g, '')}`}>{contacts.phone}</a>}<TelegramLink value={contacts?.telegram}><TelegramIcon size={12} />{contacts?.telegram}</TelegramLink></div></div></div>
    <header className="site-header">
      <div className="container header-inner">
        <Link to={link('/')} className="brand" aria-label="Fragrances & Co — Home"><img src="/images/logo.png" width="720" height="203" alt="Fragrances & Co" /></Link>
        <nav className="desktop-nav" aria-label={t('footer.navigation')}>{nav.map((page) => <NavLink key={page} to={link(`/${page}`)}>{t(`nav.${page}`)}</NavLink>)}</nav>
        <div className="header-actions">
          <div className="language-switch" role="group" aria-label="Language / Язык / Til">{['ru', 'uz', 'en'].map((lang) => <button key={lang} onClick={() => setLocale(lang)} aria-pressed={locale === lang} className={locale === lang ? 'selected' : ''}>{lang.toUpperCase()}</button>)}</div>
          <Link className="button button-navy header-cta" to={link('/request')}>{t('nav.request')}<ArrowUpRight size={16} /></Link>
          <button className="menu-button icon-button" aria-expanded={open} aria-controls="mobile-nav" aria-label={t(open ? 'nav.close' : 'nav.menu')} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        </div>
      </div>
      {open && <nav id="mobile-nav" className="mobile-nav" aria-label={t('nav.menu')}>{nav.map((page) => <NavLink key={page} to={link(`/${page}`)}>{t(`nav.${page}`)}<ArrowUpRight size={18} /></NavLink>)}<Link className="button button-navy" to={link('/request')}>{t('nav.request')}<ArrowRight size={18} /></Link></nav>}
    </header>
    <main id="main" tabIndex={-1}><Outlet /></main>
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand"><Link className="brand" to={link('/')}><img src="/images/logo.png" width="720" height="203" alt="Fragrances & Co" loading="lazy" /></Link><p>{t('footer.description')}</p><span className="footer-signoff"><FlaskConical size={16} />{t('common.tagline')}</span></div>
        <div><h3>{t('footer.navigation')}</h3><Link to={link('/about')}>{t('nav.about')}</Link><Link to={link('/collection')}>{t('nav.collection')}</Link><Link to={link('/applications')}>{t('nav.applications')}</Link><Link to={link('/contacts')}>{t('nav.contacts')}</Link></div>
        <div><h3>{t('footer.solutions')}</h3>{['cosmetics', 'household', 'perfumery', 'food'].map((category) => <Link key={category} to={`${link('/applications')}#${category}`}>{t(`applications.${category}`)}</Link>)}</div>
        <div className="footer-contact"><h3>{t('footer.contact')}</h3><Link className="footer-request" to={link('/request')}>{t('nav.request')}<ArrowUpRight size={24} /></Link>{contacts?.email && <a href={`mailto:${contacts.email}`}>{contacts.email}</a>}{contacts?.phone && <a href={`tel:${contacts.phone.replace(/[^+\d]/g, '')}`}>{contacts.phone}</a>}<TelegramLink value={contacts?.telegram} className="footer-telegram"><TelegramIcon size={16} />{contacts?.telegram}</TelegramLink></div>
      </div>
      <div className="container footer-bottom"><span>© {new Date().getFullYear()} Fragrances & Co. {t('footer.copyright')}</span><div><Link to={link('/privacy')}>{t('common.privacy')}</Link><Link to="/admin">{t('common.admin')}</Link></div></div>
    </footer>
    <FloatingTelegram />
  </>;
}
