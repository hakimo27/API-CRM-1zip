# КаякРент — Kayak Rental Platform

## Overview

Full-featured kayak and outdoor equipment rental platform built as a pnpm monorepo with TypeScript. Includes a Russian-language public website with full booking flow, admin CRM panel, NestJS REST API, and PostgreSQL database.

## Architecture

- **Monorepo**: pnpm workspaces
- **API**: NestJS (port 8080, path `/api`) — 18 modules
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

## Key API Routes

```
POST /api/auth/login           → { accessToken, refreshToken, user }
POST /api/auth/register        → { accessToken, refreshToken, user }
GET  /api/auth/me              → User
GET  /api/products             → Product[] (query: featured, categorySlug, search, limit)
GET  /api/products/:slug       → ProductDetail (with tariffs)
GET  /api/categories           → Category[]
POST /api/orders               → Order
GET  /api/orders/my            → Order[] (auth required)
GET  /api/orders/:number       → Order
PATCH /api/orders/:id/status   → (admin)
GET  /api/inventory            → InventoryUnit[]
PATCH /api/inventory/:id       → (admin)
GET  /api/customers            → Customer[] (admin)
GET  /api/users                → User[] (admin)
GET  /api/tours                → Tour[]
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

- `/` — Homepage: hero, categories, featured products, reviews, CTA
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

## Test Credentials

- admin@kayak.ru / Admin123! (super_admin)
- manager@kayak.ru / Manager123! (manager)
- user@kayak.ru / Test123! (client)

## Seeded Data

- 2 branches (Moscow, Serpukhov)
- 5 categories (kayaks, canoes, sup, rafts, equipment)
- 13+ products with 3 tariffs each (standard, extended, week)
- Inventory units per product
