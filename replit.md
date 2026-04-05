# КаякРент — Kayak Rental Platform

## Overview

Full-featured kayak and outdoor equipment rental platform built as a pnpm monorepo with TypeScript. Includes a Russian-language public website with full booking flow, admin CRM panel, NestJS REST API, and PostgreSQL database.

## Architecture

- **Monorepo**: pnpm workspaces
- **API**: NestJS (port 8080, path `/api`) — 19 modules (+ SeedModule)
- **Public site**: React 19 + Vite (path `/`) — kayak-rental artifact
- **Admin CRM**: React 19 + Vite (path `/crm`) — admin-crm artifact
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT tokens stored in localStorage (15-min access, refresh tokens)
- **Routing**: wouter (both frontends)
- **UI**: Tailwind CSS + shadcn/ui components

## Project Structure

```
artifacts/
  api-server/       - NestJS API server (port 8080, /api)
  kayak-rental/     - React public site (/, previewPath /)
  admin-crm/        - React admin CRM (/crm, previewPath /crm)
lib/
  db/               - Drizzle ORM schema + database client (DB_TOKEN = "DRIZZLE_DB")
```

## API Modules (NestJS)

Auth, Users, Branches, Categories, Products, Pricing, Availability, Orders, Inventory, Chat (WebSocket), Telegram, Settings, Tours, Content, Customers, Sales, Notifications, Media (+ Health)

## CRM Navigation Structure

```
Операции: Dashboard | Заказы аренды (/orders) | Заказы продажи (/sale-orders) | Бронирования туров (/tour-bookings) | Чат | Логи
Каталог: Товары аренды (/products) | Товары продажи (/sale-products) | Категории | Инвентарь | Медиафайлы
Туры: Туры | Реки (/content/rivers)
Клиенты: Клиенты | Филиалы
Контент: Статьи | Страницы | FAQ | Отзывы
Система: Пользователи | Настройки
```

- Manual rental order creation: `/orders/new` → `CreateRentalOrderPage.tsx`
- Manual sale order creation: `/sale-orders/new` → `CreateSaleOrderPage.tsx`
- Order extension: `PATCH /api/orders/:id/extend` with amber modal in OrdersPage

## Key API Routes

```
POST /api/auth/login           → { accessToken, refreshToken, user }
POST /api/auth/register        → { accessToken, refreshToken, user }
GET  /api/auth/me              → User
GET  /api/products             → Product[] (query: featured, categorySlug, search, limit)
GET  /api/products/:slug       → ProductDetail (with tariffs)
GET  /api/categories           → Category[]
POST /api/orders               → Order (supports: customerName, phone, email, startDate, endDate, items, deliveryType, deliveryAddress, managerComment, customerComment, totalAmount)
GET  /api/orders/my            → Order[] (auth required)
GET  /api/orders/:number       → Order
PATCH /api/orders/:id/extend   → { endDate } — extend rental period
PATCH /api/orders/:id/status   → (admin)
GET  /api/inventory            → InventoryUnit[]
PATCH /api/inventory/:id       → (admin)
GET  /api/customers            → Customer[] (admin)
GET  /api/users                → User[] (admin)
GET  /api/tours                → Tour[]
GET  /api/tours/bookings       → TourBooking[] (admin)
GET  /api/sales/orders         → SaleOrder[] (admin)
POST /api/sales/orders         → SaleOrder (customerName, phone, items, deliveryType)
GET  /api/availability/product → single product availability check
GET  /api/settings             → Setting[]
PATCH /api/settings/:key       → (admin)
GET  /api/content/reviews/admin → Review[] (all, admin)
GET  /api/content/reviews      → Review[] (approved only)
PATCH /api/content/reviews/:id → Update review
PATCH /api/content/reviews/:id/approve → Approve review
GET  /api/content/pages/admin  → Page[] (all, admin)
GET  /api/content/pages/:slug  → Page (public)
POST /api/content/pages        → Create page (admin)
PATCH /api/content/pages/:id   → Update page (admin)
GET  /api/chat/sessions        → ChatSession[] (admin)
GET  /api/chat/sessions/:id/messages → Message[]
POST /api/chat/sessions/:id/messages → Message
GET  /api/media/files          → MediaFile[] (admin)
GET  /api/media/folders        → string[] (folder names)
POST /api/media/upload         → Upload file (multipart)
DELETE /api/media/files        → Delete file (?path=...)
POST /api/media/folders        → Create folder
DELETE /api/sales/products/:id → Delete sale product
```

## Public Site Routes (/)

- `/` — Homepage: hero, categories, featured products, **tours block**, reviews, CTA
- `/catalog` — Catalog with category tabs, search, product grid
- `/catalog/:slug` — Product detail: images, tariffs, date picker, add to cart
- `/cart` — Cart with items, pricing summary
- `/checkout` — Checkout: contact form, delivery selection, order submission
- `/order/:number` — Order confirmation with status
- `/login` — Login page
- `/register` — Registration page
- `/account` — Profile & order history (auth required)
- `/tours` — Tours and routes listing
- `/info/:slug` — Static info pages (about, contacts, delivery, faq, privacy)

## Admin CRM Routes (/crm)

Sidebar has 8 grouped sections:

**Главное:** Dashboard (stats, charts, recent activity)

**Продажи:** Orders (list + detail), Sale Products (товары из магазина)

**Каталог:** Products (kayaks/equipment), Categories, Branches

**Операции:** Inventory (unit tracking + status)

**Клиенты:** Customers, Tours (3 tabs: tours/dates/bookings)

**Команда:** Users (full CRUD + reset-password + toggle-active)

**Контент:** Articles, Pages, FAQ, Reviews, Templates (email/sms), Media (file manager with upload/preview/delete)

**Система:** Settings, Logs (notifications/telegram/chat/errors)

## Docker Deployment (VPS)

### Files
- `Dockerfile.api` / `Dockerfile.web` / `Dockerfile.admin` — all use `node:20-bookworm-slim` (NOT alpine, due to pnpm musl exclusions)
- `docker-compose.yml` — full stack: postgres, redis, api, web, admin, nginx
- `docker/nginx.conf` — HTTP-only default (starts without SSL certs)
- `docker/nginx-ssl.conf` — HTTPS config (use after `bash deploy/enable-ssl.sh`)
- `docker/nginx-admin.conf` — admin container internal nginx (serves SPA from root)
- `deploy/install.sh` — first-install script: builds → starts → migrates → seeds
- `deploy/enable-ssl.sh` — switches nginx to HTTPS via Let's Encrypt

### Nginx Routing
- `/api/*` → `api:8080` (NestJS, all routes have `/api` global prefix)
- `/crm/` → `admin:80/` — **trailing slash strips the /crm prefix** before admin container sees it
- `= /crm` → `301 /crm/` redirect
- `/` → `web:80`
- `/uploads/` → shared `uploads_data` volume

### Redis Auth
- `REDIS_PASSWORD` is required in `.env.example`
- Docker-compose healthcheck uses `redis-cli --no-auth-warning -a '${REDIS_PASSWORD:-}' ping`
- Both empty and non-empty password work correctly

### API Port Exposure
- API is exposed on `127.0.0.1:8080:8080` (loopback only) for install.sh scripts
- install.sh uses `curl http://127.0.0.1:8080/api/...` from the host (not inside container)
- External traffic reaches API only through nginx

### Migrations
- `drizzle-kit` is in regular `dependencies` in `lib/db/package.json` (not devDependencies)
- This ensures it's available in the production runtime image with `--prod` install
- install.sh runs: `docker compose run --rm --no-deps api bash -c "pnpm --filter @workspace/db run push"`

### Demo Seed
- `POST /api/seed/demo` (requires admin/superadmin auth, guarded by `APP_RUN_DEMO_SEED=true` env)
- Creates: 5 categories, 4 rental products + 3 sale products, 16 tariffs, 2 branches, 2 tours + 7 tour dates, 3 tariff templates, 2 spec templates
- Idempotent: skips if categories already exist
- install.sh calls it automatically when `APP_RUN_DEMO_SEED=true`

### SSL Setup (after first install)
```bash
bash deploy/enable-ssl.sh your-domain.ru
```
Automates: certbot certonly → copy certs to docker/ssl/ → patch nginx-ssl.conf → switch volume → reload nginx → cron renewal

## PWA & Push Notifications

### Service Workers
- `artifacts/admin-crm/public/sw.js` — registered at `/crm/sw.js` with scope `/crm/`
- `artifacts/kayak-rental/public/sw.js` — registered at `/sw.js` with scope `/`
- Both handle push events and show browser notifications even when app is not focused

### VAPID Keys (Web Push)
- Stored as env vars: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- Service: `artifacts/api-server/src/notifications/push-notifications.service.ts`
- DB table: `pushSubscriptionsTable` in `lib/db/src/schema/pushSubscriptions.ts`
- Push endpoints: `GET /api/notifications/push/vapid-key`, `POST /api/notifications/push/subscribe`, `POST /api/notifications/push/unsubscribe`
- Triggered automatically by `BusinessNotificationsService` on all new events

### CRM Bell & Install Buttons (AdminLayout)
- `usePushSubscription` hook: fetches VAPID key, subscribes to push, stores in DB
- `usePwaInstall` hook: listens for `beforeinstallprompt`, exposes install()
- Bell (🔔) icon in header: idle → subscribe; green → already subscribed
- Download icon: visible only when browser supports PWA install

## Mobile Chat UX

### ChatWidget (public site — kayak-rental)
- Full-screen on mobile (`fixed inset-0`) with backdrop overlay; popup on desktop (`sm:w-96`)
- `<textarea>` with auto-resize (via `useAutoResizeTextarea` hook): min-height 46px, max 120px
- `Enter` sends on desktop; `Shift+Enter` or tap Send button on mobile
- iOS safe-area padding: `env(safe-area-inset-bottom)` / `env(safe-area-inset-top)`
- `visualViewport` resize listener to scroll messages when keyboard opens
- Arrow-left back button on mobile header instead of chevron-down
- Send button is 44×44px (touch-friendly)
- Quick reply buttons have proper `py-1.5` touch targets

### CRM ChatPage (admin-crm)
- Mobile-first toggle layout: shows list OR chat (not side-by-side on mobile)
- `selectedSession=null` → full-width session list; `selectedSession` → full-width chat
- ArrowLeft back button in chat header on mobile (`sm:hidden`)
- `<textarea>` with auto-resize: min-height 46px, max 140px
- `Enter` sends on desktop only; tap Send button on mobile
- Height: `h-[calc(100dvh-5.5rem)] sm:h-[calc(100vh-8rem)]` (accounts for header + padding)
- `overscroll-contain` + `-webkit-overflow-scrolling: touch` on messages area
- `visualViewport` resize listener for keyboard handling

## Important Implementation Notes

- **DB injection**: `@Inject(DB_TOKEN)` where `DB_TOKEN = "DRIZZLE_DB"`
- **Build externals**: `@nestjs/microservices`, `@nestjs/websockets/socket-module`, `cache-manager`, `class-transformer/storage`, `multer`
- **All UI text in Russian**
- **Order number format**: `KR-YYMMDD-XXXX`
- **JWT storage**: `access_token` / `refresh_token` in localStorage (public site), `crm_token` (admin)
- **Auth roles**: superadmin, admin, manager, warehouse, instructor, content_manager, customer
- **Cart**: stored in `kayak_cart` localStorage key
- **Prices**: numeric type in DB → always parse with `Number()`
- **Redis**: configured in docker-compose as `redis:7-alpine` (256mb LRU, redis_data volume). Env vars: `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `CACHE_TTL_DEFAULT=300`
- **Media uploads**: local storage at `UPLOADS_DIR` (default: `./uploads`), public via `PUBLIC_UPLOADS_URL`. Max 50MB per file. In docker: `/app/uploads` volume.
- **Static routes before param routes**: NestJS route ordering — always define `GET /resource/admin` BEFORE `GET /resource/:slug` or it will be captured as a slug
- **Tour dates filter**: gte with Date objects causes "Invalid time value" errors — filter JS-side instead
- **Focus bug fix pattern**: Inner form components defined as arrow functions inside parent component functions cause React to re-mount on every state change → losing focus on each keystroke. Fix: move helper components (`F`, `Field`, etc.) to module level, inline form JSX directly inside Modal body instead of `<InnerForm />`.
- **ImageUpload component**: `artifacts/admin-crm/src/components/ImageUpload.tsx` — takes `images: string[]` + `onChange`, uploads via `POST /media/upload?folder=xxx`, supports cover (first = main), reorder (left/right), delete. Used in SaleProductsPage and ProductsPage.
- **Product images API**: `PATCH /products/:id/images` with `{ urls: string[] }` — syncs the `productImagesTable` (full replace). Must be declared BEFORE `PATCH /products/:id` in the controller.
- **Sale product images**: stored as `images: jsonb string[]` in `saleProductsTable` — just PATCH the product with updated images array.
- **Branches extended schema**: `emails` (jsonb string[]), `workingHours` (jsonb `{schedule: string}`), `lat`/`lng` (numeric), `sortOrder` (int), `useForPickup` (bool) — all in DB.
- **Contacts page pickup points**: Branches with `useForPickup: true` are highlighted and grouped first on the public contacts page (`/info/contacts`). Working hours parsed from `{schedule: string}` format.

## Test Credentials

- admin@kayak.ru / Admin123! (super_admin)
- manager@kayak.ru / Manager123! (manager)
- user@kayak.ru / Test123! (client)

## Seeded Data

- 2 branches (Moscow, Serpukhov)
- 5 categories (kayaks, canoes, sup, rafts, equipment)
- 13+ products with 3 tariffs each (standard, extended, week)
- Inventory units per product
