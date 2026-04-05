import { Injectable, Inject, Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import {
  categoriesTable,
  productsTable,
  tariffsTable,
  branchesTable,
  toursTable,
  tourDatesTable,
  tariffTemplatesTable,
  specTemplatesTable,
} from "@workspace/db";

type DrizzleDb = typeof import("@workspace/db").db;

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(@Inject(DB_TOKEN) private db: DrizzleDb) {}

  async runDemoSeed(): Promise<{ message: string; created: Record<string, number> }> {
    const created: Record<string, number> = {};

    // Check if demo data already exists
    const existing = await this.db.select({ id: categoriesTable.id }).from(categoriesTable).limit(1);
    if (existing.length > 0) {
      return { message: "Demo data already exists. Skipped.", created: {} };
    }

    this.logger.log("[Seed] Starting demo data seed...");

    // ── Categories ────────────────────────────────────────────────────────────
    const categories = await this.db.insert(categoriesTable).values([
      {
        name: "Байдарки",
        slug: "baydarka",
        description: "Туристические байдарки для сплавов и прогулок по рекам и озёрам",
        h1: "Аренда байдарок",
        metaTitle: "Аренда байдарок — прокат байдарок",
        metaDescription: "Аренда туристических байдарок. Двух- и трёхместные байдарки с доставкой.",
        sortOrder: 1,
        active: true,
      },
      {
        name: "Каноэ",
        slug: "kanoe",
        description: "Открытые каноэ для семейного отдыха и водных походов",
        h1: "Аренда каноэ",
        metaTitle: "Аренда каноэ — прокат каноэ",
        metaDescription: "Аренда каноэ. Открытые каноэ для семей и групп.",
        sortOrder: 2,
        active: true,
      },
      {
        name: "SUP-доски",
        slug: "sup",
        description: "Stand Up Paddle — доски для активного отдыха на воде",
        h1: "Аренда SUP-досок",
        metaTitle: "Аренда SUP-досок — прокат сапбордов",
        metaDescription: "Аренда SUP-досок (сапбордов). Надувные и жёсткие доски.",
        sortOrder: 3,
        active: true,
      },
      {
        name: "Снаряжение",
        slug: "snarjazhenie",
        description: "Вёсла, спасательные жилеты, гермомешки и сопутствующее снаряжение",
        h1: "Снаряжение для водного туризма",
        metaTitle: "Снаряжение для водного туризма",
        metaDescription: "Продажа и аренда снаряжения для водного туризма.",
        sortOrder: 4,
        active: true,
      },
      {
        name: "Рекомендуем",
        slug: "recom",
        description: "Рекомендуемые товары нашего магазина",
        h1: "Рекомендуемые товары",
        metaTitle: "Рекомендуемые товары",
        metaDescription: "Лучшие товары нашего магазина по версии наших экспертов.",
        sortOrder: 5,
        active: true,
      },
    ]).returning();
    created.categories = categories.length;
    this.logger.log(`[Seed] Created ${categories.length} categories`);

    const catBySlug = Object.fromEntries(categories.map(c => [c.slug, c.id]));

    // ── Rental Products (Байдарки) ────────────────────────────────────────────
    const rentalProducts = await this.db.insert(productsTable).values([
      {
        name: "Байдарка «Таймень-2»",
        slug: "baydarka-tajmen-2",
        sku: "BT-2",
        categoryId: catBySlug.baydarka,
        domainScope: "rental",
        shortDescription: "Классическая двухместная байдарка для туристических сплавов",
        fullDescription: "<p>Байдарка «Таймень-2» — проверенная временем классика российского водного туризма. Надёжная, устойчивая, подходит для рек любой категории сложности.</p><p><strong>Подходит для:</strong> семейных сплавов, многодневных походов, рыбалки.</p>",
        capacity: 2,
        constructionType: "Разборная (каркасная)",
        weight: "25 кг",
        dimensions: "480 × 72 × 28 см",
        kit: "Байдарка, 2 весла, 2 спасательных жилета, насос, ремкомплект",
        depositAmount: "3000",
        active: true,
        featured: true,
        totalStock: 8,
        sortOrder: 1,
        specifications: [
          { label: "Вместимость", value: "2", unit: "чел.", sortOrder: 1 },
          { label: "Грузоподъёмность", value: "200", unit: "кг", sortOrder: 2 },
          { label: "Длина", value: "480", unit: "см", sortOrder: 3 },
          { label: "Ширина", value: "72", unit: "см", sortOrder: 4 },
          { label: "Вес", value: "25", unit: "кг", sortOrder: 5 },
          { label: "Материал", value: "Прорезиненная ткань, дюралюминий", unit: "", sortOrder: 6 },
        ],
        metaTitle: "Аренда байдарки Таймень-2",
        metaDescription: "Аренда двухместной байдарки Таймень-2. Доступные цены.",
      },
      {
        name: "Байдарка «Таймень-3»",
        slug: "baydarka-tajmen-3",
        sku: "BT-3",
        categoryId: catBySlug.baydarka,
        domainScope: "rental",
        shortDescription: "Трёхместная байдарка для семейных и групповых сплавов",
        fullDescription: "<p>Байдарка «Таймень-3» — увеличенная версия легендарного Тайменя. Три кокпита позволяют взять с собой ребёнка или дополнительное снаряжение.</p>",
        capacity: 3,
        constructionType: "Разборная (каркасная)",
        weight: "32 кг",
        dimensions: "570 × 80 × 30 см",
        kit: "Байдарка, 3 весла, 3 спасательных жилета, насос, ремкомплект",
        depositAmount: "4000",
        active: true,
        featured: false,
        totalStock: 4,
        sortOrder: 2,
        specifications: [
          { label: "Вместимость", value: "3", unit: "чел.", sortOrder: 1 },
          { label: "Грузоподъёмность", value: "280", unit: "кг", sortOrder: 2 },
          { label: "Длина", value: "570", unit: "см", sortOrder: 3 },
          { label: "Ширина", value: "80", unit: "см", sortOrder: 4 },
          { label: "Вес", value: "32", unit: "кг", sortOrder: 5 },
        ],
        metaTitle: "Аренда байдарки Таймень-3",
        metaDescription: "Аренда трёхместной байдарки Таймень-3.",
      },
      {
        name: "Каноэ «Канада»",
        slug: "kanoe-kanada",
        sku: "KK-1",
        categoryId: catBySlug.kanoe,
        domainScope: "rental",
        shortDescription: "Открытое каноэ для спокойных рек и озёр",
        fullDescription: "<p>Открытое каноэ «Канада» — идеальный выбор для семейного отдыха на воде. Широкое и устойчивое, прощает ошибки начинающих.</p>",
        capacity: 3,
        constructionType: "Монолитный пластик",
        weight: "28 кг",
        dimensions: "520 × 90 × 35 см",
        kit: "Каноэ, 2 весла (одиночные), 3 спасательных жилета",
        depositAmount: "3500",
        active: true,
        featured: true,
        totalStock: 5,
        sortOrder: 1,
        specifications: [
          { label: "Вместимость", value: "3", unit: "чел.", sortOrder: 1 },
          { label: "Длина", value: "520", unit: "см", sortOrder: 2 },
          { label: "Ширина", value: "90", unit: "см", sortOrder: 3 },
          { label: "Вес", value: "28", unit: "кг", sortOrder: 4 },
          { label: "Материал", value: "ABS-пластик", unit: "", sortOrder: 5 },
        ],
        metaTitle: "Аренда каноэ Канада",
        metaDescription: "Аренда открытого каноэ для семейного отдыха.",
      },
      {
        name: "SUP-доска Aqua Marina",
        slug: "sup-aqua-marina",
        sku: "SUP-AM",
        categoryId: catBySlug.sup,
        domainScope: "rental",
        shortDescription: "Надувная SUP-доска для активного отдыха на воде",
        fullDescription: "<p>Надувная SUP-доска Aqua Marina — отличный выбор для тех, кто хочет попробовать сапбординг. Устойчивая, лёгкая, быстро надувается.</p>",
        capacity: 1,
        constructionType: "Надувная (Drop-Stitch)",
        weight: "9 кг",
        dimensions: "320 × 81 × 15 см",
        kit: "Доска, весло (регулируемое), насос, сумка-рюкзак, лиш",
        depositAmount: "5000",
        active: true,
        featured: true,
        totalStock: 10,
        sortOrder: 1,
        specifications: [
          { label: "Длина", value: "320", unit: "см", sortOrder: 1 },
          { label: "Ширина", value: "81", unit: "см", sortOrder: 2 },
          { label: "Толщина", value: "15", unit: "см", sortOrder: 3 },
          { label: "Вес доски", value: "9", unit: "кг", sortOrder: 4 },
          { label: "Максимальная нагрузка", value: "120", unit: "кг", sortOrder: 5 },
        ],
        metaTitle: "Аренда SUP-доски Aqua Marina",
        metaDescription: "Аренда надувной SUP-доски Aqua Marina. Прокат сапборда.",
      },
    ]).returning();
    created.rentalProducts = rentalProducts.length;

    // ── Sale Products ─────────────────────────────────────────────────────────
    const saleProducts = await this.db.insert(productsTable).values([
      {
        name: "Спасательный жилет Universal",
        slug: "zhilet-universal",
        sku: "ZH-UNI",
        categoryId: catBySlug.snarjazhenie,
        domainScope: "sale",
        shortDescription: "Спасательный жилет для водного туризма, размер универсальный",
        fullDescription: "<p>Сертифицированный спасательный жилет для активного водного туризма. Обеспечивает необходимую плавучесть и свободу движения.</p>",
        active: true,
        featured: false,
        totalStock: 50,
        sortOrder: 1,
        metaTitle: "Купить спасательный жилет",
        metaDescription: "Спасательный жилет для водного туризма. Сертифицированный.",
      },
      {
        name: "Весло туристическое разборное",
        slug: "veslo-turisticheskoe",
        sku: "VSL-TUR",
        categoryId: catBySlug.snarjazhenie,
        domainScope: "sale",
        shortDescription: "Двухлопастное разборное весло для байдарки и каноэ",
        fullDescription: "<p>Лёгкое алюминиевое весло для байдаров. Разбирается на 2 части, удобно для транспортировки. Длина регулируется.</p>",
        active: true,
        featured: false,
        totalStock: 30,
        sortOrder: 2,
        metaTitle: "Купить весло для байдарки",
        metaDescription: "Туристическое разборное весло для байдарки.",
      },
      {
        name: "Гермомешок 30 литров",
        slug: "germomeshok-30l",
        sku: "GERM-30",
        categoryId: catBySlug.snarjazhenie,
        domainScope: "sale",
        shortDescription: "Водонепроницаемый мешок 30л для защиты вещей на воде",
        fullDescription: "<p>Надёжный герметичный мешок объёмом 30 литров. Защищает вещи, документы и электронику от воды. Крепится к байдарке штатными креплениями.</p>",
        active: true,
        featured: true,
        totalStock: 40,
        sortOrder: 3,
        metaTitle: "Купить гермомешок 30л",
        metaDescription: "Водонепроницаемый гермомешок 30 литров для водного туризма.",
      },
    ]).returning();
    created.saleProducts = saleProducts.length;
    created.products = rentalProducts.length + saleProducts.length;
    this.logger.log(`[Seed] Created ${created.products} products`);

    // ── Tariffs for rental products ───────────────────────────────────────────
    const tariffRows: any[] = [];
    const tariffConfigs = [
      // Байдарка Таймень-2
      { productId: rentalProducts[0].id, type: "weekday", label: "Будни", pricePerDay: "1500", minDays: 1 },
      { productId: rentalProducts[0].id, type: "weekend", label: "Выходные", pricePerDay: "2000", minDays: 1 },
      { productId: rentalProducts[0].id, type: "week", label: "Неделя", pricePerDay: "1200", minDays: 7 },
      { productId: rentalProducts[0].id, type: "may_holidays", label: "Майские праздники", pricePerDay: "2500", minDays: 3 },
      // Байдарка Таймень-3
      { productId: rentalProducts[1].id, type: "weekday", label: "Будни", pricePerDay: "2000", minDays: 1 },
      { productId: rentalProducts[1].id, type: "weekend", label: "Выходные", pricePerDay: "2500", minDays: 1 },
      { productId: rentalProducts[1].id, type: "week", label: "Неделя", pricePerDay: "1700", minDays: 7 },
      { productId: rentalProducts[1].id, type: "may_holidays", label: "Майские праздники", pricePerDay: "3000", minDays: 3 },
      // Каноэ Канада
      { productId: rentalProducts[2].id, type: "weekday", label: "Будни", pricePerDay: "1800", minDays: 1 },
      { productId: rentalProducts[2].id, type: "weekend", label: "Выходные", pricePerDay: "2200", minDays: 1 },
      { productId: rentalProducts[2].id, type: "week", label: "Неделя", pricePerDay: "1500", minDays: 7 },
      { productId: rentalProducts[2].id, type: "may_holidays", label: "Майские праздники", pricePerDay: "2800", minDays: 3 },
      // SUP-доска
      { productId: rentalProducts[3].id, type: "weekday", label: "Будни", pricePerDay: "1000", minDays: 1 },
      { productId: rentalProducts[3].id, type: "weekend", label: "Выходные", pricePerDay: "1500", minDays: 1 },
      { productId: rentalProducts[3].id, type: "week", label: "Неделя", pricePerDay: "800", minDays: 7 },
      { productId: rentalProducts[3].id, type: "may_holidays", label: "Майские праздники", pricePerDay: "1800", minDays: 3 },
    ];
    const tariffs = await this.db.insert(tariffsTable).values(tariffConfigs as any[]).returning();
    created.tariffs = tariffs.length;

    // ── Branches ──────────────────────────────────────────────────────────────
    const branches = await this.db.insert(branchesTable).values([
      {
        name: "Главный склад",
        slug: "main-warehouse",
        type: "main" as const,
        address: "ул. Речная, 12",
        city: "Москва",
        lat: "55.7558",
        lng: "37.6173",
        phones: ["+7 (495) 123-45-67"],
        emails: ["info@your-domain.ru"],
        workingHours: {
          "пн-пт": "10:00 – 19:00",
          "сб-вс": "09:00 – 20:00",
        },
        description: "Основной пункт выдачи снаряжения. Самовывоз и доставка по Москве.",
        active: true,
        useForPickup: true,
        sortOrder: 1,
      },
      {
        name: "Пункт у реки (Коломенское)",
        slug: "kolomenskoe",
        type: "satellite" as const,
        address: "Парк Коломенское, причал №3",
        city: "Москва",
        lat: "55.6688",
        lng: "37.6686",
        phones: ["+7 (495) 765-43-21"],
        emails: [],
        workingHours: {
          "сб-вс": "09:00 – 18:00",
          "пн-пт": "по договорённости",
        },
        description: "Сезонный пункт выдачи прямо у воды в парке Коломенское. Работает с мая по сентябрь.",
        active: true,
        useForPickup: true,
        sortOrder: 2,
      },
    ]).returning();
    created.branches = branches.length;
    this.logger.log(`[Seed] Created ${branches.length} branches`);

    // ── Tours ─────────────────────────────────────────────────────────────────
    const tours = await this.db.insert(toursTable).values([
      {
        title: "Сплав по реке Ока — 5 дней",
        slug: "splav-oka-5-dnej",
        type: "rafting" as const,
        region: "Калужская область",
        duration: 5,
        difficulty: "medium" as const,
        minParticipants: 4,
        maxParticipants: 16,
        basePrice: "12000",
        depositAmount: "3000",
        description: "<p>Классический маршрут по реке Ока — один из лучших для знакомства с водным туризмом. Живописные берега, чистая вода, стоянки у костра.</p>",
        program: "<p><strong>День 1:</strong> Сбор группы, инструктаж, первый лагерь.<br><strong>День 2-4:</strong> Активный сплав с остановками у исторических мест.<br><strong>День 5:</strong> Финиш, разбор байдарок, возвращение.</p>",
        equipment: "Байдарки, вёсла, спасательные жилеты, палатки, котлы",
        requirements: "Физическая подготовка — базовая. Опыт не требуется.",
        includes: ["Инструктор", "Байдарки и снаряжение", "Страховка", "Питание в походе", "Трансфер к старту"],
        excludes: ["Личные вещи", "Трансфер от финиша", "Дополнительное снаряжение"],
        active: true,
        featured: true,
        sortOrder: 1,
      },
      {
        title: "Однодневный сплав «Знакомство с рекой»",
        slug: "odnodevnyj-splav-znakomstvo",
        type: "rafting" as const,
        region: "Подмосковье",
        duration: 1,
        difficulty: "easy" as const,
        minParticipants: 2,
        maxParticipants: 20,
        basePrice: "3500",
        depositAmount: "1000",
        description: "<p>Однодневный сплав для тех, кто хочет попробовать водный туризм впервые. Спокойная река, красивые берега, никакого экстрима.</p>",
        program: "<p><strong>09:00</strong> — Сбор у пункта выдачи.<br><strong>09:30</strong> — Инструктаж и старт.<br><strong>14:00</strong> — Обед у берега.<br><strong>17:00</strong> — Финиш.</p>",
        equipment: "Байдарки, вёсла, спасательные жилеты",
        requirements: "Нет. Подходит для детей от 7 лет в сопровождении взрослых.",
        includes: ["Инструктор", "Байдарки и снаряжение", "Страховка", "Лёгкий перекус"],
        excludes: ["Трансфер", "Полноценное питание"],
        active: true,
        featured: true,
        sortOrder: 2,
      },
    ]).returning();
    created.tours = tours.length;
    this.logger.log(`[Seed] Created ${tours.length} tours`);

    // ── Tour Dates (future) ───────────────────────────────────────────────────
    const now = new Date();
    const futureDates: any[] = [];

    // Dates for tour 1 (5-day rafting)
    for (let i = 1; i <= 3; i++) {
      const start = new Date(now);
      start.setMonth(start.getMonth() + i);
      start.setDate(1);
      const end = new Date(start);
      end.setDate(end.getDate() + 5);
      futureDates.push({
        tourId: tours[0].id,
        startDate: start,
        endDate: end,
        seatsTotal: 16,
        seatsBooked: Math.floor(Math.random() * 5),
        price: "12000",
        depositAmount: "3000",
        status: "planned" as const,
      });
    }

    // Dates for tour 2 (1-day)
    for (let i = 1; i <= 4; i++) {
      const start = new Date(now);
      start.setDate(start.getDate() + i * 7);
      const end = new Date(start);
      end.setHours(end.getHours() + 10);
      futureDates.push({
        tourId: tours[1].id,
        startDate: start,
        endDate: end,
        seatsTotal: 20,
        seatsBooked: Math.floor(Math.random() * 8),
        price: "3500",
        depositAmount: "1000",
        status: "planned" as const,
      });
    }

    const tourDates = await this.db.insert(tourDatesTable).values(futureDates).returning();
    created.tourDates = tourDates.length;
    this.logger.log(`[Seed] Created ${tourDates.length} tour dates`);

    // ── Tariff Templates ──────────────────────────────────────────────────────
    const tariffTemplates = await this.db.insert(tariffTemplatesTable).values([
      {
        name: "Байдарка стандарт",
        tariffs: [
          { type: "weekday", label: "Будни", pricePerDay: "1500", minDays: 1 },
          { type: "weekend", label: "Выходные", pricePerDay: "2000", minDays: 1 },
          { type: "week", label: "Неделя", pricePerDay: "1200", minDays: 7 },
          { type: "may_holidays", label: "Майские праздники", pricePerDay: "2500", minDays: 3 },
        ],
      },
      {
        name: "Каноэ/Байдарка 3-местная",
        tariffs: [
          { type: "weekday", label: "Будни", pricePerDay: "2000", minDays: 1 },
          { type: "weekend", label: "Выходные", pricePerDay: "2500", minDays: 1 },
          { type: "week", label: "Неделя", pricePerDay: "1700", minDays: 7 },
          { type: "may_holidays", label: "Майские праздники", pricePerDay: "3000", minDays: 3 },
        ],
      },
      {
        name: "SUP-доска",
        tariffs: [
          { type: "weekday", label: "Будни", pricePerDay: "1000", minDays: 1 },
          { type: "weekend", label: "Выходные", pricePerDay: "1500", minDays: 1 },
          { type: "week", label: "Неделя", pricePerDay: "800", minDays: 7 },
          { type: "may_holidays", label: "Майские праздники", pricePerDay: "1800", minDays: 3 },
        ],
      },
    ]).returning();
    created.tariffTemplates = tariffTemplates.length;
    this.logger.log(`[Seed] Created ${tariffTemplates.length} tariff templates`);

    // ── Spec Templates ────────────────────────────────────────────────────────
    const specTemplates = await this.db.insert(specTemplatesTable).values([
      {
        name: "Байдарка / Каноэ",
        specs: [
          { label: "Вместимость", value: "", unit: "чел.", sortOrder: 1 },
          { label: "Грузоподъёмность", value: "", unit: "кг", sortOrder: 2 },
          { label: "Длина", value: "", unit: "см", sortOrder: 3 },
          { label: "Ширина", value: "", unit: "см", sortOrder: 4 },
          { label: "Вес", value: "", unit: "кг", sortOrder: 5 },
          { label: "Материал", value: "", unit: "", sortOrder: 6 },
          { label: "Тип конструкции", value: "", unit: "", sortOrder: 7 },
        ],
      },
      {
        name: "SUP-доска",
        specs: [
          { label: "Длина", value: "", unit: "см", sortOrder: 1 },
          { label: "Ширина", value: "", unit: "см", sortOrder: 2 },
          { label: "Толщина", value: "", unit: "см", sortOrder: 3 },
          { label: "Вес доски", value: "", unit: "кг", sortOrder: 4 },
          { label: "Максимальная нагрузка", value: "", unit: "кг", sortOrder: 5 },
          { label: "Тип", value: "", unit: "", sortOrder: 6 },
        ],
      },
    ]).returning();
    created.specTemplates = specTemplates.length;

    this.logger.log(`[Seed] Demo seed complete: ${JSON.stringify(created)}`);
    return { message: "Demo seed completed successfully", created };
  }
}
