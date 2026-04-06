import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Phone, Mail, Clock, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { RichContent } from '@/components/RichContent';
import { useSeoMeta } from '@/hooks/useSeoMeta';

const FALLBACK_STATIC: Record<string, { title: string; content: string }> = {
  about: {
    title: 'О компании',
    content: `КаякРент — ведущий прокат водного снаряжения в Москве и Подмосковье.

Мы работаем с 2015 года и за это время помогли тысячам туристов, рыболовов и просто любителей активного отдыха открыть для себя удивительный мир водных путешествий.

В нашем парке более 100 единиц снаряжения: байдарки, каноэ, SUP-доски и плоты ведущих российских и зарубежных производителей. Всё оборудование регулярно проходит техническое обслуживание и проверку безопасности.

Наши преимущества:
• Большой выбор снаряжения на любой вкус и бюджет
• Гибкие условия аренды — от 1 дня
• Доставка к месту старта маршрута
• Консультации по маршрутам и экипировке
• Быстрое оформление заказа онлайн`,
  },
  delivery: {
    title: 'Доставка и возврат',
    content: `Доставка снаряжения

Мы доставляем снаряжение к месту старта вашего маршрута в Москве и Московской области.

Стоимость доставки рассчитывается индивидуально в зависимости от расстояния. Уточняйте при оформлении заказа.

Возврат снаряжения

Снаряжение возвращается в оговорённое место или привозится обратно в наш офис.

При повреждении снаряжения по вине арендатора удерживается залог или его часть.

Залог

Залог возвращается в полном объёме при возврате снаряжения в сохранном виде.`,
  },
  privacy: {
    title: 'Политика конфиденциальности',
    content: `Настоящая политика конфиденциальности определяет порядок сбора, использования и защиты персональных данных пользователей сайта.

Мы собираем только необходимые данные для обработки заказов: имя, телефон, email.

Ваши данные не передаются третьим лицам без вашего согласия.`,
  },
};

function FaqAccordion({ faqs }: { faqs: Array<{ id: number; question: string; answer: string; category?: string }> }) {
  const [openId, setOpenId] = useState<number | null>(null);

  if (faqs.length === 0) {
    return (
      <p className="text-gray-500 py-4">FAQ пока не добавлены. Вы можете задать вопрос по телефону или email.</p>
    );
  }

  const grouped = faqs.reduce<Record<string, typeof faqs>>((acc, faq) => {
    const cat = faq.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {});

  const catLabels: Record<string, string> = {
    general: 'Общие вопросы',
    rental: 'Аренда',
    delivery: 'Доставка',
    payment: 'Оплата и залог',
    tours: 'Туры',
  };

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          {Object.keys(grouped).length > 1 && (
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{catLabels[cat] || cat}</h3>
          )}
          <div className="space-y-2">
            {items.map(faq => (
              <div key={faq.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                >
                  <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                  {openId === faq.id
                    ? <ChevronUp className="w-4 h-4 text-blue-600 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                </button>
                {openId === faq.id && (
                  <div className="px-5 pb-4 bg-gray-50">
                    <RichContent html={faq.answer} className="text-gray-600 text-sm" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BranchCard({ branch }: { branch: any }) {
  const getWorkingHours = (wh: any): string | null => {
    if (!wh) return null;
    if (typeof wh === 'string') return wh;
    if (typeof wh === 'object') {
      if (wh.schedule) return wh.schedule;
      const entries = Object.entries(wh);
      if (entries.length > 0) return entries.map(([d, h]) => `${d}: ${h}`).join(', ');
    }
    return null;
  };

  const workingHours = getWorkingHours(branch.workingHours);

  return (
    <div className={`border rounded-2xl p-6 ${branch.useForPickup ? 'border-blue-200 bg-blue-50/40' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">{branch.name}</h2>
        {branch.useForPickup && (
          <span className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            <MapPin className="w-3 h-3" /> Пункт самовывоза
          </span>
        )}
      </div>
      <div className="space-y-3">
        {branch.address && (
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-gray-900">{branch.address}</div>
              {branch.city && <div className="text-sm text-gray-500">{branch.city}</div>}
            </div>
          </div>
        )}
        {workingHours && (
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-gray-700">{workingHours}</div>
          </div>
        )}
        {Array.isArray(branch.phones) && branch.phones.length > 0 && (
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              {branch.phones.map((phone: string, i: number) => (
                <a key={i} href={`tel:${phone.replace(/[\s\-()]/g, '')}`}
                  className="block text-gray-900 hover:text-blue-600 transition-colors">
                  {phone}
                </a>
              ))}
            </div>
          </div>
        )}
        {Array.isArray(branch.emails) && branch.emails.length > 0 && (
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              {branch.emails.map((email: string, i: number) => (
                <a key={i} href={`mailto:${email}`}
                  className="block text-gray-900 hover:text-blue-600 transition-colors">
                  {email}
                </a>
              ))}
            </div>
          </div>
        )}
        {branch.lat && branch.lng && (
          <div className="mt-2">
            <a href={`https://maps.google.com/?q=${branch.lat},${branch.lng}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
              <MapPin className="w-4 h-4" /> Открыть на карте
            </a>
          </div>
        )}
      </div>
      {branch.description && (
        <p className="mt-4 text-gray-600 text-sm">{branch.description}</p>
      )}
    </div>
  );
}

function ContactsSection({ branches }: { branches: any[] }) {
  if (branches.length === 0) {
    return (
      <p className="text-gray-500 py-4">Контактная информация временно недоступна.</p>
    );
  }

  const pickupPoints = branches.filter(b => b.useForPickup);
  const otherBranches = branches.filter(b => !b.useForPickup);

  return (
    <div className="space-y-8">
      {pickupPoints.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Пункты самовывоза и проката</h2>
          <div className="space-y-4">
            {pickupPoints.map(branch => <BranchCard key={branch.id} branch={branch} />)}
          </div>
        </div>
      )}
      {otherBranches.length > 0 && (
        <div>
          {pickupPoints.length > 0 && <h2 className="text-2xl font-bold text-gray-900 mb-4">Другие офисы</h2>}
          <div className="space-y-4">
            {otherBranches.map(branch => <BranchCard key={branch.id} branch={branch} />)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function InfoPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading: pageLoading } = useQuery<any>({
    queryKey: ['page', slug],
    queryFn: () => api.get(`/content/pages/${slug}`),
    enabled: !!slug && !['contacts', 'faq'].includes(slug),
    retry: false,
  });

  const { data: faqs = [], isLoading: faqLoading } = useQuery<any[]>({
    queryKey: ['faqs'],
    queryFn: () => api.get('/content/faqs'),
    enabled: slug === 'faq',
  });

  const { data: branches = [], isLoading: branchesLoading } = useQuery<any[]>({
    queryKey: ['branches-contacts'],
    queryFn: () => api.get('/branches'),
    enabled: slug === 'contacts',
  });

  const staticFallback = FALLBACK_STATIC[slug || ''];

  const seoTitle =
    slug === 'faq' ? 'Вопросы и ответы' :
    slug === 'contacts' ? 'Контакты' :
    page?.metaTitle || page?.title || staticFallback?.title || slug;

  const seoDesc =
    page?.metaDescription ||
    (page?.content ? page.content.replace(/<[^>]*>/g, '').slice(0, 160).trim() : undefined);

  useSeoMeta({ title: seoTitle, description: seoDesc });

  if (slug === 'faq') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Вопросы и ответы</h1>
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          {faqLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <FaqAccordion faqs={faqs} />
          )}
        </div>
      </div>
    );
  }

  if (slug === 'contacts') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Контакты</h1>
        {branchesLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <ContactsSection branches={branches} />
        )}
      </div>
    );
  }

  const title = page?.title || staticFallback?.title || slug;
  const content = page?.content || staticFallback?.content || '';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{title}</h1>
      <div className="bg-white rounded-2xl border border-gray-100 p-8">
        {pageLoading && !staticFallback ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : content ? (
          <RichContent html={content} />
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Страница не найдена</p>
            <Link href="/" className="text-blue-600 hover:underline">На главную</Link>
          </div>
        )}
      </div>
    </div>
  );
}
