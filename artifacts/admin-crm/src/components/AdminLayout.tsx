import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  LayoutDashboard, ShoppingBag, Package, Users, Tag,
  MessageSquare, Settings, LogOut, Menu, X, User, Waves, ChevronRight,
  Store, FileText, HelpCircle, Star, Activity, Building2,
  BookOpen, ScrollText, Image, ShoppingCart, CalendarCheck, Fish, Layers,
  Bell, BellOff, Download,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { usePwaInstall } from '@/hooks/usePwaInstall';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Супер-администратор',
  admin: 'Администратор',
  manager: 'Менеджер',
  operator: 'Оператор',
  instructor: 'Инструктор',
  accountant: 'Бухгалтер',
  user: 'Пользователь',
};

interface NavItemDef {
  href: string;
  label: string;
  icon: React.FC<any>;
  exact?: boolean;
  countKey?: string;
}

const NAV_GROUPS: Array<{ label: string; items: NavItemDef[] }> = [
  {
    label: 'Операции',
    items: [
      { href: '/', label: 'Дашборд', icon: LayoutDashboard, exact: true },
      { href: '/orders', label: 'Заказы аренды', icon: ShoppingBag, countKey: 'newOrders' },
      { href: '/sale-orders', label: 'Заказы продажи', icon: ShoppingCart, countKey: 'newSaleOrders' },
      { href: '/tour-bookings', label: 'Бронирования туров', icon: CalendarCheck, countKey: 'pendingBookings' },
      { href: '/chat', label: 'Чат', icon: MessageSquare, countKey: 'unreadChats' },
    ],
  },
  {
    label: 'Каталог',
    items: [
      { href: '/products', label: 'Товары аренды', icon: Tag },
      { href: '/sale-products', label: 'Товары продажи', icon: Store },
      { href: '/categories', label: 'Категории', icon: ScrollText },
      { href: '/templates', label: 'Шаблоны', icon: Layers },
      { href: '/inventory', label: 'Инвентарь', icon: Package },
      { href: '/media', label: 'Медиафайлы', icon: Image },
    ],
  },
  {
    label: 'Туры',
    items: [
      { href: '/tours', label: 'Туры', icon: Waves },
      { href: '/content/rivers', label: 'Реки', icon: Fish },
    ],
  },
  {
    label: 'Клиенты',
    items: [
      { href: '/customers', label: 'Клиенты', icon: Users },
      { href: '/branches', label: 'Филиалы и выдача', icon: Building2 },
    ],
  },
  {
    label: 'Контент',
    items: [
      { href: '/content/articles', label: 'Статьи', icon: BookOpen },
      { href: '/content/pages', label: 'Страницы', icon: FileText },
      { href: '/content/faq', label: 'FAQ', icon: HelpCircle },
      { href: '/content/reviews', label: 'Отзывы', icon: Star },
    ],
  },
  {
    label: 'Система',
    items: [
      { href: '/users', label: 'Пользователи', icon: User },
      { href: '/settings', label: 'Настройки', icon: Settings },
      { href: '/logs', label: 'Логи', icon: Activity },
    ],
  },
];

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none flex-shrink-0">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function NavItem({ item, counts }: { item: NavItemDef; counts: Record<string, number> }) {
  const [location] = useLocation();
  const active = item.exact ? location === item.href : location.startsWith(item.href);
  const Icon = item.icon;
  const count = item.countKey ? (counts[item.countKey] || 0) : 0;

  return (
    <Link href={item.href}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
        active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {active && !count && <ChevronRight className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
      {count > 0 && (
        <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1 leading-none flex-shrink-0 ${
          active ? 'bg-white text-blue-600' : 'bg-red-500 text-white'
        }`}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

function findCurrentPage(location: string) {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.exact ? location === item.href : location.startsWith(item.href)) return item;
    }
  }
  return null;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { status: pushStatus, subscribe: subscribePush } = usePushSubscription();
  const { canInstall, install: installPwa } = usePwaInstall();

  const currentPage = findCurrentPage(location);
  const roleLabel = ROLE_LABELS[user?.role || ''] || user?.role || '';

  const { data: counts = { newOrders: 0, newSaleOrders: 0, pendingBookings: 0, unreadChats: 0 } } = useQuery({
    queryKey: ['crm-counts'],
    queryFn: () => api.get<Record<string, number>>('/notifications/counts'),
    refetchInterval: 8_000,
    staleTime: 4_000,
  });

  // Track previous unreadChats count and show toast when it increases
  const prevUnreadChatsRef = useRef<number | null>(null);
  const [newChatAlert, setNewChatAlert] = useState(false);

  useEffect(() => {
    const current = counts.unreadChats || 0;
    const prev = prevUnreadChatsRef.current;

    if (prev !== null && current > prev) {
      const diff = current - prev;
      toast({
        title: diff === 1 ? '💬 Новый чат' : `💬 ${diff} новых чата`,
        description: 'Клиент написал в чат — откройте раздел, чтобы ответить.',
      });
      setNewChatAlert(true);
      // Also invalidate the chat sessions list so ChatPage refreshes immediately
      qc.invalidateQueries({ queryKey: ['chat-sessions'] });
    }

    prevUnreadChatsRef.current = current;
  }, [counts.unreadChats]);

  // Clear the new-chat alert when manager navigates to the chat page
  useEffect(() => {
    if (location.startsWith('/chat')) {
      setNewChatAlert(false);
    }
  }, [location]);

  return (
    <div className="flex h-screen bg-gray-50">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-60 bg-white border-r border-gray-200 flex flex-col transition-transform lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-base">🛶</span>
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 text-sm">Байдабаза</div>
            <div className="text-xs text-gray-400">Панель управления</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden flex-shrink-0">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const isChatItem = item.countKey === 'unreadChats';
                  return (
                    <div key={item.href} className="relative">
                      <NavItem item={item} counts={counts} />
                      {isChatItem && newChatAlert && !location.startsWith('/chat') && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-400 rounded-full animate-ping pointer-events-none" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-50 mb-2">
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700 text-xs flex-shrink-0">
              {(user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 text-xs truncate">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-[10px] text-gray-400 truncate">{roleLabel}</div>
            </div>
          </div>
          <button onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium">
            <LogOut className="w-4 h-4" />
            Выйти
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 h-14 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1 text-gray-500 hover:text-gray-700">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold text-gray-900 truncate">{currentPage?.label || 'CRM'}</h1>
          <div className="ml-auto flex items-center gap-2">
            {newChatAlert && !location.startsWith('/chat') && (
              <Link href="/chat"
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-full transition-colors animate-pulse">
                <MessageSquare className="w-3.5 h-3.5" />
                Новый чат
              </Link>
            )}
            {canInstall && (
              <button
                onClick={async () => {
                  const ok = await installPwa();
                  if (ok) toast({ title: 'Приложение установлено', description: 'CRM теперь доступен на рабочем столе' });
                }}
                title="Установить приложение"
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            {pushStatus === 'idle' && (
              <button
                onClick={async () => {
                  const ok = await subscribePush();
                  if (ok) toast({ title: '🔔 Уведомления включены', description: 'Вы будете получать push-уведомления о новых событиях' });
                  else toast({ title: 'Уведомления не включены', description: 'Разрешите уведомления в браузере', variant: 'destructive' });
                }}
                title="Включить push-уведомления"
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Bell className="w-4 h-4" />
              </button>
            )}
            {pushStatus === 'subscribed' && (
              <span title="Push-уведомления включены" className="p-1.5 text-green-500">
                <Bell className="w-4 h-4" />
              </span>
            )}
            <a href="/" target="_blank" rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-blue-600 transition-colors hidden sm:block">
              → Публичный сайт
            </a>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
