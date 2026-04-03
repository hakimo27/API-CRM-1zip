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

Auth, Users, Branches, Categories, Products, Pricing, Availability, Orders, Inventory, Chat (WebSocket), Telegram, Settings, Tours, Content, Customers, Sales, Notifications, (+ Health)

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
GET  /api/content/reviews      → Review[]
GET  /api/content/pages/:slug  → Page
GET  /api/chat/sessions        → ChatSession[] (admin)
GET  /api/chat/sessions/:id/messages → Message[]
POST /api/chat/sessions/:id/messages → Message
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

- `/crm/login` — CRM login (redirects from any unauthenticated page)
- `/crm` — Dashboard: stats, recent orders, quick links
- `/crm/orders` — Orders list with status filter, search
- `/crm/orders/:id` — Order detail + status management
- `/crm/inventory` — Inventory management with status updates
- `/crm/products` — Product catalog management
- `/crm/customers` — Customer list
- `/crm/tours` — Tours management
- `/crm/chat` — Real-time chat with customers (5s polling)
- `/crm/users` — User management with roles
- `/crm/settings` — System settings editor

## Important Implementation Notes

- **DB injection**: `@Inject(DB_TOKEN)` where `DB_TOKEN = "DRIZZLE_DB"`
- **Build externals**: `@nestjs/microservices`, `@nestjs/websockets/socket-module`, `cache-manager`, `class-transformer/storage`
- **All UI text in Russian**
- **Order number format**: `KR-YYMMDD-XXXX`
- **JWT storage**: `access_token` / `refresh_token` in localStorage (public site), `crm_token` (admin)
- **Auth roles**: super_admin, admin, manager, operator, warehouse, guide, client
- **Cart**: stored in `kayak_cart` localStorage key
- **Prices**: numeric type in DB → always parse with `Number()`

## Test Credentials

- admin@kayak.ru / Admin123! (super_admin)
- manager@kayak.ru / Manager123! (manager)
- user@kayak.ru / Test123! (client)

## Seeded Data

- 2 branches (Moscow, Serpukhov)
- 5 categories (kayaks, canoes, sup, rafts, equipment)
- 13+ products with 3 tariffs each (standard, extended, week)
- Inventory units per product
