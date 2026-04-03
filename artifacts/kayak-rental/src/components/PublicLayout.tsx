import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { ShoppingCart, Menu, X, User, Phone, Mail } from 'lucide-react';
import { useState } from 'react';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-700">
              <span className="text-2xl">🛶</span>
              <span>КаякРент</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/catalog" className="text-gray-700 hover:text-blue-600 transition-colors">Каталог</Link>
              <Link href="/tours" className="text-gray-700 hover:text-blue-600 transition-colors">Туры</Link>
              <Link href="/info/about" className="text-gray-700 hover:text-blue-600 transition-colors">О нас</Link>
              <Link href="/info/contacts" className="text-gray-700 hover:text-blue-600 transition-colors">Контакты</Link>
            </nav>

            <div className="flex items-center gap-3">
              <Link href="/cart" className="relative p-2 text-gray-700 hover:text-blue-600 transition-colors">
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {itemCount}
                  </span>
                )}
              </Link>

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden md:inline">{user.firstName}</span>
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl border border-gray-100 z-50">
                      <Link href="/account" onClick={() => setDropdownOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Мой аккаунт</Link>
                      <Link href="/account/orders" onClick={() => setDropdownOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Мои заказы</Link>
                      {['admin', 'super_admin', 'manager', 'operator'].includes(user.role) && (
                        <a href="/crm" className="block px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50">Панель управления</a>
                      )}
                      <div className="border-t border-gray-100 mt-1" />
                      <button onClick={() => { logout(); setDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">Выйти</button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="text-sm font-medium px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Войти
                </Link>
              )}

              <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-gray-700">
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            <Link href="/catalog" onClick={() => setMenuOpen(false)} className="block text-gray-700 font-medium py-1">Каталог</Link>
            <Link href="/tours" onClick={() => setMenuOpen(false)} className="block text-gray-700 font-medium py-1">Туры</Link>
            <Link href="/info/about" onClick={() => setMenuOpen(false)} className="block text-gray-700 font-medium py-1">О нас</Link>
            <Link href="/info/contacts" onClick={() => setMenuOpen(false)} className="block text-gray-700 font-medium py-1">Контакты</Link>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-gray-900 text-gray-300 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 font-bold text-xl text-white mb-4">
                <span className="text-2xl">🛶</span>
                <span>КаякРент</span>
              </div>
              <p className="text-sm text-gray-400">Аренда байдарок, каноэ и SUP-досок в Москве и Подмосковье</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">Каталог</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/catalog?category=kayaks" className="hover:text-white transition-colors">Байдарки</Link></li>
                <li><Link href="/catalog?category=canoes" className="hover:text-white transition-colors">Каноэ</Link></li>
                <li><Link href="/catalog?category=sup" className="hover:text-white transition-colors">SUP-доски</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">Информация</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/info/about" className="hover:text-white transition-colors">О компании</Link></li>
                <li><Link href="/info/delivery" className="hover:text-white transition-colors">Доставка и возврат</Link></li>
                <li><Link href="/info/faq" className="hover:text-white transition-colors">Вопросы и ответы</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">Контакты</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><Phone className="w-4 h-4" /><a href="tel:84951234567" className="hover:text-white transition-colors">8 (495) 123-45-67</a></li>
                <li className="flex items-center gap-2"><Mail className="w-4 h-4" /><a href="mailto:info@kayak.ru" className="hover:text-white transition-colors">info@kayak.ru</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} КаякРент. Все права защищены.
          </div>
        </div>
      </footer>
    </div>
  );
}
