import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, ArrowDownUp } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useData } from '../context/DataContext';
import { Seo } from '../components/Seo';
import { Reveal } from '../components/Reveal';
import { ProductCard } from '../components/ProductCard';
import { Status } from '../components/Status';
export default function Collection() {
  const { t, localized, locale } = useLocale();
  const { products, categories } = useData();
  const [params, setParams] = useSearchParams();
  const search = params.get('q') || '';
  const category = params.get('category') || 'all';
  const sort = params.get('sort') || 'default';
  const setFilter = (key, value) => setParams((current) => {
    const next = new URLSearchParams(current);
    if (!value || value === 'all' || value === 'default') next.delete(key); else next.set(key, value);
    return next;
  }, { replace: true, preventScrollReset: true });
  const filtered = useMemo(() => {
    const items = (products.data || []).filter((product) => (category === 'all' || product.category === category) && `${localized(product, 'name')} ${localized(product, 'description')} ${localized(product, 'notes')}`.toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale)));
    if (sort === 'name') items.sort((a, b) => localized(a, 'name').localeCompare(localized(b, 'name'), locale));
    return items;
  }, [products.data, category, search, sort, localized, locale]);
  return <><Seo title={t('nav.collection')} description={t('collection.description')} /><section className="page-intro"><div className="container"><span className="section-label">{t('collection.label')}</span><h1>{t('collection.pageTitle')}</h1><p>{t('collection.description')}</p></div></section><section className="section catalog-section"><div className="container">
    <div className="catalog-toolbar"><div className="category-filters" aria-label={t('collection.category')}><button aria-pressed={category === 'all'} className={category === 'all' ? 'active' : ''} onClick={() => setFilter('category', 'all')}>{t('common.all')}</button>{categories.data?.map((item) => <button key={item.id} aria-pressed={category === item.slug} className={category === item.slug ? 'active' : ''} onClick={() => setFilter('category', item.slug)}>{localized(item, 'name')}</button>)}</div><label className="catalog-search"><Search size={19} /><span className="sr-only">{t('common.search')}</span><input type="search" placeholder={t('common.search')} value={search} onChange={(event) => setFilter('q', event.target.value)} />{search && <button className="icon-button" onClick={() => setFilter('q', '')} aria-label={t('common.reset')}><X size={16} /></button>}</label></div>
    <Status loading={categories.loading} error={categories.error} retry={categories.reload} />
    <div className="catalog-meta"><span>{t('common.productCount')}: {filtered.length}</span><label className="catalog-sort"><ArrowDownUp size={15} /><select aria-label={locale === 'ru' ? 'Сортировка' : locale === 'uz' ? 'Saralash' : 'Sort'} value={sort} onChange={(event) => setFilter('sort', event.target.value)}><option value="default">{locale === 'ru' ? 'По умолчанию' : locale === 'uz' ? 'Odatiy tartib' : 'Default order'}</option><option value="name">{locale === 'ru' ? 'По названию' : locale === 'uz' ? 'Nomi bo‘yicha' : 'By name'}</option></select></label></div>
    <Status loading={products.loading} error={products.error} retry={products.reload} />
    <Reveal watch={`${filtered.map((p) => p.id).join(',')}-${locale}`}><div className="product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} />)}</div></Reveal>
    {!products.loading && !products.error && filtered.length === 0 && <div className="empty-state"><Search size={32} /><p>{t('common.empty')}</p><button className="button button-outline" onClick={() => setParams({ lang: locale })}>{t('common.reset')}</button></div>}
    {filtered.some((product) => product.isDemo) && <p className="demo-caption">{t('common.demo')}. {t('common.demoNote')}</p>}
  </div></section></>;
}
