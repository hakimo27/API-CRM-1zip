import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, ShoppingBag, Package, Users, Tag, MapPin,
  MessageSquare, Settings, LogOut, Menu, X, User, Waves, ChevronRight,
  Bell
} from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/crm', label: 'Дашборд', icon: LayoutDashboard, exact: true },
  { href: '/crm/orders', label: 'Заказы', icon: ShoppingBag },
  { href: '/crm/inventory', label: 'Инвентарь', icon: Package },
  { href: '/crm/products', label: 'Товары', icon: Tag },
  { href: '/crm/customers', label: 'Клиенты', icon: Users },
  { href: '/crm/tours', label: 'Туры', icon: Waves },
  { href: '/crm/chat', label: 'Чат', icon: MessageSquare },
  { href: '/crm/users', label: 'Пользователи', icon: User },
  { href: '/crm/settings', label: 'Настройки', icon: Settings },
];

function NavItem({ item }: { item: typeof NAV_ITEMS[0] }) {
  const [location] = useLocation();
  const active = item.exact ? location === item.href : location.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link href={item.href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      {item.label}
      {active && <ChevronRight className="w-4 h-4 ml-auto" />}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();

  const currentPage = NAV_ITEMS.find(i =>
    i.exact ? location === i.href : location.startsWith(i.href)
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">🛶</span>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">КаякРент</div>
            <div className="text-xs text-gray-400">Панель управления</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => <NavItem key={item.href} item={item} />)}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-700 font-bold text-sm">{user?.firstName?.[0]}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 text-sm truncate">{user?.firstName} {user?.lastName}</div>
              <div className="text-xs text-gray-400 truncate">{user?.role}</div>
            </div>
          </div>
          <button onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium">
            <LogOut className="w-4 h-4" />
            Выйти
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 h-14 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1 text-gray-500 hover:text-gray-700">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 truncate">{currentPage?.label || 'CRM'}</h1>
          <div className="ml-auto flex items-center gap-2">
            <a href="/" target="_blank" rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-blue-600 transition-colors hidden sm:block">
              → Публичный сайт
            </a>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
