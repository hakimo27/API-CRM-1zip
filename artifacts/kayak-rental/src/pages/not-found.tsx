import { Link } from 'wouter';
import { Anchor, ArrowLeft, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <span className="text-8xl font-extrabold text-blue-100 select-none">404</span>
            <div className="absolute inset-0 flex items-center justify-center">
              <Anchor className="w-12 h-12 text-blue-400" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">Страница не найдена</h1>
        <p className="text-gray-500 mb-8">
          Возможно, страница была перемещена или удалена. Воспользуйтесь навигацией, чтобы найти нужное.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6 max-w-xs mx-auto">
          <Link href="/catalog"
            className="flex flex-col items-center gap-1.5 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors text-blue-700 font-medium text-sm">
            <span className="text-2xl">🛶</span>
            Аренда
          </Link>
          <Link href="/tours"
            className="flex flex-col items-center gap-1.5 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors text-blue-700 font-medium text-sm">
            <span className="text-2xl">🗺️</span>
            Туры
          </Link>
          <Link href="/sale"
            className="flex flex-col items items-center gap-1.5 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors text-blue-700 font-medium text-sm">
            <span className="text-2xl">🏪</span>
            Продажа
          </Link>
          <Link href="/info/faq"
            className="flex flex-col items-center gap-1.5 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors text-blue-700 font-medium text-sm">
            <span className="text-2xl">❓</span>
            FAQ
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/"
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            На главную
          </Link>
          <Link href="/info/contacts"
            className="inline-flex items-center gap-2 px-5 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
            Контакты
          </Link>
        </div>
      </div>
    </div>
  );
}
