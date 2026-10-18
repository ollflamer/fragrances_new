import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, FlaskConical, FileCheck2 } from 'lucide-react';
import { useApi } from '../lib/useApi';
import { useLocale } from '../context/LocaleContext';
import { Seo } from '../components/Seo';
import { Status } from '../components/Status';
import { NotFound } from './Pages';
export default function Product() {
  const { slug } = useParams();
  const { t, localized, link } = useLocale();
  const result = useApi(`/products/${encodeURIComponent(slug)}`);
  const [imageIndex, setImageIndex] = useState(0);
  useEffect(() => setImageIndex(0), [slug]);
  if (result.error?.status === 404) return <NotFound />;
  if (!result.data) return <section className="section container"><Status loading={result.loading} error={result.error} retry={result.reload} /></section>;
  const product = result.data;
  const image = product.images[imageIndex] || product.images[0];
  return <><Seo title={localized(product, 'name')} description={localized(product, 'description')} /><section className="section product-detail"><div className="container"><Link className="text-link back-link" to={link('/collection')}><ArrowLeft size={17} />{t('nav.collection')}</Link><div className="product-detail-grid"><div><div className="detail-image">{image ? <img src={image.path} alt={localized(product, 'name')} width="800" height="800" /> : <FlaskConical size={80} />}</div>{product.images.length > 1 && <div className="image-thumbnails">{product.images.map((item, index) => <button key={item.id} onClick={() => setImageIndex(index)} aria-pressed={imageIndex === index} aria-label={`${localized(product, 'name')} — ${index + 1}`}><img src={item.path} alt="" /></button>)}</div>}</div><div className="detail-copy"><span className="section-label">{localized(product.categoryInfo, 'name') || product.category}</span><h1>{localized(product, 'name')}</h1><p className="detail-description">{localized(product, 'description')}</p>{localized(product, 'notes') && <div className="detail-info"><h2>{t('collection.notes')}</h2><p>{localized(product, 'notes')}</p></div>}<div className="detail-info"><h2>{t('collection.application')}</h2><p>{localized(product.categoryInfo, 'name') || product.category}</p></div><Link className="button button-navy" to={link(`/request?product=${product.id}`)}>{t('common.sample')}<ArrowUpRight size={20} /></Link><p className="detail-note"><FileCheck2 size={18} />{t('request.note')}</p>{product.isDemo && <p className="demo-caption">{t('collection.disclaimer')}</p>}</div></div></div></section></>;
}
