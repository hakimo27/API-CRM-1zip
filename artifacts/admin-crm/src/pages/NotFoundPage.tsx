import { Link } from 'wouter';
import { Compass, ArrowLeft, ShoppingBag, Package } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <span className="text-8xl font-extrabold text-gray-100 select-none">404</span>
            <div className="absolute inset-0 flex items-center justify-center">
              <Compass className="w-12 h-12 text-gray-400" />
            </div>
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-800 mb-2">Раздел не найден</h1>
        <p className="text-gray-500 text-sm mb-8">
          Этот раздел CRM не существует или был перемещён
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6 max-w-xs mx-auto">
          <Link href="/"
            className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-gray-700 font-medium text-sm border border-gray-200">
            <ArrowLeft className="w-5 h-5" />
            Главная
          </Link>
          <Link href="/orders"
            className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-gray-700 font-medium text-sm border border-gray-200">
            <ShoppingBag className="w-5 h-5" />
            Заказы
          </Link>
          <Link href="/products"
            className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-gray-700 font-medium text-sm border border-gray-200">
            <Package className="w-5 h-5" />
            Товары
          </Link>
          <Link href="/customers"
            className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-gray-700 font-medium text-sm border border-gray-200">
            <span className="text-lg">👥</span>
            Клиенты
          </Link>
        </div>
      </div>
    </div>
  );
}
