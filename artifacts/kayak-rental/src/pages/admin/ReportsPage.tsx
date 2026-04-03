import { useState } from "react";
import { useAdminGetReportsOverview } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { TrendingUp, ShoppingBag, CheckCircle, XCircle, Wrench } from "lucide-react";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading } = useAdminGetReportsOverview({
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl border h-24 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Отчеты</h1>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-400 text-sm">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Всего заказов", value: data.totalOrders, icon: ShoppingBag, color: "bg-blue-100 text-blue-600" },
          { label: "Завершено", value: data.completedOrders, icon: CheckCircle, color: "bg-green-100 text-green-600" },
          { label: "Отменено", value: data.cancelledOrders, icon: XCircle, color: "bg-red-100 text-red-600" },
          { label: "На ремонте", value: data.inRepairCount, icon: Wrench, color: "bg-orange-100 text-orange-600" },
          { label: "Утилизация", value: `${data.utilizationRate}%`, icon: TrendingUp, color: "bg-emerald-100 text-emerald-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-500">{kpi.label}</div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpi.color}`}>
                <kpi.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 bg-white rounded-xl border border-gray-200 p-5">
        <div className="text-sm font-semibold text-gray-700 mb-2">
          Общая выручка
        </div>
        <div className="text-3xl font-bold text-gray-900">
          {(data.totalRevenue ?? 0).toLocaleString("ru-RU")} ₽
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue by month */}
        {data.revenueByMonth && data.revenueByMonth.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm font-semibold text-gray-700 mb-4">Выручка по месяцам</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenueByMonth}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `${v.toLocaleString("ru-RU")} ₽`} />
                  <Bar dataKey="revenue" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Orders by status */}
        {data.ordersByStatus && data.ordersByStatus.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm font-semibold text-gray-700 mb-4">Заказы по статусам</div>
            <div className="h-56 flex items-center">
              <div className="w-40 h-40 mx-auto">
                <PieChart width={160} height={160}>
                  <Pie
                    data={data.ordersByStatus.map((s) => ({ name: ORDER_STATUS_LABELS[s.status] ?? s.status, value: s.count }))}
                    cx={80} cy={80} innerRadius={35} outerRadius={70}
                    dataKey="value"
                  >
                    {data.ordersByStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [v, "заказов"]} />
                </PieChart>
              </div>
              <div className="flex-1 space-y-2">
                {data.ordersByStatus.map((s, i) => (
                  <div key={s.status} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600 flex-1">{ORDER_STATUS_LABELS[s.status] ?? s.status}</span>
                    <span className="font-semibold text-gray-900">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Orders per month */}
        {data.revenueByMonth && data.revenueByMonth.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
            <div className="text-sm font-semibold text-gray-700 mb-4">Количество заказов по месяцам</div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.revenueByMonth}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="orderCount" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
