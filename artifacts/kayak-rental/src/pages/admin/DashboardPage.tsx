import { Link } from "wouter";
import { useAdminGetDashboard } from "@workspace/api-client-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/constants";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ShoppingBag, Users, Package, AlertCircle, TrendingUp, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

function KPICard({ label, value, icon: Icon, color }: {
  label: string; value: number | string; icon: any; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-500">{label}</div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useAdminGetDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const formatDate = (d: string) => {
    try { return format(parseISO(d), "d MMM", { locale: ru }); } catch { return d; }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Дашборд</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard label="Новые заказы" value={data.newOrders} icon={ShoppingBag} color="bg-blue-100 text-blue-600" />
        <KPICard label="Заказов сегодня" value={data.todayOrders} icon={Clock} color="bg-indigo-100 text-indigo-600" />
        <KPICard label="Сборок сегодня" value={data.todayAssemblies} icon={Package} color="bg-yellow-100 text-yellow-600" />
        <KPICard label="Требуют проверки" value={data.pendingReview} icon={AlertCircle} color="bg-orange-100 text-orange-600" />
        <KPICard label="Активных аренд" value={data.activeRentals} icon={Users} color="bg-green-100 text-green-600" />
        <KPICard
          label="Выручка"
          value={`${(data.totalRevenue ?? 0).toLocaleString("ru-RU")} ₽`}
          icon={TrendingUp}
          color="bg-emerald-100 text-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm font-semibold text-gray-700 mb-4">Статусы заказов</div>
          {data.statusBreakdown && data.statusBreakdown.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.statusBreakdown.map((s) => ({ name: ORDER_STATUS_LABELS[s.status] ?? s.status, count: s.count }))}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-gray-400 text-sm text-center py-8">Нет данных</div>
          )}
        </div>

        {/* Recent orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-gray-700">Последние заказы</div>
            <Link href="/admin/orders">
              <span className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer">Все заказы</span>
            </Link>
          </div>
          {data.recentOrders && data.recentOrders.length > 0 ? (
            <div className="space-y-3">
              {data.recentOrders.map((order) => (
                <Link key={order.id} href={`/admin/orders/${order.id}`}>
                  <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-2 -mx-2 cursor-pointer transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm text-gray-900">{order.orderNumber}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                        {order.managerReviewRequired && (
                          <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.customerName} · {formatDate(order.startDate)} — {formatDate(order.endDate)}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 ml-2">
                      {order.exactPrice
                        ? `${order.exactPrice.toLocaleString("ru-RU")} ₽`
                        : order.approximatePrice
                        ? `~${order.approximatePrice.toLocaleString("ru-RU")} ₽`
                        : "—"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-sm text-center py-8">Заказов пока нет</div>
          )}
        </div>
      </div>
    </div>
  );
}
