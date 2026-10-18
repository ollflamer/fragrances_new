import { useState } from 'react';
import { ArrowLeft, LoaderCircle, Pencil, Plus, Save, Tags, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { api } from '../lib/api';

const emptyCategory = { slug: '', nameRu: '', nameUz: '', nameEn: '' };

export function AdminCategories({ user, onError, onNotice, clearMessages }) {
  const { categories, products } = useData();
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => { categories.reload(); products.reload(); };
  const edit = (category) => { clearMessages(); setEditor({ ...category }); };
  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); clearMessages();
    try {
      const body = Object.fromEntries(Object.keys(emptyCategory).map((key) => [key, editor[key]]));
      await api(editor.id ? `/admin/categories/${editor.id}` : '/admin/categories', {
        method: editor.id ? 'PUT' : 'POST', body, csrfToken: user.csrfToken,
      });
      setEditor(null); refresh(); onNotice('Категория сохранена.');
    } catch (error) { onError(error); }
    finally { setBusy(false); }
  };
  const remove = async (category) => {
    if (!window.confirm(`Удалить категорию «${category.nameRu}»?`)) return;
    setBusy(true); clearMessages();
    try {
      await api(`/admin/categories/${category.id}`, { method: 'DELETE', csrfToken: user.csrfToken });
      refresh(); onNotice('Категория удалена.');
    } catch (error) { onError(error); }
    finally { setBusy(false); }
  };
  const setField = (key, value) => setEditor((current) => ({ ...current, [key]: value }));

  if (editor) return <>
    <button className="text-link back-link" disabled={busy} onClick={() => { clearMessages(); setEditor(null); }}><ArrowLeft size={16} />К списку категорий</button>
    <div className="admin-title"><h1>{editor.id ? 'Редактирование категории' : 'Новая категория'}</h1></div>
    <form className="product-editor" onSubmit={save}>
      <label>Код категории (slug)<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={2} maxLength={100} value={editor.slug} placeholder="essential-oils" onChange={(event) => setField('slug', event.target.value)} /></label>
      <p className="form-note">Используется в ссылках фильтра каталога. При изменении кода товары останутся в этой категории.</p>
      {['Ru', 'Uz', 'En'].map((language) => <fieldset key={language}>
        <legend>{{ Ru: 'Русский', Uz: 'O‘zbekcha', En: 'English' }[language]}</legend>
        <label>Название<input required minLength={2} maxLength={120} value={editor[`name${language}`]} onChange={(event) => setField(`name${language}`, event.target.value)} /></label>
      </fieldset>)}
      <button className="button button-navy" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spinner" size={18} /> : <Save size={18} />}{busy ? 'Сохраняем…' : 'Сохранить категорию'}</button>
    </form>
  </>;

  return <>
    <div className="admin-title"><div><span className="section-label">Организация коллекции</span><h1>Категории</h1></div><button className="button button-navy" disabled={busy || categories.loading} onClick={() => edit(emptyCategory)}><Plus size={18} />Добавить категорию</button></div>
    <p className="admin-section-note">Названия используются в каталоге и карточках товаров. Чтобы удалить категорию с товарами, сначала выберите для них другую категорию в разделе «Продукция».</p>
    {categories.loading && <p role="status">Загружаем категории…</p>}
    {categories.error && <p className="form-error" role="alert">Не удалось загрузить категории. <button onClick={categories.reload}>Повторить</button></p>}
    <div className="admin-products">{categories.data?.map((category) => <article key={category.id}>
      <div className="admin-product-thumb"><Tags size={22} /></div>
      <div className="admin-product-name"><h2>{category.nameRu}</h2><span>{category.slug} · Товаров: {category._count.products}</span></div>
      <button className="icon-button" disabled={busy} aria-label={`Редактировать категорию ${category.nameRu}`} onClick={() => edit(category)}><Pencil size={18} /></button>
      <button className="icon-button danger" disabled={busy || category._count.products > 0} title={category._count.products ? 'Сначала перенесите товары в другую категорию' : 'Удалить категорию'} aria-label={`Удалить категорию ${category.nameRu}`} onClick={() => remove(category)}><Trash2 size={18} /></button>
    </article>)}</div>
    {categories.data?.length === 0 && <p className="empty-state">Создайте категорию, чтобы добавлять в неё товары.</p>}
  </>;
}
