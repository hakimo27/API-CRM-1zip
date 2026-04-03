import { Link, useLocation } from "wouter";
import { ShoppingCart, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";
import ChatWidget from "./ChatWidget";

const navLinks = [
  { href: "/catalog", label: "Каталог" },
  { href: "/pages/delivery", label: "Доставка" },
  { href: "/pages/pickup", label: "Самовывоз" },
  { href: "/pages/faq", label: "FAQ" },
  { href: "/pages/contacts", label: "Контакты" },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <span className="flex items-center gap-2 font-bold text-xl text-slate-900 cursor-pointer select-none">
                <span className="text-2xl">🛶</span>
                <span>КаякПрокат</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((l) => (
                <Link key={l.href} href={l.href}>
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-blue-600 cursor-pointer",
                      location === l.href ? "text-blue-600" : "text-gray-600",
                    )}
                  >
                    {l.label}
                  </span>
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <Link href="/cart">
                <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <ShoppingCart className="w-5 h-5 text-gray-700" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                      {itemCount}
                    </span>
                  )}
                </button>
              </Link>
              <button
                className="md:hidden p-2 rounded-full hover:bg-gray-100 transition-colors"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 space-y-2">
              {navLinks.map((l) => (
                <Link key={l.href} href={l.href}>
                  <span
                    className="block text-sm font-medium py-2 text-gray-700 hover:text-blue-600 cursor-pointer"
                    onClick={() => setMenuOpen(false)}
                  >
                    {l.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-slate-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="font-bold text-white text-lg mb-3">КаякПрокат</div>
              <p className="text-sm leading-relaxed">
                Прокат байдарок, SUP-бордов и туристического снаряжения для активного отдыха на воде.
              </p>
            </div>
            <div>
              <div className="font-semibold text-white mb-3">Навигация</div>
              <ul className="space-y-2 text-sm">
                {navLinks.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href}>
                      <span className="hover:text-white transition-colors cursor-pointer">{l.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-white mb-3">Контакты</div>
              <ul className="space-y-2 text-sm">
                <li>Телефон: +7 (XXX) XXX-XX-XX</li>
                <li>Telegram: @kayakprokat</li>
                <li className="pt-1">
                  <Link href="/pages/rental-terms">
                    <span className="hover:text-white transition-colors cursor-pointer">Правила аренды</span>
                  </Link>
                </li>
                <li>
                  <Link href="/pages/contacts">
                    <span className="hover:text-white transition-colors cursor-pointer">Написать нам</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 mt-8 pt-6 text-xs text-center">
            © {new Date().getFullYear()} КаякПрокат. Все права защищены.
          </div>
        </div>
      </footer>

      <ChatWidget />
    </div>
  );
}
