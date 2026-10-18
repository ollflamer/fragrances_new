import { LoaderCircle, AlertCircle } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
export function Status({ loading, error, retry }) {
  const { t } = useLocale();
  if (!loading && !error) return null;
  return <div className="data-status" role={error ? 'alert' : 'status'}>{loading ? <><LoaderCircle className="spinner" size={24} /><p>{t('common.loading')}</p></> : <><AlertCircle size={24} /><p>{t('common.error')}</p><button className="button button-outline" onClick={retry}>{t('common.retry')}</button></>}</div>;
}
