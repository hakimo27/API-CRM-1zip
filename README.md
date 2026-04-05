# Байдабаза — Production Deployment Guide

Руководство по развёртыванию на собственном VPS/сервере.

---

## Содержание

1. [Архитектура проекта](#1-архитектура-проекта)
2. [Требования к серверу](#2-требования-к-серверу)
3. [Быстрая установка](#3-быстрая-установка)
4. [Переменные окружения](#4-переменные-окружения)
5. [Миграции базы данных](#5-миграции-базы-данных)
6. [Перенос данных (backup/restore)](#6-перенос-данных)
7. [Статические файлы и загрузки](#7-статические-файлы-и-загрузки)
8. [Telegram и Email](#8-telegram-и-email)
9. [Nginx / SSL / Домены](#9-nginx--ssl--домены)
10. [Команды управления](#10-команды-управления)
11. [Troubleshooting](#11-troubleshooting)
12. [Checklist перед запуском](#12-checklist-перед-запуском)

---

## 1. Архитектура проекта

```
/
├── artifacts/
│   ├── api-server/      # NestJS REST API + WebSocket  → :8080/api
│   ├── kayak-rental/    # Публичный сайт (React/Vite)  → /
│   └── admin-crm/       # Панель управления (React/Vite) → /crm
├── lib/
│   ├── db/              # Drizzle ORM схема
│   └── shared/          # Общие утилиты
├── docker/              # Nginx конфиги
├── deploy/              # Скрипты деплоя
├── Dockerfile.api
├── Dockerfile.web
├── Dockerfile.admin
├── docker-compose.yml
└── .env.example
```

### Маршрутизация

| URL | Сервис | Описание |
|-----|--------|----------|
| `domain.ru/` | kayak-rental | Публичный сайт |
| `domain.ru/crm/` | admin-crm | Панель управления |
| `domain.ru/api/` | api-server | REST API (NestJS) |
| `domain.ru/api/` (WS) | api-server | WebSocket (чат) |
| `domain.ru/uploads/` | nginx | Загруженные файлы |

---

## 2. Требования к серверу

### Docker-установка (рекомендуется)

| Компонент | Минимум | Рекомендуется |
|-----------|---------|---------------|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 2 GB | 4 GB |
| Disk | 20 GB SSD | 40 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| Docker | 24+ | latest |

### Ручная установка (без Docker)

| Программа | Версия |
|-----------|--------|
| Node.js | 20.x LTS |
| pnpm | 9.x или 10.x |
| PostgreSQL | 16.x |
| Nginx | 1.24+ |

---

## 3. Быстрая установка

### Шаг 1 — Скопировать проект на сервер

```bash
git clone https://github.com/your-org/baydabaza.git /opt/baydabaza
cd /opt/baydabaza
```

### Шаг 2 — Настроить окружение

```bash
cp .env.example .env
nano .env
```

Обязательно заполнить:

```env
POSTGRES_PASSWORD=очень_сильный_пароль
DATABASE_URL=postgresql://baydabaza:очень_сильный_пароль@postgres:5432/baydabaza

JWT_SECRET=...         # openssl rand -hex 64
JWT_REFRESH_SECRET=... # openssl rand -hex 64
SESSION_SECRET=...     # openssl rand -hex 32

APP_URL=https://ваш-домен.ru
ADMIN_URL=https://ваш-домен.ru/crm
API_URL=https://ваш-домен.ru/api

BOOTSTRAP_SUPERADMIN_CREATE=true
BOOTSTRAP_SUPERADMIN_EMAIL=admin@ваш-домен.ru
BOOTSTRAP_SUPERADMIN_PASSWORD=надёжный_пароль
```

Сгенерировать секреты:
```bash
echo "JWT_SECRET=$(openssl rand -hex 64)"
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 64)"
echo "SESSION_SECRET=$(openssl rand -hex 32)"
```

### Шаг 3 — Запустить установку

```bash
bash deploy/install.sh
```

Всё. Скрипт самостоятельно:
- соберёт образы
- поднимет postgres, redis
- применит миграции
- создаст суперадмина
- посеет начальные настройки
- запустит сайт, CRM, nginx

---

## 4. Переменные окружения

Полный список — в файле `.env.example`. Все переменные задокументированы там.

### Обязательные

| Переменная | Описание |
|-----------|----------|
| `POSTGRES_PASSWORD` | Пароль PostgreSQL |
| `DATABASE_URL` | Строка подключения к БД |
| `JWT_SECRET` | Секрет access-токена (64+ символов) |
| `JWT_REFRESH_SECRET` | Секрет refresh-токена (другой!) |
| `SESSION_SECRET` | Секрет сессии (32+ символов) |
| `APP_URL` | Публичный URL сайта |

### Флаги первой установки

| Переменная | По умолчанию | Описание |
|-----------|-------------|----------|
| `APP_RUN_MIGRATIONS` | `true` | Применить миграции при install |
| `APP_RUN_SEED` | `true` | Посеять начальные настройки |
| `APP_RUN_DEMO_SEED` | `false` | Демо-данные (только для стенда) |

### Создание суперадмина

| Переменная | Описание |
|-----------|----------|
| `BOOTSTRAP_SUPERADMIN_CREATE` | `true` — создать при установке |
| `BOOTSTRAP_SUPERADMIN_EMAIL` | Email суперадмина |
| `BOOTSTRAP_SUPERADMIN_PASSWORD` | Пароль суперадмина |
| `BOOTSTRAP_SUPERADMIN_FIRST_NAME` | Имя |
| `BOOTSTRAP_SUPERADMIN_LAST_NAME` | Фамилия |
| `BOOTSTRAP_SUPERADMIN_PHONE` | Телефон |

Если суперадмин уже существует — шаг пропускается автоматически.

### Что нельзя коммитить в git

- `.env`
- `docker/ssl/*.pem`
- `backups/*.sql.gz`

Файл `.gitignore` уже содержит эти исключения.

---

## 5. Миграции базы данных

Проект использует **Drizzle ORM** с подходом `push`.

```bash
# В Docker (автоматически при install.sh)
docker compose run --rm --no-deps api \
  sh -c "cd /app && pnpm --filter @workspace/db run push"

# Вручную (если нужно)
bash deploy/init-db.sh
```

---

## 6. Перенос данных

### Создать backup

```bash
bash deploy/backup-db.sh
# Файл сохраняется в ./backups/
```

### Восстановить из backup

```bash
bash deploy/restore-db.sh backups/backup_20250101_120000.sql.gz
```

### Перенести загруженные файлы

```bash
# Экспорт из Docker volume
docker run --rm -v baydabaza_uploads_data:/data alpine \
  tar -czf - /data > uploads_backup.tar.gz

# Импорт на новом сервере
cat uploads_backup.tar.gz | docker run --rm -i \
  -v baydabaza_uploads_data:/data alpine tar -xzf - -C /
```

---

## 7. Статические файлы и загрузки

| Тип | Docker | Ручная установка |
|-----|--------|-----------------|
| Загрузки | volume `uploads_data` → `/app/uploads` | `/opt/baydabaza/uploads` |
| Публичный доступ | `https://domain.ru/uploads/` | nginx: `root /opt/baydabaza/uploads` |

---

## 8. Telegram, Email и Push-уведомления

### Telegram

После деплоя установить webhook:

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=${APP_URL}/api/telegram/webhook" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```

Управление настройками: CRM → Настройки → Telegram.

### Email (SMTP)

```env
SMTP_HOST=smtp.gmail.com    # или smtp.mail.ru, smtp.yandex.ru
SMTP_PORT=587               # 465 для SSL, 587 для STARTTLS
SMTP_SECURE=false           # true для порта 465
SMTP_USER=your@gmail.com
SMTP_PASS=app_password      # пароль приложения, не пароль аккаунта
SMTP_FROM=noreply@your-domain.ru
EMAIL_FROM_NAME=Байдабаза
MANAGER_EMAIL=manager@your-domain.ru  # кому приходят уведомления
```

Для Mail.ru создать пароль приложения: `mail.ru → Настройки → Пароли для внешних приложений`.

Управление настройками: CRM → Настройки → Уведомления.

### PWA и Web Push (браузерные уведомления)

Оба сайта — публичный и CRM — работают как PWA и устанавливаются на мобильные устройства и десктоп.

**Что уже встроено:**
- `manifest.webmanifest` с иконками, скриншотами, shortcuts
- Service Worker с офлайн-fallback (`offline.html`) и кэшем ассетов
- Автоматическое обновление SW раз в час
- CRM: кнопка ⬇ установки и кнопка 🔔 push-подписки в шапке
- Push-уведомления: новые заказы, брони, сообщения чата, заявки

**Требования для работы PWA:**
- HTTPS (обязательно — `beforeinstallprompt` и PushManager работают только по HTTPS)
- Для iOS: Safari → «Поделиться» → «На экран Домой»
- Для Android/Desktop Chrome: автоматический prompt после нескольких визитов

**Генерация VAPID-ключей** (один раз, перед деплоем):

```bash
node -e "const wp=require('web-push'); \
const k=wp.generateVAPIDKeys(); \
console.log('VAPID_PUBLIC_KEY='+k.publicKey); \
console.log('VAPID_PRIVATE_KEY='+k.privateKey)"
```

Добавить в `.env`:

```env
VAPID_PUBLIC_KEY=<публичный ключ>
VAPID_PRIVATE_KEY=<приватный ключ>
VAPID_SUBJECT=mailto:admin@your-domain.ru
```

**Важно:** не меняйте VAPID-ключи после первой генерации — все браузерные подписки перестанут работать.

**Проверка PWA после деплоя:**
- Chrome → F12 → Application → Manifest → «Installable» без ошибок
- Chrome → F12 → Application → Service Workers → «Activated and running»
- `curl -I https://домен/manifest.webmanifest` → `Content-Type: application/manifest+json`

### SEO-эндпоинты

| URL | Описание |
|-----|----------|
| `/robots.txt` | Инструкции для поисковиков |
| `/sitemap.xml` | Карта сайта (Яндекс, Google) |
| `/feed.xml` | RSS-лента статей |
| `/feed/yml` | YML-выгрузка товаров (Яндекс.Маркет) |

---

## 9. Nginx / SSL / Домены

### Let's Encrypt (рекомендуется)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.ru -d www.your-domain.ru

# Автообновление
echo "0 3 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### Ручная установка сертификатов

```bash
mkdir -p docker/ssl
cp /etc/letsencrypt/live/your-domain.ru/fullchain.pem docker/ssl/
cp /etc/letsencrypt/live/your-domain.ru/privkey.pem docker/ssl/
```

### WebSocket

Уже настроен в `docker/nginx.conf`:
```nginx
location /api/ {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

---

## 10. Команды управления

### Основные команды

```bash
# Первая установка
bash deploy/install.sh

# Обновление (после изменений в коде)
bash deploy/update.sh

# Резервная копия БД
bash deploy/backup-db.sh

# Восстановление из бэкапа
bash deploy/restore-db.sh backups/backup_DATE.sql.gz

# Проверка состояния
bash deploy/healthcheck.sh
```

### Docker

```bash
# Логи
docker compose logs -f api
docker compose logs -f nginx

# Перезапустить сервис
docker compose restart api

# Статус контейнеров
docker compose ps

# Полная остановка (данные сохраняются)
docker compose down

# Сброс + удаление данных (ОСТОРОЖНО!)
docker compose down -v
```

### Ручная сборка

```bash
# API
pnpm --filter @workspace/api-server run build

# Публичный сайт
BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/kayak-rental run build

# CRM
BASE_PATH=/crm NODE_ENV=production pnpm --filter @workspace/admin-crm run build
```

---

## 11. Troubleshooting

### API не запускается

```bash
docker compose logs api
# Проверить DATABASE_URL, JWT_SECRET в .env
docker compose ps
```

### БД не подключается

```bash
docker compose exec postgres psql -U baydabaza -c "SELECT 1;"
# Проверить POSTGRES_PASSWORD в .env
```

### Frontend не загружается (белый экран)

```bash
# Проверить BASE_PATH при сборке: web = /, admin = /crm
docker compose exec nginx nginx -t
docker compose logs nginx
```

### WebSocket не работает (чат)

Убедиться, что в nginx.conf есть:
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### Переменная окружения не применяется

```bash
# Перезапустить контейнеры после изменения .env
docker compose down && docker compose up -d
```

---

## 12. Checklist перед запуском

### Инфраструктура
- [ ] Сервер с Ubuntu 22.04+ готов
- [ ] Docker и Docker Compose установлены
- [ ] Открыты порты 80 и 443
- [ ] Домен настроен, DNS пропагирован

### Конфигурация
- [ ] `.env` создан из `.env.example`
- [ ] `POSTGRES_PASSWORD` — сильный уникальный пароль
- [ ] `JWT_SECRET` и `JWT_REFRESH_SECRET` — случайные 64+ символа
- [ ] `APP_URL` — указывает на реальный домен
- [ ] `BOOTSTRAP_SUPERADMIN_EMAIL` и `BOOTSTRAP_SUPERADMIN_PASSWORD` заполнены
- [ ] `docker/nginx.conf` — `YOUR_DOMAIN` заменён на реальный домен

### SSL
- [ ] Сертификаты получены (Let's Encrypt или свой CA)
- [ ] Скопированы в `docker/ssl/`

### Установка
- [ ] `bash deploy/install.sh` выполнен без ошибок
- [ ] `curl https://domain.ru/api/auth/healthz` возвращает 200
- [ ] Публичный сайт открывается
- [ ] CRM открывается на `/crm`
- [ ] Вход в CRM работает

### После запуска
- [ ] Пароль суперадмина изменён в CRM → Профиль
- [ ] Контакты компании заполнены в CRM → Настройки → Общие
- [ ] Telegram webhook настроен
- [ ] SMTP настроен и протестирован (POST /api/notifications/test-email)
- [ ] VAPID-ключи сгенерированы и добавлены в `.env`
- [ ] Push-уведомления проверены: CRM → 🔔 → разрешить в браузере
- [ ] SEO-эндпоинты доступны: `/robots.txt`, `/sitemap.xml`
- [ ] Настроен cron для резервных копий БД
- [ ] Настроен cron для обновления SSL-сертификатов
