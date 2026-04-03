# Workspace

## Overview

Full-featured kayak and outdoor equipment rental platform built as a pnpm monorepo with TypeScript. Includes public website with booking flow, admin CRM, REST API, and database.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild
- **Frontend**: React 19 + Vite + Tailwind CSS + shadcn/ui (wouter for routing)

## Project Structure

```
artifacts/
  api-server/       - Express REST API server (port 8080, path /api)
  kayak-rental/     - React frontend (port 26261, path /)
lib/
  db/               - Drizzle ORM schema + database client
  api-spec/         - OpenAPI YAML spec + Orval codegen config
  api-client-react/ - Generated React Query hooks + custom-fetch
  api-zod/          - Generated Zod schemas for API validation
```

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema (lib/db/src/schema/)

Tables:
- `categories` — product categories (slug, name, SEO fields, active, sort_order)
- `products` — kayaks, SUPs, equipment (slug, category_id, short_description, full_description, capacity, construction_type, deposit_amount, total_stock, SEO fields)
- `product_images` — product photos (product_id, url, alt, sort_order)
- `tariffs` — pricing (product_id, type: weekday|weekend|week|may_holidays, price_per_day, min_days)
- `inventory_units` — physical items (product_id, serial_number, status: available|occupied|reserved|maintenance|incomplete|incoming|written_off, condition, warehouse_location)
- `customers` — customer records (name, phone, email, telegram_id)
- `orders` — rental orders (order_number: KR-YYMMDD-XXXX, customer_id, status, start_date, end_date, delivery_type, total_amount, deposit_amount)
- `order_items` — items in an order (order_id, product_id, quantity, price_per_day)
- `order_status_history` — status change log
- `reservations` — inventory unit reservations
- `chat_sessions` — customer chat sessions (session_token)
- `chat_messages` — chat messages (session_id, role: user|operator, content)
- `cheaper_price_reports` — competitor price reports
- `feedback_reports` — customer feedback

## API Routes (all prefixed /api)

Public:
- GET `/api/healthz` — health check
- GET `/api/catalog` — product list with filters (category, capacity, construction_type, featured)
- GET `/api/catalog/:slug` — product detail with images and tariffs
- GET `/api/categories` — category list with product counts
- POST `/api/availability/check` — check product availability for date range
- POST `/api/pricing/calculate` — calculate rental price (handles weekday/weekend/week/may_holidays tariffs)
- POST `/api/orders` — create order
- GET `/api/orders/:orderNumber` — get order status
- POST `/api/chat/session` — create chat session
- GET `/api/chat/:sessionToken/messages` — get chat messages
- POST `/api/chat/:sessionToken/messages` — send message
- POST `/api/forms/cheaper-price` — report cheaper competitor price
- POST `/api/forms/feedback` — submit feedback
- POST `/api/telegram/webhook` — Telegram bot webhook

Admin (prefix /api/admin):
- GET `/api/admin/dashboard` — dashboard stats
- GET `/api/admin/orders` — orders list with filters/pagination
- GET `/api/admin/orders/:id` — order detail
- PATCH `/api/admin/orders/:id/status` — update order status
- PATCH `/api/admin/orders/:id/payment` — record payment
- GET `/api/admin/customers` — customer list
- GET `/api/admin/customers/:id` — customer detail
- GET `/api/admin/inventory` — inventory grouped by product
- PATCH `/api/admin/inventory/:id` — update inventory unit status
- GET `/api/admin/chat` — admin chat sessions
- GET `/api/admin/chat/:id/messages` — session messages
- POST `/api/admin/chat/:id/reply` — reply to customer
- GET `/api/admin/products` — product list for admin
- POST `/api/admin/products` — create product
- PATCH `/api/admin/products/:id` — update product
- GET `/api/admin/reports/overview` — revenue/booking reports

## Frontend Routes (artifacts/kayak-rental/src)

Public site:
- `/` — homepage with hero, featured products, how-to, benefits
- `/catalog` — catalog with category/capacity/type filters, search
- `/catalog/:slug` — product detail with images, tariffs, date picker, availability check, pricing calculator, add to cart
- `/cart` — shopping cart with date selection, price preview per item
- `/checkout` — checkout form (name, phone, email, delivery type, comment)
- `/order-confirm/:orderNumber` — order confirmation page
- `/dostavka`, `/samovyvoz`, `/faq`, `/kontakty` — static info pages

Admin CRM (`/admin`):
- `/admin` — dashboard with stats, recent orders
- `/admin/orders` — orders list with status filters, search
- `/admin/orders/:id` — order detail with status history, payment form
- `/admin/customers` — customer list
- `/admin/customers/:id` — customer detail with order history
- `/admin/inventory` — inventory units grouped by product, status management
- `/admin/products` — products list
- `/admin/chat` — customer chat management
- `/admin/reports` — revenue/booking analytics

## Cart Implementation

- Cart stored in `localStorage` key `kayak_cart`
- Cart state: `{ items: CartItem[], startDate: string|null, endDate: string|null }`
- Dates are shared across all cart items (global date range for rental period)
- When adding to cart from product page, dates are saved to cart state
- `useCart` hook in `src/hooks/useCart.ts` provides: addItem, removeItem, setDates, updateQuantity, clear

## Pricing Logic (services/priceCalculator.ts)

Tariff types:
- `weekday` — Mon–Fri rates
- `weekend` — Sat, Sun, public holidays  
- `week` — 7+ day discount rate (pricePerDay × 7 = total regardless of days)
- `may_holidays` — May 1–10 special rate (treated as weekend pricing)

May 1–10 override: if rental period covers May 1–10 AND a may_holidays tariff exists, it's used (like weekend pricing). Weekend/holiday detection uses Russian public holiday list.

## Seeded Test Data

Categories: Байдарки (3 products), SUP-борды (2 products), Снаряжение (2 products)
Products: Байдарка Таймень-2, Байдарка Вьюн, Каяк надувной Ладья, SUP-борд стандарт 10'6", SUP-борд Race 12'6", Спасательный жилет взрослый, Гермомешок ПВХ 30L
Total inventory: 61 units across all products

## Important Notes

- All UI text is in Russian
- Order number format: `KR-YYMMDD-XXXX` (e.g. KR-260403-1234)
- Schema uses `numeric` type for prices — always `parseFloat()` when returning from API
- `inArray` from drizzle-orm must be used instead of raw SQL `ANY()` for array conditions
- No authentication on admin panel (development — add auth before production)
- Chat widget polls every 5 seconds using `since` last message ID
- Telegram bot webhook at `/api/telegram/webhook` (set TELEGRAM_BOT_TOKEN env var)
