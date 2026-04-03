import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ShoppingBag, Package, Users, TrendingUp, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';

const STATUS_BADGE: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  paid: 'bg-emerald-100 text-emerald-700',
  assembled: 'bg-yellow-100 text-yellow-700',
  issued: 'bg-orange-100 text-orange-700',
  returned: 'bg-gray-100 text-gray-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

const STATUS_LABEL: Record<string, string> = {
  new: 'Новый', confirmed: 'Подтверждён', paid: 'Оплачен',
  assembled: 'Собран', issued: 'Выдан', returned: 'Возвращён',
  completed: 'Завершён', cancelled: 'Отменён',
};

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value ?? '—'}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders?limit=100'),
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products'),
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers'),
  });

  const recent = [...orders].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 8);

  const newOrders = orders.filter(o => o.status === 'new').length;
  const todayRevenue = orders
    .filter(o => {
      const d = new Date(o.createdAt);
      const today = new Date();
      return d.toDateString() === today.toDateString() && o.status !== 'cancelled';
    })
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Всего заказов" value={orders.length} icon={ShoppingBag} color="bg-blue-600" />
        <StatCard label="Новых заказов" value={newOrders} icon={Clock} color="bg-orange-500" />
        <StatCard label="Товаров" value={products.length} icon={Package} color="bg-green-500" />
        <StatCard label="Выручка сегодня" value={`${todayRevenue.toLocaleString('ru-RU')} ₽`} icon={TrendingUp} color="bg-purple-500" />
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Последние заказы</h2>
          <Link href="/orders" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            Все заказы <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recent.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Заказов пока нет</div>
          ) : (
            recent.map((order: any) => (
              <Link key={order.id} href={`/orders/${order.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono font-medium text-gray-900 text-sm">{order.orderNumber}</div>
                    <div className="text-xs text-gray-500 truncate">{order.customerName || 'Без имени'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                  <span className="font-semibold text-gray-900 text-sm">
                    {Number(order.totalAmount || 0).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Управление заказами', href: '/orders', icon: ShoppingBag, color: 'text-blue-600 bg-blue-50' },
          { label: 'Инвентарь', href: '/inventory', icon: Package, color: 'text-green-600 bg-green-50' },
          { label: 'Клиенты', href: '/customers', icon: Users, color: 'text-purple-600 bg-purple-50' },
          { label: 'Аналитика', href: '/orders', icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-gray-100 hover:shadow-sm transition-all hover:-translate-y-0.5 text-center">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-gray-900">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
