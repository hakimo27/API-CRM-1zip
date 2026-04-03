import { useAdminListProducts } from "@workspace/api-client-react";
import { Package, Star } from "lucide-react";

export default function AdminProductsPage() {
  const { data: products, isLoading } = useAdminListProducts();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Товары</h1>
        <div className="text-sm text-gray-500">{products?.length ?? 0} товаров</div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Загрузка...</div>
        ) : products && products.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Название</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Категория</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Арт.</th>
                <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3">Мест</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Залог</th>
                <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${!p.active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{p.name}</span>
                      {p.featured && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                      {p.badge && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{p.badge}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.categoryName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.sku ?? "—"}</td>
                  <td className="px-4 py-3 text-center text-sm text-gray-700">{p.capacity ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                    {p.depositAmount ? `${p.depositAmount.toLocaleString("ru-RU")} ₽` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {p.active ? "Активен" : "Скрыт"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <div className="text-sm">Товаров нет</div>
          </div>
        )}
      </div>
    </div>
  );
}
