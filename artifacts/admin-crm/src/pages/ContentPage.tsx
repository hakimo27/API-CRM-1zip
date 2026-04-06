import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BookOpen, HelpCircle, FileText, Star, ScrollText, Plus, Pencil, Trash2, X, Search, ExternalLink, Eye, EyeOff, CheckCircle, XCircle, MapPin } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>{children}</div>
);

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const ARTICLE_STATUSES = [['draft', 'Черновик'], ['published', 'Опубликована'], ['archived', 'Архив']];
const REVIEW_STATUSES = [['pending', 'На модерации'], ['approved', 'Одобрен'], ['rejected', 'Отклонён']];

function ArticlesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({ title: '', slug: '', excerpt: '', content: '', status: 'draft', active: true });

  const { data: articles = [], isLoading } = useQuery<any[]>({
    queryKey: ['articles'],
    queryFn: () => api.get('/content/articles/admin'),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/content/articles', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['articles'] }); toast({ title: 'Статья создана' }); setCreating(false); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/content/articles/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['articles'] }); toast({ title: 'Сохранено' }); setEditing(null); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/content/articles/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['articles'] }); toast({ title: 'Удалено' }); setDeletingId(null); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const filtered = articles.filter(a => !search || a.title?.toLowerCase().includes(search.toLowerCase()));

  const openEdit = (a: any) => {
    setForm({ title: a.title, slug: a.slug, excerpt: a.excerpt || '', content: a.content || '', status: a.status, active: a.active });
    setEditing(a);
  };

  const ArticleForm = () => (
    <div className="px-6 py-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <F label="Заголовок *">
          <input value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value, slug: slugify(e.target.value) }))} className={inputCls} />
        </F>
        <F label="Слаг">
          <input value={form.slug} onChange={e => setForm((f: any) => ({ ...f, slug: e.target.value }))} className={inputCls} />
        </F>
        <F label="Статус">
          <select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} className={inputCls}>
            {ARTICLE_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </F>
      </div>
      <F label="Краткое описание (excerpt)">
        <textarea value={form.excerpt} onChange={e => setForm((f: any) => ({ ...f, excerpt: e.target.value }))} className={inputCls + ' resize-none'} rows={2} />
      </F>
      <F label="Содержимое">
        <RichTextEditor value={form.content} onChange={v => setForm((f: any) => ({ ...f, content: v }))} placeholder="Текст статьи..." minHeight={220} />
      </F>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.active} onChange={e => setForm((f: any) => ({ ...f, active: e.target.checked }))} className="rounded" />
        Активна
      </label>
    </div>
  );

  return (
    <>
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" /></div>
        <button onClick={() => { setForm({ title: '', slug: '', excerpt: '', content: '', status: 'draft', active: true }); setCreating(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> Добавить</button>
      </div>
      {isLoading ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        : filtered.length === 0 ? <div className="text-center py-8 text-gray-400"><BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Статей нет</p></div>
        : (
          <div className="overflow-x-auto">
            <table className="w-full"><thead><tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Заголовок</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
              <th className="px-4 py-3"></th>
            </tr></thead><tbody className="divide-y divide-gray-50">
              {filtered.map((a: any) => (
                <tr key={a.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3"><div className="font-medium text-sm text-gray-900">{a.title}</div><div className="text-xs text-gray-400 font-mono">{a.slug}</div></td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.status === 'published' ? 'bg-green-100 text-green-700' : a.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{ARTICLE_STATUSES.find(([v]) => v === a.status)?.[1]}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{a.createdAt ? new Date(a.createdAt).toLocaleDateString('ru-RU') : '—'}</td>
                  <td className="px-4 py-3"><div className="flex gap-1 justify-end"><button onClick={() => openEdit(a)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button><button onClick={() => setDeletingId(a.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td>
                </tr>
              ))}
            </tbody></table>
          </div>
        )}
      {(creating || editing) && (
        <Modal title={creating ? 'Новая статья' : 'Редактировать статью'} onClose={() => { setCreating(false); setEditing(null); }}>
          <ArticleForm />
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => { setCreating(false); setEditing(null); }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Отмена</button>
            <button onClick={() => creating ? createMut.mutate(form) : updateMut.mutate({ id: editing.id, data: form })} disabled={createMut.isPending || updateMut.isPending} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{(createMut.isPending || updateMut.isPending) ? 'Сохранение...' : 'Сохранить'}</button>
          </div>
        </Modal>
      )}
      {deletingId !== null && (
        <Modal title="Удалить статью?" onClose={() => setDeletingId(null)}>
          <div className="px-6 py-4"><p className="text-sm text-gray-600">Статья будет удалена безвозвратно.</p></div>
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => setDeletingId(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Отмена</button>
            <button onClick={() => deleteMut.mutate(deletingId!)} disabled={deleteMut.isPending} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">{deleteMut.isPending ? 'Удаление...' : 'Удалить'}</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function FaqTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({ question: '', answer: '', category: 'general', sortOrder: 0, active: true });

  const { data: faqs = [], isLoading } = useQuery<any[]>({ queryKey: ['faqs'], queryFn: () => api.get('/content/faqs') });
  const createMut = useMutation({ mutationFn: (d: any) => api.post('/content/faqs', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['faqs'] }); toast({ title: 'Вопрос добавлен' }); setCreating(false); setForm({ question: '', answer: '', category: 'general', sortOrder: 0, active: true }); }, onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }) });
  const updateMut = useMutation({ mutationFn: ({ id, data }: any) => api.patch(`/content/faqs/${id}`, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['faqs'] }); toast({ title: 'Сохранено' }); setEditing(null); }, onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }) });
  const deleteMut = useMutation({ mutationFn: (id: number) => api.delete(`/content/faqs/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['faqs'] }); toast({ title: 'Удалено' }); setDeletingId(null); }, onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }) });

  const FaqForm = () => (
    <div className="px-6 py-4 space-y-4">
      <F label="Вопрос *"><input value={form.question} onChange={e => setForm((f: any) => ({ ...f, question: e.target.value }))} className={inputCls} /></F>
      <F label="Ответ *"><textarea value={form.answer} onChange={e => setForm((f: any) => ({ ...f, answer: e.target.value }))} className={inputCls + ' resize-none'} rows={4} /></F>
      <div className="grid grid-cols-2 gap-3">
        <F label="Категория"><input value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))} className={inputCls} placeholder="general" /></F>
        <F label="Порядок"><input type="number" value={form.sortOrder} onChange={e => setForm((f: any) => ({ ...f, sortOrder: +e.target.value }))} className={inputCls} /></F>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e => setForm((f: any) => ({ ...f, active: e.target.checked }))} className="rounded" />Активен</label>
    </div>
  );

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => { setForm({ question: '', answer: '', category: 'general', sortOrder: 0, active: true }); setCreating(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> Добавить вопрос</button>
      </div>
      {isLoading ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        : faqs.length === 0 ? <div className="text-center py-8 text-gray-400"><HelpCircle className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Вопросов нет</p></div>
        : (
          <div className="space-y-2">
            {faqs.map((f: any) => (
              <div key={f.id} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900 mb-1">{f.question}</div>
                    <div className="text-xs text-gray-500 line-clamp-2">{f.answer}</div>
                    <div className="text-xs text-gray-400 mt-1">Категория: {f.category}</div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setForm({ question: f.question, answer: f.answer, category: f.category, sortOrder: f.sortOrder || 0, active: f.active }); setEditing(f); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => setDeletingId(f.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      {(creating || editing) && (
        <Modal title={creating ? 'Новый вопрос' : 'Редактировать вопрос'} onClose={() => { setCreating(false); setEditing(null); }}>
          <FaqForm />
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => { setCreating(false); setEditing(null); }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Отмена</button>
            <button onClick={() => creating ? createMut.mutate(form) : updateMut.mutate({ id: editing.id, data: form })} disabled={createMut.isPending || updateMut.isPending} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{(createMut.isPending || updateMut.isPending) ? 'Сохранение...' : 'Сохранить'}</button>
          </div>
        </Modal>
      )}
      {deletingId !== null && (
        <Modal title="Удалить вопрос?" onClose={() => setDeletingId(null)}>
          <div className="px-6 py-4"><p className="text-sm text-gray-600">Вопрос будет удалён.</p></div>
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => setDeletingId(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Отмена</button>
            <button onClick={() => deleteMut.mutate(deletingId!)} disabled={deleteMut.isPending} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">{deleteMut.isPending ? 'Удаление...' : 'Удалить'}</button>
          </div>
        </Modal>
      )}
    </>
  );
}

const EMPTY_REVIEW = {
  authorName: '', authorLastName: '', authorEmail: '', authorCity: '',
  rating: 5, title: '', text: '', source: 'admin',
  reviewDate: '', status: 'approved', published: true, featured: false,
  sortOrder: 0, tourId: '', orderId: '', productId: '', saleOrderId: '', customerId: '',
};

const REVIEW_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-500',
};

function ReviewForm({ form, setForm }: { form: any; setForm: any }) {
  return (
    <div className="px-6 py-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <F label="Имя *">
          <input value={form.authorName} onChange={e => setForm((f: any) => ({ ...f, authorName: e.target.value }))} className={inputCls} placeholder="Иван" />
        </F>
        <F label="Фамилия">
          <input value={form.authorLastName} onChange={e => setForm((f: any) => ({ ...f, authorLastName: e.target.value }))} className={inputCls} placeholder="Петров" />
        </F>
        <F label="Email">
          <input type="email" value={form.authorEmail} onChange={e => setForm((f: any) => ({ ...f, authorEmail: e.target.value }))} className={inputCls} />
        </F>
        <F label="Город">
          <input value={form.authorCity} onChange={e => setForm((f: any) => ({ ...f, authorCity: e.target.value }))} className={inputCls} placeholder="Москва" />
        </F>
        <F label="Рейтинг">
          <select value={form.rating} onChange={e => setForm((f: any) => ({ ...f, rating: +e.target.value }))} className={inputCls}>
            {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} {'★'.repeat(n)}</option>)}
          </select>
        </F>
        <F label="Источник">
          <select value={form.source} onChange={e => setForm((f: any) => ({ ...f, source: e.target.value }))} className={inputCls}>
            {[['site', 'Сайт'], ['admin', 'Вручную'], ['yandex', 'Яндекс'], ['google', 'Google'], ['2gis', '2GIS'], ['vk', 'ВКонтакте']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </F>
        <F label="Статус">
          <select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} className={inputCls}>
            {REVIEW_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </F>
        <F label="Дата отзыва">
          <input type="date" value={form.reviewDate ? form.reviewDate.slice(0, 10) : ''} onChange={e => setForm((f: any) => ({ ...f, reviewDate: e.target.value || null }))} className={inputCls} />
        </F>
        <F label="ID клиента CRM">
          <input type="number" value={form.customerId} onChange={e => setForm((f: any) => ({ ...f, customerId: e.target.value }))} className={inputCls} placeholder="Необязательно" />
        </F>
        <F label="Порядок">
          <input type="number" value={form.sortOrder} onChange={e => setForm((f: any) => ({ ...f, sortOrder: +e.target.value }))} className={inputCls} />
        </F>
      </div>
      <F label="Заголовок">
        <input value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="Заголовок отзыва (необязательно)" />
      </F>
      <F label="Текст отзыва *">
        <textarea value={form.text} onChange={e => setForm((f: any) => ({ ...f, text: e.target.value }))} className={inputCls + ' resize-none'} rows={4} placeholder="Текст отзыва..." />
      </F>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.published} onChange={e => setForm((f: any) => ({ ...f, published: e.target.checked }))} className="rounded" />
          Опубликован на сайте
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.featured} onChange={e => setForm((f: any) => ({ ...f, featured: e.target.checked }))} className="rounded" />
          Рекомендуемый
        </label>
      </div>
    </div>
  );
}

function ReviewsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(EMPTY_REVIEW);

  const { data: reviews = [], isLoading } = useQuery<any[]>({
    queryKey: ['reviews'],
    queryFn: () => api.get('/content/reviews/admin'),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/content/reviews/admin', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      toast({ title: 'Отзыв добавлен' });
      setCreating(false);
      setForm(EMPTY_REVIEW);
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/content/reviews/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      toast({ title: 'Сохранено' });
      setEditing(null);
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/content/reviews/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      toast({ title: 'Отзыв удалён' });
      setDeletingId(null);
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const quickUpdate = (id: number, data: any) => updateMut.mutate({ id, data });

  const openEdit = (r: any) => {
    setForm({
      authorName: r.authorName || '',
      authorLastName: r.authorLastName || '',
      authorEmail: r.authorEmail || '',
      authorCity: r.authorCity || '',
      rating: r.rating || 5,
      title: r.title || '',
      text: r.text || '',
      source: r.source || 'site',
      reviewDate: r.reviewDate || '',
      status: r.status || 'pending',
      published: !!r.published,
      featured: !!r.featured,
      sortOrder: r.sortOrder || 0,
      tourId: r.tourId || '',
      orderId: r.orderId || '',
      productId: r.productId || '',
      saleOrderId: r.saleOrderId || '',
      customerId: r.customerId || '',
    });
    setEditing(r);
  };

  const prepareForm = (f: any) => ({
    ...f,
    tourId: f.tourId ? +f.tourId : null,
    orderId: f.orderId ? +f.orderId : null,
    productId: f.productId ? +f.productId : null,
    saleOrderId: f.saleOrderId ? +f.saleOrderId : null,
    customerId: f.customerId ? +f.customerId : null,
    reviewDate: f.reviewDate || null,
  });

  const filtered = reviews.filter((r: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (r.authorName || '').toLowerCase().includes(s)
      || (r.authorLastName || '').toLowerCase().includes(s)
      || (r.text || '').toLowerCase().includes(s)
      || (r.authorCity || '').toLowerCase().includes(s);
  });

  if (isLoading) return <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <>
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по автору, тексту, городу..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <button onClick={() => { setForm(EMPTY_REVIEW); setCreating(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Добавить отзыв
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-400"><Star className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Отзывов нет</p></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Автор</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Текст</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Рейтинг</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Опубл.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Порядок</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm text-gray-900">{r.authorName} {r.authorLastName || ''}</div>
                    {r.authorCity && <div className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{r.authorCity}</div>}
                    {r.source && r.source !== 'site' && <div className="text-xs text-gray-400">{r.source}</div>}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {r.title && <div className="text-xs font-medium text-gray-700 mb-0.5">{r.title}</div>}
                    <div className="text-xs text-gray-500 line-clamp-2">{r.text?.replace(/<[^>]*>/g, '') || ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-yellow-500 text-sm">{'★'.repeat(r.rating || 5)}{'☆'.repeat(5 - (r.rating || 5))}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${REVIEW_STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-500'}`}>
                      {REVIEW_STATUSES.find(([v]) => v === r.status)?.[1] || r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => quickUpdate(r.id, { published: !r.published })} title={r.published ? 'Скрыть' : 'Опубликовать'} className="p-1 rounded hover:bg-gray-100">
                      {r.published ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.sortOrder ?? 0}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {(r.reviewDate || r.createdAt) ? new Date(r.reviewDate || r.createdAt).toLocaleDateString('ru-RU') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      {r.status === 'pending' && (
                        <>
                          <button onClick={() => quickUpdate(r.id, { status: 'approved' })} title="Одобрить" className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => quickUpdate(r.id, { status: 'rejected' })} title="Отклонить" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeletingId(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <Modal title={creating ? 'Новый отзыв' : 'Редактировать отзыв'} onClose={() => { setCreating(false); setEditing(null); }}>
          <ReviewForm form={form} setForm={setForm} />
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => { setCreating(false); setEditing(null); }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Отмена</button>
            <button
              onClick={() => creating ? createMut.mutate(prepareForm(form)) : updateMut.mutate({ id: editing.id, data: prepareForm(form) })}
              disabled={createMut.isPending || updateMut.isPending || !form.authorName || !form.text}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {(createMut.isPending || updateMut.isPending) ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </Modal>
      )}

      {deletingId !== null && (
        <Modal title="Удалить отзыв?" onClose={() => setDeletingId(null)}>
          <div className="px-6 py-4"><p className="text-sm text-gray-600">Отзыв будет удалён безвозвратно.</p></div>
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => setDeletingId(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Отмена</button>
            <button onClick={() => deleteMut.mutate(deletingId!)} disabled={deleteMut.isPending} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              {deleteMut.isPending ? 'Удаление...' : 'Удалить'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function PagesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({ title: '', slug: '', content: '', active: true, metaTitle: '', metaDescription: '' });

  const { data: pages = [], isLoading } = useQuery<any[]>({ queryKey: ['pages'], queryFn: () => api.get('/content/pages/admin') });
  const createMut = useMutation({ mutationFn: (d: any) => api.post('/content/pages', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['pages'] }); toast({ title: 'Страница создана' }); setCreating(false); setForm({ title: '', slug: '', content: '', active: true, metaTitle: '', metaDescription: '' }); }, onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }) });
  const updateMut = useMutation({ mutationFn: ({ id, data }: any) => api.patch(`/content/pages/${id}`, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['pages'] }); toast({ title: 'Сохранено' }); setEditing(null); }, onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }) });
  const deleteMut = useMutation({ mutationFn: (id: number) => api.delete(`/content/pages/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['pages'] }); toast({ title: 'Удалено' }); setDeletingId(null); }, onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }) });

  const siteOrigin = window.location.origin.replace('/crm', '').replace(':5174', ':5173').replace(':5175', ':5173');

  const PageForm = () => (
    <div className="px-6 py-4 space-y-4">
      {form.slug && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-xs text-blue-700">
          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Страница будет доступна по адресу: </span>
          <a href={`${siteOrigin}/info/${form.slug}`} target="_blank" rel="noopener noreferrer" className="font-mono underline underline-offset-2 hover:text-blue-900">/info/{form.slug}</a>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <F label="Заголовок *"><input value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value, ...(creating ? { slug: slugify(e.target.value) } : {}) }))} className={inputCls} placeholder="О компании" /></F>
        <F label="Слаг (URL)">
          <input value={form.slug} onChange={e => setForm((f: any) => ({ ...f, slug: e.target.value }))} className={inputCls + ' font-mono'} placeholder="about" readOnly={!!editing} />
        </F>
        <F label="Meta Title (SEO)"><input value={form.metaTitle} onChange={e => setForm((f: any) => ({ ...f, metaTitle: e.target.value }))} className={inputCls} placeholder={form.title || 'О компании — Байдабаза'} /></F>
        <F label="Meta Description (SEO)"><input value={form.metaDescription} onChange={e => setForm((f: any) => ({ ...f, metaDescription: e.target.value }))} className={inputCls} placeholder="Краткое описание для поисковиков (150–160 символов)" /></F>
      </div>
      <F label="Содержимое страницы">
        <RichTextEditor value={form.content} onChange={v => setForm((f: any) => ({ ...f, content: v }))} placeholder="Содержимое страницы..." minHeight={300} />
      </F>
      <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.active} onChange={e => setForm((f: any) => ({ ...f, active: e.target.checked }))} className="rounded" /><span>Страница активна (видна на сайте)</span></label>
    </div>
  );

  return (
    <>
      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="flex-1 flex items-start gap-2.5 px-4 py-3 bg-blue-50 rounded-xl text-sm text-blue-800">
          <FileText className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
          <div>
            <p className="font-medium mb-0.5">Информационные страницы сайта</p>
            <p className="text-blue-700 text-xs">Каждая страница доступна по адресу <span className="font-mono bg-blue-100 px-1 rounded">/info/:слаг</span>. Например: «О компании» → <span className="font-mono bg-blue-100 px-1 rounded">/info/about</span>. Изменения применяются немедленно.</p>
          </div>
        </div>
        <button onClick={() => { setForm({ title: '', slug: '', content: '', active: true, metaTitle: '', metaDescription: '' }); setCreating(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 whitespace-nowrap flex-shrink-0"><Plus className="w-4 h-4" /> Создать страницу</button>
      </div>
      {isLoading ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        : pages.length === 0 ? <div className="text-center py-8 text-gray-400"><FileText className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Страниц нет</p></div>
        : (
          <table className="w-full"><thead><tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL на сайте</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
            <th className="px-4 py-3"></th>
          </tr></thead><tbody className="divide-y divide-gray-50">
            {pages.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-sm text-gray-900">{p.title}</td>
                <td className="px-4 py-3">
                  <a href={`${siteOrigin}/info/${p.slug}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-mono hover:underline">
                    /info/{p.slug}<ExternalLink className="w-3 h-3" />
                  </a>
                </td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{p.active ? 'Активна' : 'Скрыта'}</span></td>
                <td className="px-4 py-3"><div className="flex gap-1 justify-end">
                  <button onClick={() => { setForm({ title: p.title, slug: p.slug, content: p.content || '', active: p.active, metaTitle: p.metaTitle || '', metaDescription: p.metaDescription || '' }); setEditing(p); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Редактировать"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setDeletingId(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Удалить"><Trash2 className="w-4 h-4" /></button>
                </div></td>
              </tr>
            ))}
          </tbody></table>
        )}
      {(creating || editing) && (
        <Modal title={creating ? 'Новая страница' : `Редактировать: ${editing?.title}`} onClose={() => { setCreating(false); setEditing(null); }}>
          <PageForm />
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => { setCreating(false); setEditing(null); }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Отмена</button>
            <button onClick={() => creating ? createMut.mutate(form) : updateMut.mutate({ id: editing.id, data: form })} disabled={!form.title || !form.slug || createMut.isPending || updateMut.isPending} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{(createMut.isPending || updateMut.isPending) ? 'Сохранение...' : 'Сохранить'}</button>
          </div>
        </Modal>
      )}
      {deletingId !== null && (
        <Modal title="Удалить страницу?" onClose={() => setDeletingId(null)}>
          <div className="px-6 py-4"><p className="text-sm text-gray-600">Страница будет удалена без возможности восстановления.</p></div>
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => setDeletingId(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Отмена</button>
            <button onClick={() => deleteMut.mutate(deletingId!)} disabled={deleteMut.isPending} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">{deleteMut.isPending ? 'Удаление...' : 'Удалить'}</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function TemplatesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({ name: '', type: 'sms', subject: '', body: '', active: true });

  const TEMPLATE_TYPES = [['sms', 'SMS'], ['email', 'Email'], ['telegram', 'Telegram'], ['push', 'Push'], ['whatsapp', 'WhatsApp']];

  const { data: templates = [], isLoading } = useQuery<any[]>({ queryKey: ['templates'], queryFn: () => api.get('/settings/templates') });
  const createMut = useMutation({ mutationFn: (d: any) => api.post('/settings/templates', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); toast({ title: 'Шаблон создан' }); setCreating(false); setForm({ name: '', type: 'sms', subject: '', body: '', active: true }); }, onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }) });
  const updateMut = useMutation({ mutationFn: ({ id, data }: any) => api.patch(`/settings/templates/${id}`, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); toast({ title: 'Сохранено' }); setEditing(null); }, onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }) });
  const deleteMut = useMutation({ mutationFn: (id: number) => api.delete(`/settings/templates/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); toast({ title: 'Удалено' }); setDeletingId(null); }, onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }) });

  const TplForm = () => (
    <div className="px-6 py-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <F label="Название *"><input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Подтверждение заказа" /></F>
        <F label="Тип">
          <select value={form.type} onChange={e => setForm((f: any) => ({ ...f, type: e.target.value }))} className={inputCls}>
            {TEMPLATE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </F>
        <F label="Тема (для Email)"><input value={form.subject} onChange={e => setForm((f: any) => ({ ...f, subject: e.target.value }))} className={inputCls} placeholder="Ваш заказ #{order_number}" /></F>
      </div>
      <F label="Текст шаблона *">
        <textarea value={form.body} onChange={e => setForm((f: any) => ({ ...f, body: e.target.value }))} className={inputCls + ' resize-none'} rows={6} placeholder="Доступные переменные: {order_number}, {customer_name}, {total}" />
      </F>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e => setForm((f: any) => ({ ...f, active: e.target.checked }))} className="rounded" />Активен</label>
    </div>
  );

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => { setForm({ name: '', type: 'sms', subject: '', body: '', active: true }); setCreating(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> Создать шаблон</button>
      </div>
      {isLoading ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        : templates.length === 0 ? <div className="text-center py-8 text-gray-400"><ScrollText className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Шаблонов нет</p></div>
        : (
          <div className="space-y-2">
            {templates.map((t: any) => (
              <div key={t.id} className="bg-gray-50 rounded-xl p-4 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">{t.name}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{TEMPLATE_TYPES.find(([v]) => v === t.type)?.[1]}</span>
                    {!t.active && <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full text-xs">Отключён</span>}
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2 font-mono">{t.body}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => { setForm({ name: t.name, type: t.type, subject: t.subject || '', body: t.body, active: t.active }); setEditing(t); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setDeletingId(t.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      {(creating || editing) && (
        <Modal title={creating ? 'Новый шаблон' : 'Редактировать шаблон'} onClose={() => { setCreating(false); setEditing(null); }}>
          <TplForm />
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => { setCreating(false); setEditing(null); }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Отмена</button>
            <button onClick={() => creating ? createMut.mutate(form) : updateMut.mutate({ id: editing.id, data: form })} disabled={createMut.isPending || updateMut.isPending} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{(createMut.isPending || updateMut.isPending) ? 'Сохранение...' : 'Сохранить'}</button>
          </div>
        </Modal>
      )}
      {deletingId !== null && (
        <Modal title="Удалить шаблон?" onClose={() => setDeletingId(null)}>
          <div className="px-6 py-4"><p className="text-sm text-gray-600">Шаблон будет удалён.</p></div>
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => setDeletingId(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Отмена</button>
            <button onClick={() => deleteMut.mutate(deletingId!)} disabled={deleteMut.isPending} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">{deleteMut.isPending ? 'Удаление...' : 'Удалить'}</button>
          </div>
        </Modal>
      )}
    </>
  );
}

const TABS = [
  { key: 'articles', label: 'Статьи', icon: BookOpen },
  { key: 'pages', label: 'Страницы', icon: FileText },
  { key: 'faq', label: 'FAQ', icon: HelpCircle },
  { key: 'reviews', label: 'Отзывы', icon: Star },
  { key: 'templates', label: 'Шаблоны', icon: ScrollText },
];

export default function ContentPage({ tab: initialTab }: { tab?: string }) {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState(initialTab || 'articles');

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) setActiveTab(initialTab);
  }, [initialTab]);

  const switchTab = (key: string) => {
    setActiveTab(key);
    navigate(`/content/${key}`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-1 flex gap-1 flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => switchTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium flex-1 justify-center transition-colors ${activeTab === key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        {activeTab === 'articles' && <ArticlesTab />}
        {activeTab === 'pages' && <PagesTab />}
        {activeTab === 'faq' && <FaqTab />}
        {activeTab === 'reviews' && <ReviewsTab />}
        {activeTab === 'templates' && <TemplatesTab />}
      </div>
    </div>
  );
}
