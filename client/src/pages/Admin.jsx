import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, LogOut, Package, Inbox, Tags, ArrowUpRight, LoaderCircle, ImagePlus, X, Save, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { useData } from '../context/DataContext';
import { Seo } from '../components/Seo';
import { AdminCategories } from '../components/AdminCategories';

const emptyProduct = { slug: '', category: '', nameRu: '', nameUz: '', nameEn: '', descriptionRu: '', descriptionUz: '', descriptionEn: '', notesRu: '', notesUz: '', notesEn: '', isFeatured: false, isDemo: false, images: [] };
const errorMessage = (error) => ({
  INVALID_CREDENTIALS: 'Неверный email или пароль.', ADMIN_NOT_CONFIGURED: 'Администратор ещё не настроен. Выполните npm run admin:password в терминале проекта и перезапустите API.',
  SLUG_EXISTS: 'Этот код (slug) уже занят. Выберите другой.', INVALID_IMAGE: 'Выберите настоящее изображение JPEG, PNG или WebP.', FILE_TOO_LARGE: 'Размер изображения должен быть не больше 8 МБ.',
  CATEGORY_IN_USE: 'В категории есть товары. Сначала перенесите их в другую категорию.', INVALID_CATEGORY: 'Категория недоступна. Обновите список и выберите существующую категорию.',
  IMAGE_LIMIT: 'Для одного продукта можно добавить до 6 изображений.', VALIDATION_ERROR: `Проверьте поля: ${(error.fields || []).join(', ')}.`,
  RATE_LIMIT: 'Слишком много попыток. Повторите через 15 минут.', CSRF_REJECTED: 'Обновите страницу и повторите действие.',
  UNAUTHORIZED: 'Сессия истекла. Войдите снова.', NOT_FOUND: 'Запись уже удалена. Обновите список.',
}[error.code] || 'Не удалось выполнить действие. Проверьте соединение и повторите.');

export default function Admin() {
  const { products, categories } = useData();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('products');
  const [editor, setEditor] = useState(null);
  const [file, setFile] = useState(null);
  const [requests, setRequests] = useState(null);
  const [page, setPage] = useState(1);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const fail = (problem) => { setError(errorMessage(problem)); if (problem.status === 401) setUser(null); };
  useEffect(() => {
    const controller = new AbortController();
    api('/auth/session', { signal: controller.signal }).then(setUser).catch((problem) => {
      if (!controller.signal.aborted && problem.status !== 401) setError(errorMessage(problem));
    }).finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!user || tab !== 'requests') return;
    const controller = new AbortController();
    setRequestsLoading(true);
    api(`/admin/requests?page=${page}`, { signal: controller.signal }).then(setRequests).catch((problem) => {
      if (!controller.signal.aborted) fail(problem);
    }).finally(() => { if (!controller.signal.aborted) setRequestsLoading(false); });
    return () => controller.abort();
  }, [tab, page, user]);
  const login = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try { setUser(await api('/auth/login', { method: 'POST', body: data })); }
    catch (problem) { fail(problem); }
    finally { setBusy(false); }
  };
  const logout = async () => {
    setBusy(true); setError('');
    try { await api('/auth/logout', { method: 'POST', csrfToken: user.csrfToken }); setUser(null); setEditor(null); setRequests(null); setNotice(''); }
    catch (problem) { fail(problem); }
    finally { setBusy(false); }
  };
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const data = Object.fromEntries(Object.keys(emptyProduct).filter((key) => key !== 'images').map((key) => [key, editor[key]]));
      const saved = await api(editor.id ? `/admin/products/${editor.id}` : '/admin/products', { method: editor.id ? 'PUT' : 'POST', body: data, csrfToken: user.csrfToken });
      setEditor(saved);
      if (file) {
        const body = new FormData(); body.append('image', file);
        const uploaded = await api(`/admin/products/${saved.id}/images`, { method: 'POST', body, csrfToken: user.csrfToken });
        setEditor({ ...saved, images: [...saved.images, uploaded] });
      }
      setFile(null); products.reload(); categories.reload(); setNotice('Продукт сохранён.');
    } catch (problem) { products.reload(); fail(problem); }
    finally { setBusy(false); }
  };
  const deleteProduct = async (product) => {
    if (!window.confirm(`Удалить «${product.nameRu}»? Изображения также будут удалены.`)) return;
    setBusy(true); setError(''); setNotice('');
    try { await api(`/admin/products/${product.id}`, { method: 'DELETE', csrfToken: user.csrfToken }); products.reload(); categories.reload(); setNotice('Продукт удалён.'); }
    catch (problem) { fail(problem); }
    finally { setBusy(false); }
  };
  const deleteImage = async (image) => {
    if (!window.confirm('Удалить изображение?')) return;
    setBusy(true); setError('');
    try {
      await api(`/admin/images/${image.id}`, { method: 'DELETE', csrfToken: user.csrfToken });
      setEditor((current) => ({ ...current, images: current.images.filter((item) => item.id !== image.id) })); products.reload();
    } catch (problem) { fail(problem); }
    finally { setBusy(false); }
  };
  const retry = async (id) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await api(`/admin/requests/${id}/retry`, { method: 'POST', csrfToken: user.csrfToken });
      setRequests(await api(`/admin/requests?page=${page}`));
      setNotice(result.status === 'sent' ? 'Уведомление отправлено.' : result.status === 'pending' ? 'Настройте Telegram в .env и перезапустите API. Заявка сохранена.' : 'Отправка не подтверждена. Проверьте настройки Telegram и число попыток.');
    } catch (problem) { fail(problem); }
    finally { setBusy(false); }
  };
  const setField = (key, value) => setEditor((current) => ({ ...current, [key]: value }));
  return <div className="admin-shell"><Seo title="Панель управления" noindex /><header className="admin-header"><Link to="/" className="brand"><img src="/images/logo.png" alt="Fragrances & Co" width="720" height="203" /></Link><span>Панель управления</span>{user && <button disabled={busy} className="text-link" onClick={logout}><LogOut size={17} />Выйти</button>}</header>
    {checking ? <div className="data-status"><LoaderCircle className="spinner" /><p>Проверяем сессию…</p></div> : !user ? <main className="admin-login"><div className="admin-login-card"><span className="section-label">Для сотрудников</span><h1>Вход в кабинет</h1><p>Управление коллекцией и входящими заявками.</p>{error && <p className="form-error" role="alert">{error}</p>}<form onSubmit={login}><label>Email<input type="email" name="email" required autoComplete="username" placeholder="admin@fragrances.local" /></label><label>Пароль<input type="password" name="password" required autoComplete="current-password" maxLength={100} /></label><button className="button button-navy" disabled={busy}>{busy ? 'Входим…' : 'Войти'}<ArrowUpRight size={18} /></button></form><Link to="/" className="text-link"><ArrowLeft size={16} />На сайт</Link></div></main> : <main className="admin-main">
      <aside className="admin-sidebar"><p>{user.email}</p><button className={tab === 'products' ? 'active' : ''} onClick={() => { setTab('products'); setEditor(null); setError(''); setNotice(''); }}><Package size={19} />Продукция</button><button className={tab === 'categories' ? 'active' : ''} onClick={() => { setTab('categories'); setEditor(null); setError(''); setNotice(''); }}><Tags size={19} />Категории</button><button className={tab === 'requests' ? 'active' : ''} onClick={() => { setTab('requests'); setEditor(null); setError(''); setNotice(''); }}><Inbox size={19} />Заявки</button><Link to="/" target="_blank" rel="noreferrer"><ArrowUpRight size={18} />Открыть сайт</Link></aside>
      <div className="admin-content">{error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
        {tab === 'categories' && <AdminCategories user={user} onError={fail} onNotice={setNotice} clearMessages={() => { setError(''); setNotice(''); }} />}
        {tab === 'products' && categories.error && <p className="form-error" role="alert">Не удалось загрузить категории. <button onClick={categories.reload}>Повторить</button></p>}
        {tab === 'products' && categories.data?.length === 0 && <p className="admin-section-note">Для добавления товара нужна категория. <button className="text-link" onClick={() => { setTab('categories'); setEditor(null); setError(''); setNotice(''); }}>Создать категорию</button></p>}
        {tab === 'products' && !editor && <><div className="admin-title"><div><span className="section-label">Ваша коллекция</span><h1>Продукция</h1></div><button className="button button-navy" disabled={busy || categories.loading || !categories.data?.length} onClick={() => { setEditor({ ...emptyProduct, category: categories.data?.[0]?.slug || '' }); setFile(null); setError(''); setNotice(''); }}><Plus size={18} />Добавить продукт</button></div>{products.loading && <p role="status">Загружаем продукты…</p>}{products.error && <p className="form-error">Не удалось загрузить продукты. <button onClick={products.reload}>Повторить</button></p>}<div className="admin-products">{products.data?.map((product) => <article key={product.id}><div className="admin-product-thumb">{product.images[0] ? <img src={product.images[0].path} alt="" width="70" height="70" /> : <Package size={22} />}</div><div className="admin-product-name"><h2>{product.nameRu}</h2><span>{product.categoryInfo?.nameRu || product.category}{product.isFeatured && ' · На главной'}{product.isDemo && ' · Демо'}</span></div><button className="icon-button" disabled={busy} aria-label={`Редактировать ${product.nameRu}`} onClick={() => { setEditor({ ...product }); setFile(null); setError(''); setNotice(''); }}><Pencil size={18} /></button><button className="icon-button danger" disabled={busy} aria-label={`Удалить ${product.nameRu}`} onClick={() => deleteProduct(product)}><Trash2 size={18} /></button></article>)}</div>{products.data?.length === 0 && <p className="empty-state">Добавьте первый продукт — он появится в коллекции сайта.</p>}</>}
        {editor && <><button className="text-link back-link" disabled={busy} onClick={() => { setEditor(null); setFile(null); setError(''); setNotice(''); }}><ArrowLeft size={16} />К списку продукции</button><div className="admin-title"><h1>{editor.id ? 'Редактирование продукта' : 'Новый продукт'}</h1></div><form className="product-editor" onSubmit={save}><div className="form-row"><label>Адрес продукта (slug)<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={2} maxLength={100} placeholder="bergamot-cedar" value={editor.slug} onChange={(e) => setField('slug', e.target.value)} /></label><label>Категория<select required disabled={categories.loading} value={editor.category} onChange={(e) => setField('category', e.target.value)}><option value="">Выберите категорию</option>{(categories.data || []).map((category) => <option key={category.id} value={category.slug}>{category.nameRu}</option>)}</select></label></div>
          {['Ru', 'Uz', 'En'].map((lang) => <fieldset key={lang}><legend>{{ Ru: 'Русский', Uz: 'O‘zbekcha', En: 'English' }[lang]}</legend><label>Название<input required minLength={2} maxLength={120} value={editor[`name${lang}`]} onChange={(e) => setField(`name${lang}`, e.target.value)} /></label><label>Описание<textarea required minLength={10} maxLength={3000} rows={3} value={editor[`description${lang}`]} onChange={(e) => setField(`description${lang}`, e.target.value)} /></label><label>Ароматический профиль<input maxLength={500} value={editor[`notes${lang}`]} onChange={(e) => setField(`notes${lang}`, e.target.value)} /></label></fieldset>)}
          <div className="admin-checks"><label className="consent-label"><input type="checkbox" checked={editor.isFeatured} onChange={(e) => setField('isFeatured', e.target.checked)} />Показать на главной</label><label className="consent-label"><input type="checkbox" checked={editor.isDemo} onChange={(e) => setField('isDemo', e.target.checked)} />Демонстрационный продукт</label></div>
          <fieldset><legend>Изображения</legend><p className="form-note">До 6 изображений, JPEG / PNG / WebP. До 8 МБ каждое. Первое используется на карточке.</p><div className="admin-images">{editor.images.map((image) => <div key={image.id}><img src={image.path} alt={image.alt} width="120" height="120" /><button type="button" className="icon-button" aria-label="Удалить изображение" disabled={busy} onClick={() => deleteImage(image)}><X size={17} /></button></div>)}</div>{editor.images.length < 6 && <label className="upload-label"><ImagePlus size={22} />{file ? file.name : 'Добавить изображение'}<input type="file" accept="image/jpeg,image/png,image/webp" key={file ? 'selected' : 'empty'} onChange={(e) => { const candidate = e.target.files?.[0]; if (candidate?.size > 8 * 1024 * 1024) { setError('Максимальный размер изображения — 8 МБ.'); e.target.value = ''; return; } setFile(candidate || null); setError(''); }} /></label>}</fieldset>
          <button className="button button-navy" type="submit" disabled={busy}>{busy ? <LoaderCircle size={18} className="spinner" /> : <Save size={18} />}{busy ? 'Сохраняем…' : 'Сохранить продукт'}</button>
        </form></>}
        {tab === 'requests' && <><div className="admin-title"><div><span className="section-label">Обратная связь</span><h1>Заявки {requests ? <span className="admin-count">{requests.total}</span> : null}</h1></div><button className="button button-outline" disabled={requestsLoading} onClick={async () => { setRequestsLoading(true); try { setRequests(await api(`/admin/requests?page=${page}`)); } catch (problem) { fail(problem); } finally { setRequestsLoading(false); } }}><RefreshCw size={17} />Обновить</button></div>{requestsLoading ? <div className="data-status"><LoaderCircle className="spinner" />Загружаем заявки…</div> : <div className="request-inbox">{requests?.items.map((item) => <article key={item.id}><div className="inbox-title"><h2>{item.name}</h2><span className={`delivery-status status-${item.telegramStatus}`}>Telegram: {{ pending: 'ожидает настройки / отправки', sending: 'отправляется', sent: 'отправлено', failed: 'ошибка отправки' }[item.telegramStatus] || item.telegramStatus}</span></div><p className="inbox-contact">{item.contact}</p><dl><div><dt>Продукт</dt><dd>{item.productName || 'Помощь с выбором'}</dd></div><div><dt>Компания</dt><dd>{item.company || '—'}</dd></div><div><dt>Дата</dt><dd>{new Date(item.createdAt).toLocaleString('ru-RU')}</dd></div><div><dt>Язык / попытки</dt><dd>{item.locale.toUpperCase()} / {item.telegramAttempts}</dd></div></dl>{item.message && <p className="inbox-message">{item.message}</p>}<div className="inbox-bottom"><span>№ {item.id}</span>{['pending', 'failed'].includes(item.telegramStatus) && item.telegramAttempts < 5 && <button className="text-link" disabled={busy} onClick={() => retry(item.id)}>Отправить в Telegram<ArrowUpRight size={16} /></button>}</div></article>)}{requests?.total === 0 && <p className="empty-state">Заявок пока нет. Новые обращения появятся здесь.</p>}</div>}{requests?.total > 25 && <div className="pagination"><button className="button button-outline" disabled={page === 1 || requestsLoading} onClick={() => setPage(page - 1)}>Назад</button><span>{page} / {Math.ceil(requests.total / 25)}</span><button className="button button-outline" disabled={page * 25 >= requests.total || requestsLoading} onClick={() => setPage(page + 1)}>Далее</button></div>}</>}
      </div>
    </main>}
  </div>;
}
