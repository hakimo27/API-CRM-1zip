import { useState } from "react";
import { Link, useParams } from "wouter";
import { ChevronLeft, Shield, Calendar, Minus, Plus, ShoppingCart, AlertCircle } from "lucide-react";
import { useGetProduct, useCheckAvailability, useCalculatePrice } from "@workspace/api-client-react";
import { useCart } from "@/hooks/useCart";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const TARIFF_LABELS: Record<string, string> = {
  weekend: "Выходные",
  weekday: "Будни",
  week: "Неделя",
  may_holidays: "Майские праздники",
};

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem, setDates } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  const { data: product, isLoading, error } = useGetProduct(slug, {
    query: { enabled: !!slug },
  });

  const { data: availability } = useCheckAvailability(
    { productId: product?.id ?? 0, startDate, endDate, quantity },
    {
      query: {
        enabled: !!product && !!startDate && !!endDate && startDate < endDate,
      },
    },
  );

  const { data: pricing } = useCalculatePrice(
    { productId: product?.id ?? 0, startDate, endDate, quantity },
    {
      query: {
        enabled: !!product && !!startDate && !!endDate && startDate < endDate,
      },
    },
  );

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      quantity,
      depositAmount: product.depositAmount ?? null,
      mainImage: product.images?.[0]?.url ?? null,
    });
    if (startDate && endDate) {
      setDates(startDate, endDate);
    }
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="h-96 bg-gray-200 rounded-xl" />
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="text-4xl mb-4">😔</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Товар не найден</h2>
        <Link href="/catalog">
          <button className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700">
            Вернуться в каталог
          </button>
        </Link>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/catalog">
        <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Назад в каталог
        </button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Images */}
        <div>
          <div className="relative h-96 bg-gradient-to-br from-blue-50 to-slate-100 rounded-xl overflow-hidden mb-3">
            {images.length > 0 ? (
              <img
                src={images[selectedImage]?.url}
                alt={images[selectedImage]?.alt ?? product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl">🛶</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(i)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === selectedImage ? "border-blue-500" : "border-gray-200"
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="text-sm text-blue-600 font-medium mb-2">{product.categoryName}</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{product.h1 ?? product.name}</h1>
          {product.sku && <div className="text-xs text-gray-400 mb-3">Арт. {product.sku}</div>}

          <div className="flex flex-wrap gap-2 mb-4">
            {product.capacity && (
              <span className="bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full font-medium">
                {product.capacity} мест
              </span>
            )}
            {product.constructionType && (
              <span className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
                {product.constructionType}
              </span>
            )}
            {product.weight && (
              <span className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
                {product.weight} кг
              </span>
            )}
          </div>

          {product.shortDescription && (
            <p className="text-gray-600 text-sm leading-relaxed mb-5">{product.shortDescription}</p>
          )}

          {/* Tariffs */}
          {product.tariffs && product.tariffs.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <div className="text-sm font-semibold text-gray-700 mb-3">Тарифы аренды</div>
              <div className="space-y-2">
                {product.tariffs.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {TARIFF_LABELS[t.type] ?? t.label}
                      {t.minDays && ` (min ${t.minDays} дн.)`}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {t.pricePerDay.toLocaleString("ru-RU")} ₽/день
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deposit */}
          {product.depositAmount && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5">
              <Shield className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="text-sm">
                <span className="text-amber-800 font-medium">Залог: {product.depositAmount.toLocaleString("ru-RU")} ₽</span>
                <span className="text-amber-600"> — возвращается при сдаче снаряжения</span>
              </div>
            </div>
          )}

          {/* Date picker */}
          <div className="border border-gray-200 rounded-xl p-4 mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Выберите даты
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Начало</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Конец</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || new Date().toISOString().split("T")[0]}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {availability && (
              <div className={`text-sm mb-3 flex items-center gap-2 ${availability.available ? "text-green-600" : "text-red-600"}`}>
                {availability.available ? (
                  <span>Доступно {availability.availableQuantity} шт.</span>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>{availability.message}</span>
                  </>
                )}
              </div>
            )}

            {pricing && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-600">Период: {pricing.days} дн.</span>
                  <span className="text-gray-500 text-xs">{pricing.tariffUsed && TARIFF_LABELS[pricing.tariffUsed]}</span>
                </div>
                <div className="flex justify-between items-center font-semibold text-gray-900">
                  <span>{pricing.managerReviewRequired ? "Ориентировочная стоимость" : "Стоимость"}</span>
                  <span className="text-blue-700 text-base">
                    {((pricing.exactPrice ?? pricing.approximatePrice) ?? 0).toLocaleString("ru-RU")} ₽
                  </span>
                </div>
                {pricing.managerReviewRequired && (
                  <div className="text-xs text-amber-600 mt-1">* Менеджер уточнит финальную цену</div>
                )}
              </div>
            )}
          </div>

          {/* Quantity & Add to cart */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-2.5 hover:bg-gray-50 text-gray-600 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 py-2 font-semibold text-gray-900 min-w-[3rem] text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-3 py-2.5 hover:bg-gray-50 text-gray-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                addedToCart
                  ? "bg-green-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              {addedToCart ? "Добавлено!" : "Добавить в корзину"}
            </button>
          </div>

          <Link href="/cart">
            <button className="w-full border border-blue-600 text-blue-600 hover:bg-blue-50 py-3 rounded-xl font-semibold text-sm transition-colors">
              Перейти в корзину
            </button>
          </Link>
        </div>
      </div>

      {/* Full description */}
      {product.fullDescription && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Описание</h2>
          <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed">
            {product.fullDescription}
          </div>
        </div>
      )}

      {/* Kit */}
      {product.kit && (
        <div className="mt-8 bg-gray-50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Комплектация</h2>
          <p className="text-gray-600 text-sm leading-relaxed">{product.kit}</p>
        </div>
      )}
    </div>
  );
}
