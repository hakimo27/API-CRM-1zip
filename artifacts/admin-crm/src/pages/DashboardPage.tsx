import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  ShoppingBag, Package, Users, TrendingUp, Clock, ArrowRight,
  ShoppingCart, CalendarCheck, Plus, Waves, Calendar,
  AlertTriangle, CheckCircle, Activity, Wrench,
} from 'lucide-react';
import { Link } from 'wouter';

// ── Status maps ──────────────────────────────────────────────
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
  new:       { label: 'Новый',       cls: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Подтверждён', cls: 'bg-green-100 text-green-700' },
  paid:      { label: 'Оплачен',     cls: 'bg-emerald-100 text-emerald-700' },
  shipped:   { label: 'Отправлен',   cls: 'bg-orange-100 text-orange-700' },
  delivered: { label: 'Доставлен',   cls: 'bg-teal-100 text-teal-700' },
  completed: { label: 'Завершён',    cls: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Отменён',     cls: 'bg-red-100 text-red-600' },
};
const TOUR_STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Ожидает',      cls: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Подтверждено', cls: 'bg-green-100 text-green-700' },
  paid:      { label: 'Оплачено',     cls: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Завершено',    cls: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Отменено',     cls: 'bg-red-100 text-red-600' },
};
const DATE_STATUS: Record<string, { label: string; cls: string }> = {
  planned:   { label: 'Набор',       cls: 'bg-blue-100 text-blue-700' },
  active:    { label: 'Активно',     cls: 'bg-green-100 text-green-700' },
  completed: { label: 'Завершено',   cls: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Отменено',    cls: 'bg-red-100 text-red-600' },
};
const REVENUE_STATUSES = ['completed', 'paid', 'returned', 'issued', 'delivered'];

// ── Period helpers ────────────────────────────────────────────
type Period = 'today' | 'week' | 'month' | 'all';
function cutoffDate(period: Period): Date | null {
  const now = new Date();
  if (period === 'today') { const d = new Date(now); d.setHours(0,0,0,0); return d; }
  if (period === 'week')  { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
  if (period === 'month') { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
  return null;
}
function filterByPeriod<T extends { createdAt?: string }>(arr: T[], period: Period): T[] {
  const cutoff = cutoffDate(period);
  if (!cutoff) return arr;
  return arr.filter(o => o.createdAt && new Date(o.createdAt) >= cutoff);
}

// ── Chart data builder ────────────────────────────────────────
function buildChartData(
  orders: any[],
  saleOrders: any[],
  tourBookings: any[],
  period: Period,
) {
  const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 30;
  const result: { date: string; аренда: number; продажи: number; туры: number; выручка: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    const ds = d.toDateString();
    const rental = orders.filter(o => new Date(o.createdAt).toDateString() === ds).length;
    const sale = saleOrders.filter(o => new Date(o.createdAt).toDateString() === ds).length;
    const tour = tourBookings.filter(b => new Date(b.createdAt).toDateString() === ds).length;
    const rev =
      orders.filter(o => REVENUE_STATUSES.includes(o.status) && new Date(o.createdAt).toDateString() === ds).reduce((s, o) => s + Number(o.totalAmount || 0), 0) +
      saleOrders.filter(o => REVENUE_STATUSES.includes(o.status) && new Date(o.createdAt).toDateString() === ds).reduce((s, o) => s + Number(o.totalAmount || 0), 0) +
      tourBookings.filter(b => REVENUE_STATUSES.includes(b.status) && new Date(b.createdAt).toDateString() === ds).reduce((s, b) => s + Number(b.totalAmount || 0), 0);
    result.push({ date: label, аренда: rental, продажи: sale, туры: tour, выручка: rev });
  }
  return result;
}

// ── Reusable components ───────────────────────────────────────
function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; cls: string }> }) {
  const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-700' };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

function StatCard({ label, value, icon: Icon, color, sub, href }: any) {
  const content = (
    <div className={`bg-white rounded-2xl border border-gray-100 p-5 ${href ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-0.5">{value ?? '—'}</div>
      <div className="text-sm text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function QuickCreate() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-900 mb-3">Быстрое создание</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Link href="/orders/new" className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
          <Plus className="w-4 h-4" /> Заказ аренды
        </Link>
        <Link href="/sale-orders/new" className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors">
          <Plus className="w-4 h-4" /> Заказ продажи
        </Link>
        <Link href="/tour-bookings?create=1" className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-100 transition-colors">
          <Plus className="w-4 h-4" /> Бронирование тура
        </Link>
      </div>
    </div>
  );
}

function OrderRow({ order, href, statusMap }: { order: any; href: string; statusMap: any }) {
  return (
    <Link href={href} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
      <div className="min-w-0">
        <div className="font-mono font-medium text-gray-900 text-sm">
          {order.orderNumber || order.bookingNumber || `#${order.id}`}
        </div>
        <div className="text-xs text-gray-400 truncate max-w-[160px]">
          {order.customerName || order.contactName || 'Без имени'}
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

// ── Upcoming tour dates widget ────────────────────────────────
function UpcomingTourDates({ dates }: { dates: any[] }) {
  const now = new Date();
  const upcoming = [...dates]
    .filter(d => d.startDate && new Date(d.startDate) >= now && d.status !== 'cancelled')
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 8);

  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-600" />
          <h2 className="font-semibold text-gray-900 text-sm">Ближайшие даты туров</h2>
        </div>
        <Link href="/tours" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
          Управление <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {upcoming.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">Запланированных дат нет</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {upcoming.map((d: any) => {
            const avail = d.seatsTotal - d.seatsBooked;
            const pct = Math.round((d.seatsBooked / (d.seatsTotal || 1)) * 100);
            const ds = DATE_STATUS[d.status] || { label: d.status, cls: 'bg-gray-100 text-gray-600' };
            const critical = avail <= 2 && avail > 0;
            return (
              <div key={d.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">{d.tour?.title || 'Тур'}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(d.startDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ds.cls}`}>{ds.label}</span>
                    {avail === 0 ? (
                      <span className="text-xs text-red-500 font-medium">Мест нет</span>
                    ) : critical ? (
                      <span className="text-xs text-orange-500 font-medium flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> {avail} места
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">{avail} из {d.seatsTotal}</span>
                    )}
                  </div>
                </div>
                {/* Seat fill bar */}
                <div className="mt-2">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-400' : pct >= 60 ? 'bg-orange-400' : 'bg-teal-400'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                    <span>{pct}% заполнено</span>
                    <span>{d.seatsBooked}/{d.seatsTotal} мест</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Period tabs ───────────────────────────────────────────────
const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Сегодня' },
  { key: 'week',  label: '7 дней' },
  { key: 'month', label: '30 дней' },
  { key: 'all',   label: 'Всё время' },
];

// ── Main dashboard ────────────────────────────────────────────
export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('month');

  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ['orders-dashboard'],
    queryFn: () => api.get('/orders?limit=500'),
  });
  const { data: saleOrders = [] } = useQuery<any[]>({
    queryKey: ['sale-orders-dashboard'],
    queryFn: () => api.get('/sales/orders?limit=500'),
  });
  const { data: tourBookings = [] } = useQuery<any[]>({
    queryKey: ['tour-bookings-dashboard'],
    queryFn: () => api.get('/tours/bookings?limit=500'),
  });
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['customers-count'],
    queryFn: () => api.get('/customers'),
  });
  const { data: allTourDates = [] } = useQuery<any[]>({
    queryKey: ['tour-dates-dashboard'],
    queryFn: () => api.get('/tours/dates'),
  });

  // Period-filtered slices
  const pOrders  = useMemo(() => filterByPeriod(orders,  period), [orders,  period]);
  const pSales   = useMemo(() => filterByPeriod(saleOrders, period), [saleOrders, period]);
  const pTours   = useMemo(() => filterByPeriod(tourBookings, period), [tourBookings, period]);

  // KPI calculations
  const rentalRevenue = pOrders.filter(o => REVENUE_STATUSES.includes(o.status)).reduce((s, o) => s + Number(o.totalAmount || 0), 0);
  const saleRevenue   = pSales.filter(o => REVENUE_STATUSES.includes(o.status)).reduce((s, o) => s + Number(o.totalAmount || 0), 0);
  const tourRevenue   = pTours.filter(b => REVENUE_STATUSES.includes(b.status)).reduce((s, b) => s + Number(b.totalAmount || 0), 0);
  const totalRevenue  = rentalRevenue + saleRevenue + tourRevenue;

  const newRentalOrders = pOrders.filter(o => o.status === 'new').length;
  const newSaleOrders   = pSales.filter(o => o.status === 'new').length;
  const pendingTours    = pTours.filter(b => b.status === 'pending').length;
  const activeRentals   = orders.filter(o => ['confirmed', 'paid', 'assembled', 'issued'].includes(o.status)).length;

  // Chart data
  const chartData = useMemo(() => buildChartData(orders, saleOrders, tourBookings, period), [orders, saleOrders, tourBookings, period]);

  // Recent lists
  const recentRental = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const recentSale   = [...saleOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4);
  const recentTours  = [...tourBookings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4);

  const maxChartOrders = Math.max(...chartData.map(d => d.аренда + d.продажи + d.туры), 1);

  return (
    <div className="space-y-5">

      {/* Period selector */}
      <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-2xl p-1 w-fit shadow-sm">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              period === p.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Выручка за период"
          value={`${totalRevenue.toLocaleString('ru-RU')} ₽`}
          icon={TrendingUp}
          color="bg-blue-600"
          sub={`Аренда + Продажи + Туры`}
        />
        <StatCard
          label="Новых заказов"
          value={newRentalOrders + newSaleOrders}
          icon={ShoppingBag}
          color="bg-orange-500"
          sub={`Аренда: ${newRentalOrders} | Продажи: ${newSaleOrders}`}
          href="/orders"
        />
        <StatCard
          label="Активных аренд"
          value={activeRentals}
          icon={Activity}
          color="bg-teal-500"
          sub="Подтверждены / В работе"
          href="/orders"
        />
        <StatCard
          label="Клиентов"
          value={customers.length}
          icon={Users}
          color="bg-purple-500"
          href="/customers"
        />
      </div>

      {/* Second KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Выручка аренда"
          value={`${rentalRevenue.toLocaleString('ru-RU')} ₽`}
          icon={ShoppingBag}
          color="bg-blue-500"
        />
        <StatCard
          label="Выручка продажи"
          value={`${saleRevenue.toLocaleString('ru-RU')} ₽`}
          icon={ShoppingCart}
          color="bg-green-500"
        />
        <StatCard
          label="Выручка туры"
          value={`${tourRevenue.toLocaleString('ru-RU')} ₽`}
          icon={Waves}
          color="bg-purple-500"
        />
        <StatCard
          label="Бронирований туров"
          value={pendingTours}
          icon={CalendarCheck}
          color="bg-violet-500"
          sub="Ожидают обработки"
          href="/tour-bookings"
        />
      </div>

      {/* Quick Create */}
      <QuickCreate />

      {/* Charts */}
      {chartData.some(d => d.аренда + d.продажи + d.туры > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Orders by day */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Заказы по дням</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={period === 'today' ? 40 : period === 'week' ? 20 : 8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                  interval={period === 'month' ? 4 : 0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                  width={20} domain={[0, maxChartOrders + 1]} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                  cursor={{ fill: '#f9fafb' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="аренда" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="продажи" fill="#22c55e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="туры" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by day */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Выручка по дням (₽)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                  interval={period === 'month' ? 4 : 0} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={45}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}к` : String(v)} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                  formatter={(v: number) => [`${Number(v).toLocaleString('ru-RU')} ₽`, 'Выручка']}
                />
                <Line dataKey="выручка" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Orders grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Rental */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Аренда</h2>
              {newRentalOrders > 0 && <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-bold">{newRentalOrders}</span>}
            </div>
            <Link href="/orders" className="text-xs text-blue-600 hover:underline flex items-center gap-1">Все <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentRental.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Заказов нет</div>
            ) : recentRental.map(o => <OrderRow key={o.id} order={o} href={`/orders/${o.id}`} statusMap={RENTAL_STATUS} />)}
          </div>
          <div className="px-5 py-3 border-t border-gray-50">
            <Link href="/orders/new" className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
              <Plus className="w-3.5 h-3.5" /> Новый заказ аренды
            </Link>
          </div>
        </div>

        {/* Sales */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-green-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Продажи</h2>
              {newSaleOrders > 0 && <span className="px-2 py-0.5 bg-green-600 text-white rounded-full text-[10px] font-bold">{newSaleOrders}</span>}
            </div>
            <Link href="/sale-orders" className="text-xs text-blue-600 hover:underline flex items-center gap-1">Все <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentSale.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Заказов нет</div>
            ) : recentSale.map(o => <OrderRow key={o.id} order={o} href={`/sale-orders/${o.id}`} statusMap={SALE_STATUS} />)}
          </div>
          <div className="px-5 py-3 border-t border-gray-50">
            <Link href="/sale-orders/new" className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-800 font-medium">
              <Plus className="w-3.5 h-3.5" /> Новый заказ продажи
            </Link>
          </div>
        </div>

        {/* Tours */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-purple-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Туры</h2>
              {pendingTours > 0 && <span className="px-2 py-0.5 bg-purple-600 text-white rounded-full text-[10px] font-bold">{pendingTours}</span>}
            </div>
            <Link href="/tour-bookings" className="text-xs text-blue-600 hover:underline flex items-center gap-1">Все <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentTours.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Бронирований нет</div>
            ) : recentTours.map(b => <OrderRow key={b.id} order={b} href={`/tour-bookings/${b.id}`} statusMap={TOUR_STATUS} />)}
          </div>
          <div className="px-5 py-3 border-t border-gray-50">
            <Link href="/tour-bookings?create=1" className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 font-medium">
              <Plus className="w-3.5 h-3.5" /> Новое бронирование тура
            </Link>
          </div>
        </div>
      </div>

      {/* Upcoming tour dates + Revenue breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <UpcomingTourDates dates={allTourDates} />

        {/* Revenue breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Финансовая сводка</h3>
          <div className="space-y-3">
            {[
              { label: 'Аренда', value: rentalRevenue, total: totalRevenue, color: 'bg-blue-500', icon: ShoppingBag },
              { label: 'Продажи', value: saleRevenue, total: totalRevenue, color: 'bg-green-500', icon: ShoppingCart },
              { label: 'Туры', value: tourRevenue, total: totalRevenue, color: 'bg-purple-500', icon: Waves },
            ].map(({ label, value, total, color, icon: Icon }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{value.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color} transition-all`}
                    style={{ width: total > 0 ? `${Math.round((value / total) * 100)}%` : '0%' }}
                  />
                </div>
                {total > 0 && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    {Math.round((value / total) * 100)}% от общей выручки
                  </div>
                )}
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
              <span className="text-sm text-gray-500 font-medium">Итого</span>
              <span className="text-base font-bold text-gray-900">{totalRevenue.toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            * Учитываются только закрытые заказы за выбранный период.
          </p>
        </div>
      </div>

    </div>
  );
}
