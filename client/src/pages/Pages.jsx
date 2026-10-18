import { useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, Mail, Phone, MapPin, FlaskConical, Microscope, PackageCheck, MessageSquare } from 'lucide-react';
import { Seo } from '../components/Seo';
import { Reveal } from '../components/Reveal';
import { RequestForm } from '../components/RequestForm';
import { useLocale } from '../context/LocaleContext';
import { useData } from '../context/DataContext';
import { DirectContacts, TelegramIcon, TelegramLink } from '../components/TelegramContact';
import { telegramContact } from '../lib/contacts';
import { industryIcons, RequestSection } from './Home';

function Intro({ label, title, text }) {
  return <section className="page-intro"><div className="container">{label && <span className="section-label">{label}</span>}<h1>{title}</h1>{text && <p>{text}</p>}</div></section>;
}
export function About() {
  const { t } = useLocale();
  return <><Seo title={t('nav.about')} description={t('about.text')} /><Intro label={t('about.label')} title={t('about.title')} /><Reveal><section className="section"><div className="container about-page-grid"><div className="about-photo" data-reveal><img src="/hero-bg.jpg" alt={t('hero.imageAlt')} width="800" height="900" /><span>{t('about.imageCaption')}</span></div><div className="about-page-text" data-reveal><FlaskConical size={40} strokeWidth={1.2} /><h2>{t('about.valuesTitle')}</h2><p>{t('about.text')}</p><p>{t('about.text2')}</p></div></div></section><section className="section values-section"><div className="container values-grid">{[Microscope, PackageCheck, MessageSquare].map((Icon, index) => <article key={index} data-reveal><Icon size={34} strokeWidth={1.3} /><h3>{t(`about.value${index + 1}`)}</h3><p>{t(`about.value${index + 1}Text`)}</p></article>)}</div></section><RequestSection /></Reveal></>;
}
export function Applications() {
  const { t, link } = useLocale();
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const timer = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'instant', block: 'start' }), 50);
    return () => clearTimeout(timer);
  }, [hash]);
  return <><Seo title={t('nav.applications')} description={t('applications.description')} /><Intro label={t('applications.label')} title={t('applications.title')} text={t('applications.description')} /><Reveal><section className="section"><div className="container applications-list">{Object.entries(industryIcons).map(([category, Icon]) => <article className="application-detail" id={category} key={category} data-reveal><div className={`application-visual application-${category}`}><Icon size={100} strokeWidth={.65} /><span>{t(`applications.${category}`)}</span></div><div className="application-copy"><h2>{t(`applications.${category}`)}</h2><p>{t(`applications.${category}Text`)}</p><h3>{t('applications.examples')}</h3><p className="application-examples">{t(`applications.${category}Examples`)}</p><Link className="button button-outline" to={link('/request')}>{t('applications.choose')}<ArrowUpRight size={18} /></Link></div></article>)}<p className="safety-note">{t('applications.safety')}</p></div></section></Reveal></>;
}
export function Request() {
  const { t } = useLocale();
  const [params] = useSearchParams();
  return <><Seo title={t('request.pageTitle')} description={t('request.description')} /><Intro label={t('request.label')} title={t('request.pageTitle')} text={t('request.description')} /><section className="section request-page-section"><div className="container request-page-grid"><div className="request-steps">{[1, 2, 3].map((step) => <div className="request-step" key={step}><span>0{step}</span><div><h2>{t(`request.step${step}`)}</h2><p>{t(`request.step${step}Text`)}</p></div></div>)}<p className="form-note">{t('request.note')}</p><div className="request-still"><img src="/images/citrus.webp" alt="" loading="lazy" width="600" height="600" /></div></div><div className="request-form-panel"><RequestForm initialProduct={params.get('product') || ''} /><DirectContacts /></div></div></section></>;
}
export function Contacts() {
  const { t, link } = useLocale();
  const { settings } = useData();
  const contacts = settings.data?.contacts || {};
  return <><Seo title={t('nav.contacts')} description={t('contacts.description')} /><Intro label={t('contacts.hours')} title={t('contacts.title')} text={t('contacts.description')} /><section className="section"><div className="container contacts-grid"><div className="contact-copy">{contacts.phone && <div className="contact-item"><Phone size={24} /><div><h2>{t('contacts.phone')}</h2><a href={`tel:${contacts.phone.replace(/[^+\d]/g, '')}`}>{contacts.phone}</a></div></div>}{telegramContact(contacts.telegram) && <div className="contact-item"><TelegramIcon size={24} /><div><h2>{t('contacts.telegram')}</h2><TelegramLink value={contacts.telegram} /></div></div>}{contacts.email && <div className="contact-item"><Mail size={24} /><div><h2>{t('contacts.email')}</h2><a href={`mailto:${contacts.email}`}>{contacts.email}</a></div></div>}{contacts.address && <div className="contact-item"><MapPin size={24} /><div><h2>{t('contacts.address')}</h2><p>{contacts.address}</p></div></div>}{!contacts.phone && !contacts.email && !contacts.address && !telegramContact(contacts.telegram) && <div className="contact-invitation"><MessageSquare size={38} strokeWidth={1.2} /><h2>{t('footer.contact')}</h2><p>{t('contacts.empty')}</p><Link className="text-link" to={link('/collection')}>{t('common.collection')}<ArrowRight size={18} /></Link></div>}</div><div className="request-form-panel"><h2>{t('request.pageTitle')}</h2><RequestForm compact /></div></div></section></>;
}
export function Privacy() {
  const { t } = useLocale();
  return <><Seo title={t('privacy.title')} /><Intro title={t('privacy.title')} /><section className="section"><article className="container prose"><p>{t('privacy.intro')}</p>{['data', 'use', 'rights', 'retention'].map((key) => <section key={key}><h2>{t(`privacy.${key}Title`)}</h2><p>{t(`privacy.${key}`)}</p></section>)}</article></section></>;
}
export function NotFound() {
  const { t, link } = useLocale();
  return <><Seo title={t('common.notFound')} noindex /><section className="section not-found container"><span className="error-number">404</span><h1>{t('common.notFound')}</h1><p>{t('common.notFoundText')}</p><Link to={link('/')} className="button button-navy">{t('common.home')}<ArrowUpRight size={18} /></Link></section></>;
}
