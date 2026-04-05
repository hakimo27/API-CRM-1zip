import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useSaleCart } from '@/contexts/SaleCartContext';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, ShoppingBag, Menu, X, User, Phone, Mail, MessageCircle, MapPin, Clock } from 'lucide-react';
import { useState } from 'react';
import ChatWidget from './ChatWidget';

const API = '/api';

function usePublicSettings() {
  return useQuery<Record<string, unknown>>({
    queryKey: ['public-settings'],
    queryFn: () => fetch(`${API}/settings/public`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });
}

function str(v: unknown, fallback = ''): string {
  return (v && typeof v === 'string' && v.trim()) ? v.trim() : fallback;
}

function mediaUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return url.replace('/uploads/', '/api/uploads/');
  return url;
}

function bool(v: unknown, fallback = false): boolean {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === 1) return true;
  if (v === 'false' || v === 0) return false;
  return fallback;
}

function LogoMark({ name, logoUrl }: { name: string; logoUrl: string }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        style={{ height: '150px', width: 'auto', maxWidth: '500px', objectFit: 'contain' }}
      />
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-xl leading-none">БД</span>
      </div>
      <span className="font-bold text-2xl text-gray-900">{name}</span>
    </div>
  );
}

function LogoMarkLight({ name, logoUrl, logoLightUrl }: { name: string; logoUrl: string; logoLightUrl: string }) {
  const src = logoLightUrl || logoUrl;
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ height: '150px', width: 'auto', maxWidth: '500px', objectFit: 'contain' }}
      />
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div
        className="bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ width: 'clamp(40px, 5vw, 52px)', height: 'clamp(40px, 5vw, 52px)' }}
      >
        <span className="text-white font-bold leading-none" style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}>БД</span>
      </div>
      <span className="font-bold text-white" style={{ fontSize: 'clamp(18px, 2.5vw, 24px)' }}>{name}</span>
    </div>
  );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { itemCount: saleItemCount } = useSaleCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { data: settings = {}, isSuccess: settingsLoaded } = usePublicSettings();

  const companyName  = str(settings['general.company_name'], 'Байдабаза');
  const phone        = str(settings['contacts.phone'], '+7 (999) 000-00-00');
  const phone2       = str(settings['contacts.phone2']);
  const email        = str(settings['contacts.email']);
  const address      = str(settings['contacts.address']);
  const schedule     = str(settings['contacts.schedule']);
  const tgUsername   = str(settings['contacts.telegram']);
  const vkUrl        = str(settings['contacts.vk']);
  const footerText   = str(settings['general.footer_text'], 'Аренда байдарок, каноэ и SUP-досок в Москве и Подмосковье');
  const copyright    = str(settings['general.copyright'], `Байдабаза ${new Date().getFullYear()}`);
  const logoUrl      = mediaUrl(str(settings['branding.logo_url']));
  const logoLightUrl = mediaUrl(str(settings['branding.logo_light_url']));
  const chatEnabled          = bool(settings['chat.enabled'], true);
  const chatGreeting         = str(settings['chat.greeting'] as string, 'Здравствуйте! Чем можем помочь?');
  const chatPlaceholder      = str(settings['chat.placeholder'] as string, 'Напишите нам...');
  const chatCollectName      = bool(settings['chat.collect_name'], false);
  const chatCollectPhone     = bool(settings['chat.collect_phone'], false);
  const chatCollectEmail     = bool(settings['chat.collect_email'], false);
  const chatOfflineFormEnabled = bool(settings['chat.offline_form_enabled'], false);
  const chatOfflineMessageText = str(settings['chat.offline_message_text'] as string, 'Сейчас мы вне рабочего времени. Оставьте контакты — мы свяжемся с вами в рабочие часы.');
  const chatRequireName      = bool(settings['chat.offline_form_require_name'], false);
  const chatRequirePhone     = bool(settings['chat.offline_form_require_phone'], false);
  const chatRequireEmail     = bool(settings['chat.offline_form_require_email'], false);
  const chatWorkingHours     = settings['chat.working_hours'] as string | undefined;
  const chatTimezone         = str(settings['chat.working_hours_timezone'] as string, 'Europe/Moscow');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-40">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <LogoMark name={companyName} logoUrl={logoUrl} />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/catalog" className="text-gray-700 hover:text-blue-600 transition-colors">Аренда</Link>
              <Link href="/sale" className="text-gray-700 hover:text-blue-600 transition-colors">Продажа</Link>
              <Link href="/tours" className="text-gray-700 hover:text-blue-600 transition-colors">Туры</Link>
              <Link href="/info/about" className="text-gray-700 hover:text-blue-600 transition-colors">О нас</Link>
              <Link href="/info/contacts" className="text-gray-700 hover:text-blue-600 transition-colors">Контакты</Link>
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <a href={`tel:${phone.replace(/\D/g, '')}`}
                className="hidden lg:flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors px-2 font-medium">
                <Phone className="w-4 h-4" />
                <span>{phone}</span>
              </a>

              {saleItemCount > 0 && (
                <Link href="/sale/cart" className="relative p-2 text-gray-700 hover:text-orange-600 transition-colors" title="Корзина покупок">
                  <ShoppingBag className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {saleItemCount}
                  </span>
                </Link>
              )}

              <Link href="/cart" className="relative p-2 text-gray-700 hover:text-blue-600 transition-colors" title="Корзина аренды">
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {itemCount}
                  </span>
                )}
              </Link>

              {user ? (
                <div className="relative">
                  <button onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 p-2 text-gray-700 hover:text-blue-600 transition-colors rounded-lg hover:bg-gray-50">
                    <User className="w-5 h-5" />
                    <span className="hidden md:inline text-sm font-medium">{user.firstName}</span>
                  </button>
                  {dropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                      <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1">
                        <Link href="/account" onClick={() => setDropdownOpen(false)}
                          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Мой аккаунт</Link>
                        <Link href="/account/orders" onClick={() => setDropdownOpen(false)}
                          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Мои заказы</Link>
                        {['admin', 'super_admin', 'superadmin', 'manager'].includes(user.role) && (
                          <a href="/crm"
                            className="block px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50">Панель управления</a>
                        )}
                        <div className="border-t border-gray-100 my-1" />
                        <button onClick={() => { logout(); setDropdownOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">Выйти</button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-gray-700">
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1">
            <Link href="/catalog" onClick={() => setMenuOpen(false)} className="block text-gray-700 font-medium py-2 px-2 rounded-lg hover:bg-gray-50">Аренда</Link>
            <Link href="/sale" onClick={() => setMenuOpen(false)} className="block text-gray-700 font-medium py-2 px-2 rounded-lg hover:bg-gray-50">Продажа</Link>
            <Link href="/tours" onClick={() => setMenuOpen(false)} className="block text-gray-700 font-medium py-2 px-2 rounded-lg hover:bg-gray-50">Туры</Link>
            <Link href="/info/about" onClick={() => setMenuOpen(false)} className="block text-gray-700 font-medium py-2 px-2 rounded-lg hover:bg-gray-50">О нас</Link>
            <Link href="/info/contacts" onClick={() => setMenuOpen(false)} className="block text-gray-700 font-medium py-2 px-2 rounded-lg hover:bg-gray-50">Контакты</Link>
            <div className="border-t border-gray-100 my-2" />
            <a href={`tel:${phone.replace(/\D/g, '')}`} onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 text-blue-600 font-semibold py-2 px-2 rounded-lg hover:bg-blue-50">
              <Phone className="w-4 h-4" /> {phone}
            </a>
            {phone2 && (
              <a href={`tel:${phone2.replace(/\D/g, '')}`} onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 text-blue-600 font-medium py-2 px-2 rounded-lg hover:bg-blue-50 text-sm">
                <Phone className="w-4 h-4" /> {phone2}
              </a>
            )}
            {user && (
              <Link href="/account" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 text-gray-700 font-medium py-2 px-2 rounded-lg hover:bg-gray-50">
                <User className="w-4 h-4" /> Мой аккаунт
              </Link>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-gray-900 text-gray-300 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div>
              <div className="mb-3">
                <LogoMarkLight name={companyName} logoUrl={logoUrl} logoLightUrl={logoLightUrl} />
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mt-3">{footerText}</p>
            </div>

            {/* Catalog */}
            <div>
              <h3 className="font-semibold text-white mb-3">Снаряжение</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/catalog?category=kayaks" className="hover:text-white transition-colors">Аренда байдарок</Link></li>
                <li><Link href="/catalog?category=canoes" className="hover:text-white transition-colors">Аренда каноэ</Link></li>
                <li><Link href="/catalog?category=sup" className="hover:text-white transition-colors">Аренда SUP-досок</Link></li>
                <li><Link href="/sale" className="hover:text-white transition-colors">Продажа снаряжения</Link></li>
                <li><Link href="/tours" className="hover:text-white transition-colors">Туры и рафтинг</Link></li>
              </ul>
            </div>

            {/* Info */}
            <div>
              <h3 className="font-semibold text-white mb-3">Информация</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/info/about" className="hover:text-white transition-colors">О компании</Link></li>
                <li><Link href="/info/delivery" className="hover:text-white transition-colors">Доставка и возврат</Link></li>
                <li><Link href="/info/faq" className="hover:text-white transition-colors">Вопросы и ответы</Link></li>
                <li><Link href="/info/contacts" className="hover:text-white transition-colors">Контакты</Link></li>
              </ul>
            </div>

            {/* Contacts */}
            <div>
              <h3 className="font-semibold text-white mb-3">Контакты</h3>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
                  <div>
                    <a href={`tel:${phone.replace(/\D/g, '')}`} className="hover:text-white transition-colors block font-medium">{phone}</a>
                    {phone2 && <a href={`tel:${phone2.replace(/\D/g, '')}`} className="hover:text-white transition-colors block text-gray-400">{phone2}</a>}
                  </div>
                </li>
                {email && (
                  <li className="flex items-center gap-2">
                    <Mail className="w-4 h-4 flex-shrink-0 text-blue-400" />
                    <a href={`mailto:${email}`} className="hover:text-white transition-colors">{email}</a>
                  </li>
                )}
                {address && (
                  <li className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
                    <span>{address}</span>
                  </li>
                )}
                {schedule && (
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4 flex-shrink-0 text-blue-400" />
                    <span>{schedule}</span>
                  </li>
                )}
                {tgUsername && (
                  <li className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 flex-shrink-0 text-blue-400" />
                    <a href={`https://t.me/${tgUsername}`} target="_blank" rel="noopener noreferrer"
                      className="hover:text-white transition-colors">@{tgUsername}</a>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <span>© {new Date().getFullYear()} {copyright}</span>
            <div className="flex items-center gap-4">
              {vkUrl && <a href={vkUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">ВКонтакте</a>}
              {tgUsername && (
                <a href={`https://t.me/${tgUsername}`} target="_blank" rel="noopener noreferrer"
                  className="hover:text-gray-300 transition-colors">Telegram</a>
              )}
            </div>
          </div>
        </div>
      </footer>

      {settingsLoaded && chatEnabled && (
        <ChatWidget
          enabled={chatEnabled}
          greeting={chatGreeting}
          placeholder={chatPlaceholder}
          collectName={chatCollectName}
          collectPhone={chatCollectPhone}
          collectEmail={chatCollectEmail}
          offlineFormEnabled={chatOfflineFormEnabled}
          offlineMessageText={chatOfflineMessageText}
          requireName={chatRequireName}
          requirePhone={chatRequirePhone}
          requireEmail={chatRequireEmail}
          workingHoursJson={chatWorkingHours}
          timezone={chatTimezone}
        />
      )}
    </div>
  );
}
