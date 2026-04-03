import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useRoute } from 'wouter';
import { api } from '@/lib/api';
import { User, Package, LogOut } from 'lucide-react';
import { useEffect } from 'react';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  new: { label: 'Новый', color: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Подтверждён', color: 'bg-green-100 text-green-700' },
  paid: { label: 'Оплачен', color: 'bg-emerald-100 text-emerald-700' },
  assembled: { label: 'Собран', color: 'bg-yellow-100 text-yellow-700' },
  issued: { label: 'Выдан', color: 'bg-orange-100 text-orange-700' },
  returned: { label: 'Возвращён', color: 'bg-gray-100 text-gray-700' },
  completed: { label: 'Завершён', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'Отменён', color: 'bg-red-100 text-red-700' },
};

export default function AccountPage() {
  const { user, logout, loading } = useAuth();
  const [, navigate] = useLocation();
  const [isOrders] = useRoute('/account/orders');

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ['my-orders'],
    queryFn: () => api.get('/orders/my'),
    enabled: !!user,
  });

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Личный кабинет</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">{user.firstName} {user.lastName}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
              </div>
            </div>
            <nav className="space-y-1">
              <Link href="/account" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!isOrders ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                <User className="w-4 h-4" />
                Профиль
              </Link>
              <Link href="/account/orders" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isOrders ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                <Package className="w-4 h-4" />
                Мои заказы
                {orders.length > 0 && (
                  <span className="ml-auto bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {orders.length}
                  </span>
                )}
              </Link>
              <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                <LogOut className="w-4 h-4" />
                Выйти
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {isOrders ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Мои заказы</h2>
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">У вас пока нет заказов</p>
                  <Link href="/catalog" className="text-blue-600 hover:underline text-sm">Перейти в каталог</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order: any) => {
                    const s = STATUS_MAP[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700' };
                    return (
                      <Link key={order.id} href={`/order/${order.orderNumber}`}
                        className="block border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono font-bold text-gray-900">{order.orderNumber}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.items?.length || 0} позиций · {Number(order.totalAmount || 0).toLocaleString('ru-RU')} ₽
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Данные профиля</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Имя</div>
                    <div className="font-medium text-gray-900">{user.firstName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Фамилия</div>
                    <div className="font-medium text-gray-900">{user.lastName || '—'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Email</div>
                  <div className="font-medium text-gray-900">{user.email}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Роль</div>
                  <div className="font-medium text-gray-900">{user.role}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
