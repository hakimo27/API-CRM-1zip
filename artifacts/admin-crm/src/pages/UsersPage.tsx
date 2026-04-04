import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { User, Search, Plus, Pencil, Trash2, Lock, ToggleLeft, ToggleRight, X, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const ROLE_BADGE: Record<string, string> = {
  superadmin: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  warehouse: 'bg-yellow-100 text-yellow-700',
  instructor: 'bg-orange-100 text-orange-700',
  content_manager: 'bg-teal-100 text-teal-700',
  customer: 'bg-gray-100 text-gray-600',
};

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Суперадмин',
  admin: 'Администратор',
  manager: 'Менеджер',
  warehouse: 'Кладовщик',
  instructor: 'Инструктор',
  content_manager: 'Контент-менеджер',
  customer: 'Клиент',
};

const ROLES = Object.entries(ROLE_LABEL);

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";
const selectCls = inputCls;

interface UserForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  notes: string;
}

const emptyForm: UserForm = {
  firstName: '', lastName: '', email: '', password: '', phone: '', role: 'manager', notes: '',
};

export default function UsersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [resettingPwd, setResettingPwd] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [newPwd, setNewPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users?limit=200'),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Пользователь создан' });
      setCreating(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Сохранено' });
      setEditing(null);
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const toggleMut = useMutation({
    mutationFn: (id: number) => api.post(`/users/${id}/toggle-active`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const resetPwdMut = useMutation({
    mutationFn: ({ id, newPassword }: any) => api.post(`/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => {
      toast({ title: 'Пароль сброшен' });
      setResettingPwd(null);
      setNewPwd('');
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Пользователь удалён' });
      setDeletingId(null);
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const filtered = users.filter(u => {
    const matchRole = !roleFilter || u.role === roleFilter;
    const q = search.toLowerCase();
    const matchSearch = !search || u.firstName?.toLowerCase().includes(q)
      || u.lastName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const openEdit = (u: any) => {
    setForm({ firstName: u.firstName || '', lastName: u.lastName || '', email: u.email || '',
      password: '', phone: u.phone || '', role: u.role || 'manager', notes: u.notes || '' });
    setEditing(u);
  };

  const handleCreate = () => {
    if (!form.firstName || !form.email || !form.password) {
      toast({ title: 'Заполните обязательные поля', variant: 'destructive' }); return;
    }
    createMut.mutate(form);
  };

  const handleUpdate = () => {
    if (!form.firstName || !form.email) {
      toast({ title: 'Заполните обязательные поля', variant: 'destructive' }); return;
    }
    const { password, ...rest } = form;
    updateMut.mutate({ id: editing.id, data: rest });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex gap-3 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по имени, email..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className={selectCls + ' sm:w-44'}>
            <option value="">Все роли</option>
            {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button onClick={() => { setForm(emptyForm); setCreating(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Добавить
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Пользователи</h2>
          <span className="text-sm text-gray-400">{filtered.length} записей</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Пользователи не найдены</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Пользователь</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Роль</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Регистрация</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700 text-sm flex-shrink-0">
                          {(u.firstName || u.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900">{u.firstName} {u.lastName}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                          {u.phone && <div className="text-xs text-gray-400">{u.phone}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_BADGE[u.role] || 'bg-gray-100 text-gray-700'}`}>
                        {ROLE_LABEL[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleMut.mutate(u.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                          u.active !== false
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}>
                        {u.active !== false ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        {u.active !== false ? 'Активен' : 'Заблокирован'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ru-RU') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(u)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setResettingPwd(u); setNewPwd(''); }}
                          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                          <Lock className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeletingId(u.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
      </div>

      {(creating || editing) && (
        <Modal title={creating ? 'Новый пользователь' : 'Редактировать пользователя'}
          onClose={() => { setCreating(false); setEditing(null); }}>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Имя *">
                <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className={inputCls} placeholder="Иван" />
              </Field>
              <Field label="Фамилия">
                <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className={inputCls} placeholder="Иванов" />
              </Field>
            </div>
            <Field label="Email *">
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className={inputCls} placeholder="user@example.com" />
            </Field>
            {creating && (
              <Field label="Пароль *">
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className={inputCls + ' pr-10'} placeholder="Минимум 6 символов" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Телефон">
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className={inputCls} placeholder="+7 (999) 000-00-00" />
              </Field>
              <Field label="Роль">
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className={selectCls}>
                  {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Заметки">
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className={inputCls + ' resize-none'} rows={2} placeholder="Внутренние заметки..." />
            </Field>
          </div>
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => { setCreating(false); setEditing(null); }}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              Отмена
            </button>
            <button onClick={creating ? handleCreate : handleUpdate}
              disabled={createMut.isPending || updateMut.isPending}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {(createMut.isPending || updateMut.isPending) ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </Modal>
      )}

      {resettingPwd && (
        <Modal title={`Сброс пароля: ${resettingPwd.email}`} onClose={() => setResettingPwd(null)}>
          <div className="px-6 py-4 space-y-4">
            <p className="text-sm text-gray-600">Введите новый пароль для пользователя.</p>
            <Field label="Новый пароль *">
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={newPwd}
                  onChange={e => setNewPwd(e.target.value)} className={inputCls + ' pr-10'}
                  placeholder="Минимум 6 символов" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
          </div>
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => setResettingPwd(null)}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              Отмена
            </button>
            <button onClick={() => resetPwdMut.mutate({ id: resettingPwd.id, newPassword: newPwd })}
              disabled={!newPwd || newPwd.length < 6 || resetPwdMut.isPending}
              className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
              {resetPwdMut.isPending ? 'Сброс...' : 'Сбросить пароль'}
            </button>
          </div>
        </Modal>
      )}

      {deletingId !== null && (
        <Modal title="Удалить пользователя?" onClose={() => setDeletingId(null)}>
          <div className="px-6 py-4">
            <p className="text-sm text-gray-600">Это действие необратимо. Все данные пользователя будут удалены.</p>
          </div>
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => setDeletingId(null)}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">
              Отмена
            </button>
            <button onClick={() => deleteMut.mutate(deletingId!)}
              disabled={deleteMut.isPending}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              {deleteMut.isPending ? 'Удаление...' : 'Удалить'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
