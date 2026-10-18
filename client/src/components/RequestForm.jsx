import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, LoaderCircle } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useData } from '../context/DataContext';
import { api } from '../lib/api';

export function RequestForm({ compact = false, initialProduct = '' }) {
  const { t, locale, localized, link } = useLocale();
  const { products } = useData();
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(null);
  const [failure, setFailure] = useState('');
  const formRef = useRef(null);
  const resultRef = useRef(null);
  const submit = async (event) => {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const data = {
      name: String(form.get('name') || '').trim(), contact: String(form.get('contact') || '').trim(),
      company: String(form.get('company') || '').trim(), message: String(form.get('message') || '').trim(),
      productId: form.get('productId') || null, consent: form.get('consent') === 'on', website: form.get('website') || '', locale,
    };
    const invalid = {};
    if (data.name.length < 2 || data.name.length > 100) invalid.name = 'invalidName';
    const digits = data.contact.replace(/\D/g, '');
    const contactValid = data.contact.includes('@') ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact) : /^[+\d\s().-]+$/.test(data.contact) && digits.length >= 7 && digits.length <= 15;
    if (!contactValid) invalid.contact = 'invalidContact';
    if (!data.consent) invalid.consent = 'invalidConsent';
    setErrors(invalid); setFailure('');
    if (Object.keys(invalid).length) { formRef.current.elements[Object.keys(invalid)[0]]?.focus(); return; }
    setPending(true);
    try {
      const result = await api('/requests', { method: 'POST', body: data });
      setSuccess(result.id);
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch (error) { setFailure(error.status === 429 ? 'limited' : 'failed'); }
    finally { setPending(false); }
  };
  if (success) return <div className="request-success" ref={resultRef} tabIndex={-1} role="status"><span className="success-icon"><Check size={30} /></span><h3>{t('request.success')}</h3><p>{t('request.successText')}</p><p className="request-reference">{t('request.reference')}: {success}</p><button className="text-link" onClick={() => { setSuccess(null); setErrors({}); }}>{t('request.again')}<ArrowUpRight size={18} /></button></div>;
  return <form ref={formRef} className="request-form" onSubmit={submit} noValidate>
    <div className="form-row">
      <label>{t('request.name')}<input name="name" aria-label={t('request.name')} autoComplete="name" required maxLength={100} placeholder={t('request.namePlaceholder')} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'error-name' : undefined} />{errors.name && <span id="error-name" className="field-error">{t(`request.${errors.name}`)}</span>}</label>
      <label>{t('request.contact')}<input name="contact" aria-label={t('request.contact')} autoComplete="email" required maxLength={160} placeholder={t('request.contactPlaceholder')} aria-invalid={!!errors.contact} aria-describedby={errors.contact ? 'error-contact' : undefined} />{errors.contact && <span id="error-contact" className="field-error">{t(`request.${errors.contact}`)}</span>}</label>
    </div>
    {!compact && <label>{t('request.company')} <span className="optional">({t('request.optional')})</span><input name="company" autoComplete="organization" maxLength={150} placeholder={t('request.companyPlaceholder')} /></label>}
    <label>{t('request.product')}<select name="productId" key={initialProduct} defaultValue={initialProduct} disabled={products.loading}><option value="">{products.loading ? t('common.loading') : t('request.productPlaceholder')}</option>{(products.data || []).map((product) => <option key={product.id} value={product.id}>{localized(product, 'name')}</option>)}</select></label>
    {products.error && <p className="field-error">{t('common.error')} <button type="button" onClick={products.reload}>{t('common.retry')}</button></p>}
    {!compact && <label>{t('request.message')} <span className="optional">({t('request.optional')})</span><textarea name="message" maxLength={2000} rows={3} placeholder={t('request.messagePlaceholder')} /></label>}
    <div className="honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="consent-label"><input type="checkbox" name="consent" required aria-invalid={!!errors.consent} aria-describedby={errors.consent ? 'error-consent' : undefined} /><span>{t('request.consent')} <Link target="_blank" rel="noreferrer" to={link('/privacy')}>{t('request.policy')}</Link></span></label>
    {errors.consent && <p id="error-consent" className="field-error" role="alert">{t('request.invalidConsent')}</p>}
    {failure && <p className="form-error" role="alert">{t(`request.${failure}`)}</p>}
    <button className="button button-navy submit-button" disabled={pending} type="submit">{t(pending ? 'request.sending' : 'request.submit')}{pending ? <LoaderCircle className="spinner" size={19} /> : <ArrowUpRight size={20} />}</button>
  </form>;
}
