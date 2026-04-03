import { useState } from "react";
import { useAdminListInventory, useAdminUpdateInventory, getAdminListInventoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { INVENTORY_STATUS_LABELS, INVENTORY_STATUS_COLORS } from "@/lib/constants";
import { Save, Loader2 } from "lucide-react";

const STATUSES = ["available", "busy", "reserved", "in_repair", "incomplete", "incoming", "written_off"];

export default function InventoryPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [updating, setUpdating] = useState<number | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Record<number, string>>({});
  const queryClient = useQueryClient();

  const { data: units, isLoading } = useAdminListInventory({
    status: statusFilter as any,
  });

  const updateInventory = useAdminUpdateInventory();

  const handleStatusChange = (unitId: number, newStatus: string) => {
    setPendingUpdates((prev) => ({ ...prev, [unitId]: newStatus }));
  };

  const handleSave = async (unitId: number) => {
    const newStatus = pendingUpdates[unitId];
    if (!newStatus) return;
    setUpdating(unitId);
    try {
      await updateInventory.mutateAsync({
        id: unitId,
        data: { status: newStatus as any },
      });
      await queryClient.invalidateQueries({ queryKey: getAdminListInventoryQueryKey() });
      setPendingUpdates((prev) => {
        const n = { ...prev };
        delete n[unitId];
        return n;
      });
    } finally {
      setUpdating(null);
    }
  };

  const byProduct: Record<string, typeof units> = {};
  if (units) {
    for (const u of units) {
      const key = u.productName;
      if (!byProduct[key]) byProduct[key] = [];
      byProduct[key]!.push(u);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Инвентарь</h1>
        <div className="text-sm text-gray-500">{units?.length ?? 0} единиц</div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setStatusFilter(undefined)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!statusFilter ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          Все
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${statusFilter === s ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {INVENTORY_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : Object.keys(byProduct).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(byProduct).map(([productName, productUnits]) => (
            <div key={productName} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="font-semibold text-sm text-gray-900">{productName}</div>
                <div className="text-xs text-gray-500">{productUnits?.length} ед.</div>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2">Серийный №</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2">Место хранения</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2">Статус</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2">Состояние</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {productUnits?.map((unit) => {
                    const pendingStatus = pendingUpdates[unit.id];
                    const displayStatus = pendingStatus ?? unit.status;
                    const hasChange = !!pendingStatus && pendingStatus !== unit.status;
                    return (
                      <tr key={unit.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-sm text-gray-700">{unit.serialNumber ?? `#${unit.id}`}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-500">{unit.warehouseLocation ?? "—"}</td>
                        <td className="px-4 py-2.5">
                          <select
                            value={displayStatus}
                            onChange={(e) => handleStatusChange(unit.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-lg border font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              hasChange ? "border-blue-400 bg-blue-50" : INVENTORY_STATUS_COLORS[unit.status]
                            }`}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>{INVENTORY_STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-500">{unit.condition ?? "—"}</td>
                        <td className="px-4 py-2.5">
                          {hasChange && (
                            <button
                              onClick={() => handleSave(unit.id)}
                              disabled={updating === unit.id}
                              className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {updating === unit.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                              Сохранить
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-400">
          <div className="text-sm">Единиц инвентаря не найдено</div>
        </div>
      )}
    </div>
  );
}
