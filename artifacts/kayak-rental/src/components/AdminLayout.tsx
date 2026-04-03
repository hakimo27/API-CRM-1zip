import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Package,
  MessageSquare,
  BarChart2,
  Archive,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Дашборд", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Заказы", icon: ShoppingBag },
  { href: "/admin/customers", label: "Клиенты", icon: Users },
  { href: "/admin/products", label: "Товары", icon: Package },
  { href: "/admin/inventory", label: "Инвентарь", icon: Archive },
  { href: "/admin/chat", label: "Чат", icon: MessageSquare },
  { href: "/admin/reports", label: "Отчеты", icon: BarChart2 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex bg-gray-100">
      <aside className="w-56 shrink-0 bg-slate-900 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-700">
          <Link href="/">
            <span className="text-white font-bold text-sm cursor-pointer hover:text-blue-300 transition-colors">
              🛶 КаякПрокат
            </span>
          </Link>
          <div className="text-slate-400 text-xs mt-1">Панель управления</div>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact ? location === item.href : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-colors",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-700">
          <Link href="/">
            <span className="flex items-center gap-2 text-slate-400 hover:text-white text-xs transition-colors cursor-pointer">
              <ChevronRight className="w-3 h-3 rotate-180" />
              На сайт
            </span>
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {navItems.find((n) =>
                n.exact ? location === n.href : location.startsWith(n.href),
              )?.label ?? "Admin"}
            </div>
            <div className="text-xs text-gray-400">
              {new Date().toLocaleDateString("ru-RU", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
