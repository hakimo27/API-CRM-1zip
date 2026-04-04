import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  ShoppingBag, Package, Users, TrendingUp, Clock, ArrowRight,
  ShoppingCart, CalendarCheck, Plus, Waves,
} from 'lucide-react';
import { Link } from 'wouter';

const RENTAL_STATUS: Record<string, { label: string; cls: string }> = {
  new:       { label: 'Новый',       cls: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Подтверждён', cls: 'bg-green-100 text-green-700' },
  paid:      { label: 'Оплачен',     cls: 'bg-emerald-100 text-emerald-700' },
  assembled: { label: 'Собран',      cls: 'bg-yellow-100 text-yellow-700' },
  issued:    { label: 'Выдан',       cls: 'bg-orange-100 text-orange-700' },
  returned:  { label: 'Возвращён',   cls: 'bg-gray-100 text-gray-700' },
  completed: { label: 'Завершён',    cls: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Отменён',     cls: 'bg-red-100 text-red-600' },
};

const SALE_STATUS: Record<string, { label: string; cls: string }> = {
  new:       { label: 'Новый',     cls: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Подтверждён', cls: 'bg-green-100 text-green-700' },
  paid:      { label: 'Оплачен',   cls: 'bg-emerald-100 text-emerald-700' },
  shipped:   { label: 'Отправлен', cls: 'bg-orange-100 text-orange-700' },
  delivered: { label: 'Доставлен', cls: 'bg-teal-100 text-teal-700' },
  completed: { label: 'Завершён',  cls: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Отменён',   cls: 'bg-red-100 text-red-600' },
};

const TOUR_STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Ожидает',      cls: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Подтверждено', cls: 'bg-green-100 text-green-700' },
  paid:      { label: 'Оплачено',     cls: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Завершено',    cls: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Отменено',     cls: 'bg-red-100 text-red-600' },
};

function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; cls: string }> }) {
  const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-700' };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

function StatCard({ label, value, icon: Icon, color, href }: any) {
  const content = (
    <div className={`bg-white rounded-2xl border border-gray-100 p-5 ${href ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-0.5">{value ?? '—'}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function QuickCreate() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-900 mb-3">Быстрое создание</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Link href="/orders/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
          <Plus className="w-4 h-4" /> Заказ аренды
        </Link>
        <Link href="/sale-orders/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors">
          <Plus className="w-4 h-4" /> Заказ продажи
        </Link>
        <Link href="/tour-bookings?create=1"
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-100 transition-colors">
          <Plus className="w-4 h-4" /> Бронирование тура
        </Link>
      </div>
    </div>
  );
}

function OrderRow({ order, href, statusMap }: { order: any; href: string; statusMap: any }) {
  return (
    <Link href={href}
      className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60 transition-colors cursor-pointer">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="font-mono font-medium text-gray-900 text-sm">
            {order.orderNumber || order.bookingNumber || `#${order.id}`}
          </div>
          <div className="text-xs text-gray-400 truncate max-w-[160px]">
            {order.customerName || order.contactName || 'Без имени'}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <StatusBadge status={order.status} map={statusMap} />
        <span className="font-semibold text-gray-900 text-sm">
          {Number(order.totalAmount || 0).toLocaleString('ru-RU')} ₽
        </span>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ['orders-dashboard'],
    queryFn: () => api.get('/orders?limit=200'),
  });

  const { data: saleOrders = [] } = useQuery<any[]>({
    queryKey: ['sale-orders-dashboard'],
    queryFn: () => api.get('/sales/orders?limit=200'),
  });

  const { data: tourBookings = [] } = useQuery<any[]>({
    queryKey: ['tour-bookings-dashboard'],
    queryFn: () => api.get('/tours/bookings?limit=200'),
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['customers-count'],
    queryFn: () => api.get('/customers'),
  });

  // Revenue: only completed or paid orders
  const REVENUE_STATUSES = ['completed', 'paid', 'returned', 'issued'];
  const today = new Date().toDateString();

  const rentalRevenue = orders
    .filter(o => REVENUE_STATUSES.includes(o.status))
    .reduce((s, o) => s + Number(o.totalAmount || 0), 0);

  const saleRevenue = saleOrders
    .filter(o => REVENUE_STATUSES.includes(o.status))
    .reduce((s, o) => s + Number(o.totalAmount || 0), 0);

  const tourRevenue = tourBookings
    .filter(b => REVENUE_STATUSES.includes(b.status))
    .reduce((s, b) => s + Number(b.totalAmount || 0), 0);

  const totalRevenue = rentalRevenue + saleRevenue + tourRevenue;

  const todayRevenue = [
    ...orders.filter(o => REVENUE_STATUSES.includes(o.status) && new Date(o.createdAt).toDateString() === today),
    ...saleOrders.filter(o => REVENUE_STATUSES.includes(o.status) && new Date(o.createdAt).toDateString() === today),
    ...tourBookings.filter(b => REVENUE_STATUSES.includes(b.status) && new Date(b.createdAt).toDateString() === today),
  ].reduce((s, o) => s + Number(o.totalAmount || 0), 0);

  const newRentalOrders = orders.filter(o => o.status === 'new').length;
  const newSaleOrders = saleOrders.filter(o => o.status === 'new').length;
  const pendingTours = tourBookings.filter(b => b.status === 'pending').length;

  const recentRental = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentSale = [...saleOrders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const recentTours = [...tourBookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Выручка всего" value={`${totalRevenue.toLocaleString('ru-RU')} ₽`} icon={TrendingUp} color="bg-blue-600" />
        <StatCard label="Сегодня" value={`${todayRevenue.toLocaleString('ru-RU')} ₽`} icon={Clock} color="bg-green-500" />
        <StatCard label="Клиентов" value={customers.length} icon={Users} color="bg-purple-500" href="/customers" />
        <StatCard
          label="Новых / Ожидает"
          value={`${newRentalOrders + newSaleOrders} / ${pendingTours}`}
          icon={ShoppingBag}
          color="bg-orange-500"
        />
      </div>

      {/* Quick Create */}
      <QuickCreate />

      {/* Orders grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Rental Orders */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Аренда</h2>
              {newRentalOrders > 0 && (
                <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-bold">{newRentalOrders}</span>
              )}
            </div>
            <Link href="/orders" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Все <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentRental.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Заказов нет</div>
            ) : recentRental.map(o => (
              <OrderRow key={o.id} order={o} href={`/orders/${o.id}`} statusMap={RENTAL_STATUS} />
            ))}
          </div>
          <div className="px-5 py-3 border-t border-gray-50">
            <Link href="/orders/new"
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
              <Plus className="w-3.5 h-3.5" /> Новый заказ аренды
            </Link>
          </div>
        </div>

        {/* Sale Orders */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-green-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Продажи</h2>
              {newSaleOrders > 0 && (
                <span className="px-2 py-0.5 bg-green-600 text-white rounded-full text-[10px] font-bold">{newSaleOrders}</span>
              )}
            </div>
            <Link href="/sale-orders" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Все <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentSale.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Заказов нет</div>
            ) : recentSale.map(o => (
              <OrderRow key={o.id} order={o} href={`/sale-orders/${o.id}`} statusMap={SALE_STATUS} />
            ))}
          </div>
          <div className="px-5 py-3 border-t border-gray-50">
            <Link href="/sale-orders/new"
              className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-800 font-medium">
              <Plus className="w-3.5 h-3.5" /> Новый заказ продажи
            </Link>
          </div>
        </div>

        {/* Tour Bookings */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-purple-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Туры</h2>
              {pendingTours > 0 && (
                <span className="px-2 py-0.5 bg-purple-600 text-white rounded-full text-[10px] font-bold">{pendingTours}</span>
              )}
            </div>
            <Link href="/tour-bookings" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Все <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentTours.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Бронирований нет</div>
            ) : recentTours.map(b => (
              <OrderRow key={b.id} order={b} href={`/tour-bookings/${b.id}`} statusMap={TOUR_STATUS} />
            ))}
          </div>
          <div className="px-5 py-3 border-t border-gray-50">
            <Link href="/tour-bookings?create=1"
              className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 font-medium">
              <Plus className="w-3.5 h-3.5" /> Новое бронирование тура
            </Link>
          </div>
        </div>
      </div>

      {/* Revenue breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Финансовая сводка (по закрытым заказам)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Аренда', value: rentalRevenue, color: 'text-blue-600', bg: 'bg-blue-50', icon: ShoppingBag },
            { label: 'Продажи', value: saleRevenue, color: 'text-green-600', bg: 'bg-green-50', icon: ShoppingCart },
            { label: 'Туры', value: tourRevenue, color: 'text-purple-600', bg: 'bg-purple-50', icon: Waves },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className={`${bg} rounded-xl p-4 flex items-center gap-3`}>
              <div className={`w-9 h-9 rounded-lg bg-white flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-gray-500">{label}</div>
                <div className={`text-lg font-bold ${color}`}>{value.toLocaleString('ru-RU')} ₽</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          * Учитываются только заказы со статусом «Оплачен», «Выдан», «Возвращён» или «Завершён».
        </p>
      </div>
    </div>
  );
}
