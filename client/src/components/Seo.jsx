import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { useData } from '../context/DataContext';
export function Seo({ title, description, noindex = false }) {
  const { locale, t } = useLocale();
  const { settings } = useData();
  const { pathname } = useLocation();
  const base = settings.data?.siteUrl || window.location.origin;
  const url = `${base}${pathname}`;
  const fullTitle = `${title || t('hero.title')} | Fragrances & Co`;
  const text = description || t('hero.description');
  return <Helmet>
    <html lang={locale} />
    <title>{fullTitle}</title>
    <meta name="description" content={text} />
    <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
    <link rel="canonical" href={`${url}${locale === 'ru' ? '' : `?lang=${locale}`}`} />
    {['ru', 'uz', 'en'].map((lang) => <link key={lang} rel="alternate" hrefLang={lang} href={`${url}${lang === 'ru' ? '' : `?lang=${lang}`}`} />)}
    <link rel="alternate" hrefLang="x-default" href={url} />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Fragrances & Co" />
    <meta property="og:title" content={fullTitle} />
    <meta property="og:description" content={text} />
    <meta property="og:image" content={`${base}/hero-bg.jpg`} />
    <meta property="og:url" content={`${url}${locale === 'ru' ? '' : `?lang=${locale}`}`} />
    <meta property="og:locale" content={{ ru: 'ru_RU', uz: 'uz_UZ', en: 'en_US' }[locale]} />
    <meta name="twitter:card" content="summary_large_image" />
  </Helmet>;
}
