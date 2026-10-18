import { Link } from 'react-router-dom';
import { ArrowUpRight, FlaskConical } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
export function ProductCard({ product }) {
  const { t, localized, link } = useLocale();
  return <article className="product-card" data-reveal>
    <Link to={link(`/collection/${product.slug}`)} className="product-image" aria-label={`${t('common.details')}: ${localized(product, 'name')}`}>
      {product.images[0] ? <img src={product.images[0].path} alt={localized(product, 'name')} loading="lazy" width="600" height="600" /> : <div className="image-placeholder"><FlaskConical size={54} /><span>{t('common.imageMissing')}</span></div>}
      <span className="product-category">{localized(product.categoryInfo, 'name') || product.category}</span><span className="product-open"><ArrowUpRight size={22} /></span>
    </Link>
    <div className="product-info"><h3><Link to={link(`/collection/${product.slug}`)}>{localized(product, 'name')}</Link></h3><p>{localized(product, 'description')}</p><Link className="text-link" to={link(`/collection/${product.slug}`)}>{t('common.learn')}<ArrowUpRight size={16} /></Link></div>
  </article>;
}
