import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, CheckCheck, FileCheck2, FlaskConical, Flower2, Sparkles, SprayCan, Wheat, Check } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLocale } from '../context/LocaleContext';
import { DirectContacts } from '../components/TelegramContact';
import { useApi } from '../lib/useApi';
import { Seo } from '../components/Seo';
import { ProductCard } from '../components/ProductCard';
import { RequestForm } from '../components/RequestForm';
import { Reveal } from '../components/Reveal';
import { Status } from '../components/Status';
gsap.registerPlugin(useGSAP, ScrollTrigger);
export const industryIcons = { cosmetics: Flower2, household: SprayCan, perfumery: Sparkles, food: Wheat };

export function IndustryCards() {
  const { t, link } = useLocale();
  return <div className="industry-grid">{Object.entries(industryIcons).map(([category, Icon]) => <Link key={category} className="industry-card" to={`${link('/applications')}#${category}`} data-reveal><Icon className="industry-icon" size={34} strokeWidth={1.25} /><h3>{t(`applications.${category}`)}</h3><p>{t(`applications.${category}Text`)}</p><span className="industry-arrow"><ArrowUpRight size={22} /></span></Link>)}</div>;
}

export function RequestSection() {
  const { t } = useLocale();
  return <section className="request-section section" id="sample-request"><div className="container request-grid"><div className="request-intro" data-reveal><span className="section-label">{t('request.label')}</span><h2>{t('request.title')}</h2><p>{t('request.description')}</p><div className="request-benefits">{[1, 2, 3].map((step) => <div key={step}><span className="step-number">0{step}</span><div><h3>{t(`request.step${step}`)}</h3><p>{t(`request.step${step}Text`)}</p></div></div>)}</div><DirectContacts /></div><div className="request-form-panel" data-reveal><h3>{t('request.pageTitle')}</h3><RequestForm compact /><p className="form-note">{t('request.note')}</p></div></div></section>;
}

export default function Home() {
  const { t, link, locale } = useLocale();
  const featured = useApi('/products?featured=true');
  const pageRef = useRef(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('[data-hero]', { opacity: 0, y: 24, duration: .9, stagger: .12, ease: 'power2.out', clearProps: 'all' });
      gsap.fromTo('.hero-visual', { y: -20 }, { y: 50, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .8 } });
      gsap.utils.toArray('[data-count]').forEach((element) => {
        const value = Number(element.dataset.count);
        const counter = { value: 0 };
        gsap.to(counter, { value, duration: 1.35, ease: 'power2.out', scrollTrigger: { trigger: element, start: 'top 92%', once: true }, onUpdate: () => { element.textContent = Math.round(counter.value); } });
      });
      return () => gsap.utils.toArray('[data-count]').forEach((element) => { element.textContent = element.dataset.count; });
    });
    return () => media.revert();
  }, { scope: pageRef, dependencies: [locale], revertOnUpdate: true });
  return <div ref={pageRef}>
    <Seo title={locale === 'ru' ? 'Промышленное сырьё и парфюмерные отдушки' : t('hero.title')} description={locale === 'ru' ? 'Поставка промышленного сырья и парфюмерных отдушек для косметики, бытовой химии и пищевой промышленности. Запросите пробную партию.' : t('hero.description')} />
    <section className="hero">
      <img className="hero-visual" src="/hero-bg.jpg" alt={t('hero.imageAlt')} width="1536" height="1024" fetchpriority="high" />
      <div className="hero-shade" />
      <div className="container hero-inner"><div className="hero-copy">
        <div className="hero-eyebrow" data-hero><span />{t('hero.eyebrow')}</div>
        <h1 data-hero>{t('hero.title')}</h1><p className="hero-description" data-hero>{t('hero.description')}</p>
        <div className="hero-buttons" data-hero><Link className="button button-gold" to={link('/request')}>{t('common.sample')}<ArrowUpRight size={20} /></Link><Link className="button button-light-outline" to={link('/collection')}>{t('common.collection')}<ArrowUpRight size={20} /></Link></div>
      </div><div className="hero-bottom"><span><FlaskConical size={17} strokeWidth={1.4} />{t('hero.bottom')}</span><a href="#possibilities">{t('hero.scroll')}<ArrowDown size={17} /></a></div></div>
      <div className="hero-side-note" aria-hidden="true">Fragrances & Co</div>
    </section>
    <div className="trust-band"><div className="container trust-inner">{[CheckCheck, FileCheck2, FlaskConical].map((Icon, index) => <div key={index}><Icon size={23} strokeWidth={1.4} /><span>{t(`trust.${['one', 'two', 'three'][index]}`)}</span></div>)}</div></div>
    <Reveal watch={featured.data}>
      <section className="section about-preview" id="possibilities"><div className="container"><span className="section-label" data-reveal>{t('about.label')}</span><div className="about-preview-grid"><h2 data-reveal>{t('about.title')}</h2><div data-reveal><p>{t('about.text')}</p><Link className="text-link" to={link('/about')}>{t('about.link')}<ArrowUpRight size={18} /></Link></div></div><div className="stats-row">{[4, 3, 3].map((value, index) => <div className="stat" key={index} data-reveal><span className="stat-value"><span data-count={value}>{value}</span><span className="stat-mark">{index === 0 ? '+' : ''}</span></span><span>{t(`about.stat${index + 1}`)}</span></div>)}<div className="stat-note" data-reveal><span className="small-seal"><Check size={22} /></span><p>{t('footer.made')}</p></div></div></div></section>
      <section className="section applications-preview"><div className="container"><div className="section-heading"><div data-reveal><span className="section-label">{t('applications.label')}</span><h2>{t('applications.title')}</h2></div><Link className="text-link" to={link('/applications')} data-reveal>{t('applications.link')}<ArrowUpRight size={18} /></Link></div><IndustryCards /></div></section>
      <section className="section collection-preview"><div className="container"><div className="section-heading"><div data-reveal><span className="section-label">{t('collection.label')}</span><h2>{t('collection.title')}</h2></div><Link className="text-link" to={link('/collection')} data-reveal>{t('collection.link')}<ArrowUpRight size={18} /></Link></div><Status loading={featured.loading} error={featured.error} retry={featured.reload} /><div className="product-grid">{featured.data?.slice(0, 6).map((product) => <ProductCard key={product.id} product={product} />)}</div>{featured.data?.some((product) => product.isDemo) && <p className="demo-caption">{t('common.demo')}. {t('common.demoNote')}</p>}{featured.data?.length === 0 && <p className="empty-state">{t('common.empty')}</p>}</div></section>
      <RequestSection />
    </Reveal>
  </div>;
}
