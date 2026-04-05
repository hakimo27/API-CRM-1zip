import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  Bell, MessageSquare, ShoppingBag, ShoppingCart,
  CalendarCheck, X, ChevronRight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface NotificationLog {
  id: number;
  type: string;
  subject: string;
  content: string;
  createdAt: string;
}

interface Counts {
  newOrders: number;
  newSaleOrders: number;
  pendingBookings: number;
  unreadChats: number;
}

function typeConfig(type: string) {
  switch (type) {
    case 'new_chat':
      return { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Новый чат' };
    case 'new_message':
      return { icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-50', label: 'Сообщение' };
    case 'new_rental_order':
      return { icon: ShoppingBag, color: 'text-green-500', bg: 'bg-green-50', label: 'Заказ аренды' };
    case 'new_sale_order':
      return { icon: ShoppingCart, color: 'text-violet-500', bg: 'bg-violet-50', label: 'Заказ магазина' };
    case 'new_tour_booking':
      return { icon: CalendarCheck, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Бронирование тура' };
    default:
      return { icon: Bell, color: 'text-gray-400', bg: 'bg-gray-50', label: 'Уведомление' };
  }
}

function typeHref(type: string): string {
  switch (type) {
    case 'new_chat':
    case 'new_message':   return '/chat';
    case 'new_rental_order': return '/orders';
    case 'new_sale_order':   return '/sale-orders';
    case 'new_tour_booking': return '/tour-bookings';
    default: return '/';
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

  // ── Shared query with AdminLayout (same key → no duplicate fetch) ──────────
  const { data: counts = { newOrders: 0, newSaleOrders: 0, pendingBookings: 0, unreadChats: 0 } } =
    useQuery<Counts>({
      queryKey: ['crm-counts'],
      queryFn: () => api.get<Counts>('/notifications/counts'),
      refetchInterval: 8_000,
      staleTime: 4_000,
    });

  // ── Separate chat/sessions/unread endpoint as requested ───────────────────
  const { data: chatUnreadData } = useQuery<{ unread: number }>({
    queryKey: ['chat-unread'],
    queryFn: () => api.get<{ unread: number }>('/chat/sessions/unread'),
    refetchInterval: 8_000,
    staleTime: 4_000,
  });

  // ── Recent notification log ───────────────────────────────────────────────
  const { data: notifications = [] } = useQuery<NotificationLog[]>({
    queryKey: ['notifications-recent'],
    queryFn: () => api.get<NotificationLog[]>('/notifications/recent?limit=20'),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  // ── Total badge = sum of all actionable items ─────────────────────────────
  // Use chat/sessions/unread data if available, fall back to counts.unreadChats
  const chatCount = chatUnreadData?.unread ?? counts.unreadChats ?? 0;
  const totalBadge =
    (counts.newOrders ?? 0) +
    (counts.newSaleOrders ?? 0) +
    (counts.pendingBookings ?? 0) +
    chatCount;

  // ── Actionable quick-links (only non-zero items) ─────────────────────────
  const actionItems = [
    {
      label: 'Заказы аренды',
      count: counts.newOrders ?? 0,
      href: '/orders',
      Icon: ShoppingBag,
      colorText: 'text-green-600',
      colorBg: 'bg-green-50',
      badgeBg: 'bg-green-100 text-green-700',
    },
    {
      label: 'Заказы магазина',
      count: counts.newSaleOrders ?? 0,
      href: '/sale-orders',
      Icon: ShoppingCart,
      colorText: 'text-violet-600',
      colorBg: 'bg-violet-50',
      badgeBg: 'bg-violet-100 text-violet-700',
    },
    {
      label: 'Бронирования',
      count: counts.pendingBookings ?? 0,
      href: '/tour-bookings',
      Icon: CalendarCheck,
      colorText: 'text-amber-600',
      colorBg: 'bg-amber-50',
      badgeBg: 'bg-amber-100 text-amber-700',
    },
    {
      label: 'Чаты с клиентами',
      count: chatCount,
      href: '/chat',
      Icon: MessageSquare,
      colorText: 'text-blue-600',
      colorBg: 'bg-blue-50',
      badgeBg: 'bg-blue-100 text-blue-700',
    },
  ].filter(item => item.count > 0);

  // ── Close on outside click ────────────────────────────────────────────────
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

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* ── Bell button ───────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        title={totalBadge > 0 ? `${totalBadge} требует внимания` : 'Уведомления'}
        className={`relative p-1.5 rounded-lg transition-colors ${
          totalBadge > 0
            ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
            : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
        }`}
      >
        <Bell className="w-4 h-4" />
        {totalBadge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5 leading-none">
            {totalBadge > 99 ? '99+' : totalBadge}
          </span>
        )}
      </button>

      {/* ── Dropdown ──────────────────────────────────────────────────── */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-800">Уведомления</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ── Section 1: Actionable counts ─────────────────────────── */}
          {actionItems.length > 0 && (
            <div className="border-b border-gray-100">
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Требуют внимания
              </p>
              <div className="pb-2">
                {actionItems.map(({ label, count, href, Icon, colorText, colorBg, badgeBg }) => (
                  <button
                    key={href}
                    onClick={() => go(href)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorBg}`}>
                      <Icon className={`w-4 h-4 ${colorText}`} />
                    </div>
                    <span className="flex-1 text-sm text-gray-700 font-medium">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${badgeBg}`}>
                        {count}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {actionItems.length === 0 && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-400 text-center py-1">
                Нет новых событий, требующих внимания
              </p>
            </div>
          )}

          {/* ── Section 2: Recent notification log ───────────────────── */}
          <div>
            <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Последние события
            </p>
            <div className="max-h-[260px] overflow-y-auto divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                  <Bell className="w-7 h-7 mb-1.5 opacity-30" />
                  <p className="text-xs">Нет событий</p>
                </div>
              ) : (
                notifications.map(n => {
                  const cfg = typeConfig(n.type);
                  const Icon = cfg.icon;

                  return (
                    <button
                      key={n.id}
                      onClick={() => go(typeHref(n.type))}
                      className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${cfg.bg}`}>
                        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 leading-snug truncate">
                          {n.subject}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed line-clamp-1">
                          {n.content.replace(/\n/g, ' · ')}
                        </p>
                      </div>
                      <span className="flex-shrink-0 text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
                        {timeAgo(n.createdAt)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2 text-center bg-gray-50">
              <p className="text-[10px] text-gray-400">
                {notifications.length} последних событий
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
