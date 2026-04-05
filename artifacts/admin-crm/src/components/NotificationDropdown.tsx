import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { Bell, MessageSquare, ShoppingBag, ShoppingCart, CalendarCheck, X, CheckCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface NotificationLog {
  id: number;
  type: string;
  subject: string;
  content: string;
  createdAt: string;
}

const LAST_SEEN_KEY = 'crm_notifications_last_seen';

function typeConfig(type: string) {
  switch (type) {
    case 'new_chat':
      return { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Новый чат', href: '/chat' };
    case 'new_message':
      return { icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-50', label: 'Сообщение', href: '/chat' };
    case 'new_rental_order':
      return { icon: ShoppingBag, color: 'text-green-500', bg: 'bg-green-50', label: 'Заказ аренды', href: '/orders' };
    case 'new_sale_order':
      return { icon: ShoppingCart, color: 'text-violet-500', bg: 'bg-violet-50', label: 'Заказ магазина', href: '/sale-orders' };
    case 'new_tour_booking':
      return { icon: CalendarCheck, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Бронирование тура', href: '/tour-bookings' };
    default:
      return { icon: Bell, color: 'text-gray-400', bg: 'bg-gray-50', label: 'Уведомление', href: '/' };
  }
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} дн назад`;
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [lastSeen, setLastSeen] = useState<number>(() => {
    try { return Number(localStorage.getItem(LAST_SEEN_KEY) || '0'); } catch { return 0; }
  });

  const { data: notifications = [] } = useQuery<NotificationLog[]>({
    queryKey: ['notifications-recent'],
    queryFn: () => api.get<NotificationLog[]>('/notifications/recent?limit=30'),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  // Count unread (created after lastSeen)
  const unreadCount = notifications.filter(
    n => new Date(n.createdAt).getTime() > lastSeen
  ).length;

  const markAllRead = useCallback(() => {
    const now = Date.now();
    setLastSeen(now);
    try { localStorage.setItem(LAST_SEEN_KEY, String(now)); } catch {}
  }, []);

  // Mark as read when dropdown opens
  useEffect(() => {
    if (open && unreadCount > 0) {
      // Delay slightly so unread count is visible before reset
      const timer = setTimeout(markAllRead, 1500);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleNotificationClick = (n: NotificationLog) => {
    const cfg = typeConfig(n.type);
    setOpen(false);
    navigate(cfg.href);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        title="Уведомления"
        className="relative p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-800">Уведомления</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full">
                  {unreadCount} новых
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                  title="Отметить все как прочитанные"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Прочитать все</span>
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Bell className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Нет уведомлений</p>
              </div>
            ) : (
              notifications.map(n => {
                const cfg = typeConfig(n.type);
                const Icon = cfg.icon;
                const isUnread = new Date(n.createdAt).getTime() > lastSeen;

                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      isUnread ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${cfg.bg}`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-semibold leading-snug ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                          {n.subject}
                        </p>
                        {isUnread && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                        {n.content.replace(/\n/g, ' · ')}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5 text-center">
              <p className="text-xs text-gray-400">Показаны последние {notifications.length} событий</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
