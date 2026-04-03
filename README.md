# КаякРент — Production Deployment Guide

Полное руководство по развёртыванию на собственном VPS/сервере вне Replit.

---

## Содержание

1. [Архитектура проекта](#1-архитектура-проекта)
2. [Требования к серверу](#2-требования-к-серверу)
3. [Быстрый старт (Docker)](#3-быстрый-старт-docker)
4. [Ручная установка (без Docker)](#4-ручная-установка-без-docker)
5. [Переменные окружения](#5-переменные-окружения)
6. [Миграции базы данных](#6-миграции-базы-данных)
7. [Перенос данных (backup/restore)](#7-перенос-данных)
8. [Статические файлы и загрузки](#8-статические-файлы-и-загрузки)
9. [Telegram и Email](#9-telegram-и-email)
10. [Nginx / SSL / Домены](#10-nginx--ssl--домены)
11. [Команды проекта](#11-команды-проекта)
12. [Troubleshooting](#12-troubleshooting)
13. [Checklist переноса](#13-checklist-переноса)

---

## 1. Архитектура проекта

```
/
├── artifacts/
│   ├── api-server/      # NestJS REST API + WebSocket  → :8080/api
│   ├── kayak-rental/    # Публичный сайт (React/Vite)  → /
│   └── admin-crm/       # Панель управления (React/Vite) → /crm
├── lib/
│   ├── db/              # Drizzle ORM схема + migrations
│   ├── shared/          # Общие утилиты
│   ├── api-zod/         # Zod-схемы API
│   └── api-spec/        # API спецификация
├── docker/              # Nginx конфиги для Docker
├── deploy/              # Скрипты деплоя, backup, restore
├── Dockerfile.api       # Docker образ для API
├── Dockerfile.web       # Docker образ для публичного сайта
├── Dockerfile.admin     # Docker образ для CRM
├── docker-compose.yml   # Оркестрация всех сервисов
└── .env.example         # Шаблон переменных окружения
```

### Маршрутизация

| URL | Сервис | Описание |
|-----|--------|----------|
| `domain.com/` | kayak-rental | Публичный сайт |
| `domain.com/catalog` | kayak-rental | Каталог аренды |
| `domain.com/crm/` | admin-crm | Панель управления |
| `domain.com/api/` | api-server | REST API (NestJS) |
| `domain.com/api/` (WS) | api-server | WebSocket (чат) |
| `domain.com/uploads/` | nginx static | Загруженные файлы |

---

## 2. Требования к серверу

### Минимальные требования

| Компонент | Минимум | Рекомендуется |
|-----------|---------|---------------|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB | 2 GB |
| Disk | 20 GB SSD | 40 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

### Программные требования (ручная установка)

| Программа | Версия |
|-----------|--------|
| Node.js | 20.x LTS |
| pnpm | 9.x или 10.x |
| PostgreSQL | 16.x |
| Nginx | 1.24+ |

### Программные требования (Docker)

| Программа | Версия |
|-----------|--------|
| Docker | 24+ |
| Docker Compose | v2.20+ |

---

## 3. Быстрый старт (Docker)

### Шаг 1 — Клонировать / распаковать проект

```bash
# Если проект в git:
git clone https://github.com/your-org/kayakrent.git
cd kayakrent

# Или распаковать архив:
tar -xzf kayakrent.tar.gz
cd kayakrent
```

### Шаг 2 — Настроить переменные окружения

```bash
cp .env.example .env
nano .env
```

Обязательно заполнить:
- `POSTGRES_PASSWORD` — пароль БД (придумать сильный)
- `DATABASE_URL` — строка подключения (использовать тот же пароль)
- `JWT_SECRET` и `JWT_REFRESH_SECRET` — случайные строки 64+ символов
- `SESSION_SECRET` — случайная строка 32+ символов
- `APP_URL` — ваш домен

Генерация секретов:
```bash
openssl rand -hex 64   # для JWT_SECRET
openssl rand -hex 64   # для JWT_REFRESH_SECRET
openssl rand -hex 32   # для SESSION_SECRET
```

### Шаг 3 — Настроить Nginx конфиг

```bash
# Заменить YOUR_DOMAIN на ваш домен
sed -i 's/YOUR_DOMAIN/kayakrent.ru/g' docker/nginx.conf
```

### Шаг 4 — SSL сертификаты

```bash
mkdir -p docker/ssl

# Вариант A: Let's Encrypt через certbot
certbot certonly --standalone -d kayakrent.ru -d www.kayakrent.ru
cp /etc/letsencrypt/live/kayakrent.ru/fullchain.pem docker/ssl/
cp /etc/letsencrypt/live/kayakrent.ru/privkey.pem docker/ssl/

# Вариант B: самоподписанный (только для теста)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/ssl/privkey.pem \
  -out docker/ssl/fullchain.pem \
  -subj "/CN=localhost"
```

### Шаг 5 — Запустить сервисы

```bash
# Собрать и запустить
docker compose up -d --build

# Проверить статус
docker compose ps
docker compose logs -f api
```

### Шаг 6 — Инициализировать базу данных

```bash
# Применить схему и посеять дефолтные настройки
docker compose exec api sh -c "
  cd /app && pnpm --filter @workspace/db run push
"

# Или через скрипт (после запуска API)
./deploy/init-db.sh
```

### Шаг 7 — Проверить

```bash
curl https://kayakrent.ru/api/auth/healthz
# Ожидаемый ответ: {"status":"ok"}
```

---

## 4. Ручная установка (без Docker)

### Установка зависимостей (Ubuntu 22.04)

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# pnpm
npm install -g pnpm@latest

# PostgreSQL 16
sudo apt install -y postgresql-16 postgresql-client-16

# Nginx
sudo apt install -y nginx
```

### Настройка PostgreSQL

```bash
sudo -u postgres psql <<EOF
CREATE USER kayakrent WITH PASSWORD 'your_strong_password';
CREATE DATABASE kayakrent OWNER kayakrent;
GRANT ALL PRIVILEGES ON DATABASE kayakrent TO kayakrent;
EOF
```

### Установка зависимостей проекта

```bash
cd /opt/kayakrent
pnpm install --frozen-lockfile
```

### Применить схему БД

```bash
export DATABASE_URL="postgresql://kayakrent:your_password@localhost:5432/kayakrent"
pnpm --filter @workspace/db run push
```

### Сборка проектов

```bash
# API
pnpm --filter @workspace/api-server run build

# Публичный сайт
BASE_PATH=/ pnpm --filter @workspace/kayak-rental run build

# Admin CRM
BASE_PATH=/crm pnpm --filter @workspace/admin-crm run build
```

### Запуск API через PM2

```bash
npm install -g pm2

pm2 start /opt/kayakrent/artifacts/api-server/dist/main.mjs \
  --name kayakrent-api \
  --node-args="--enable-source-maps" \
  --env production

pm2 save
pm2 startup
```

### Nginx конфиг (ручная установка)

```bash
sudo cp docker/nginx.conf /etc/nginx/sites-available/kayakrent
sudo ln -s /etc/nginx/sites-available/kayakrent /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Для статических файлов замените `proxy_pass http://web_backend` и `proxy_pass http://admin_backend` на `root` директивы:

```nginx
location / {
    root /opt/kayakrent/artifacts/kayak-rental/dist/public;
    try_files $uri $uri/ /index.html;
}

location /crm {
    root /opt/kayakrent/artifacts/admin-crm/dist/public;
    try_files $uri $uri/ /index.html;
}
```

---

## 5. Переменные окружения

Полный список в файле `.env.example`. Ниже — сводная таблица.

### Обязательные

| Переменная | Описание |
|-----------|----------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Секрет для access token (64+ символов) |
| `JWT_REFRESH_SECRET` | Секрет для refresh token (другой!) |
| `SESSION_SECRET` | Секрет сессии |
| `APP_URL` | Публичный URL сайта |

### Опциональные (но нужны для функций)

| Переменная | Функция |
|-----------|---------|
| `TELEGRAM_BOT_TOKEN` | Telegram уведомления и чат |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Email уведомления |
| `S3_ENDPOINT` + `S3_BUCKET` | Хранение файлов в S3 |

### Только для Docker

| Переменная | Описание |
|-----------|----------|
| `POSTGRES_DB` | Имя базы данных |
| `POSTGRES_USER` | Пользователь PostgreSQL |
| `POSTGRES_PASSWORD` | Пароль PostgreSQL |

### Что нельзя коммитить в git

Никогда не добавляйте в репозиторий:
- `.env`
- `docker/ssl/*.pem`
- `backups/*.sql.gz`

Файл `.gitignore` уже содержит исключения для этих путей.

---

## 6. Миграции базы данных

Проект использует **Drizzle ORM** с подходом `push` (синхронизация схемы без миграционных файлов).

### Применить схему (первый запуск или обновление)

```bash
export DATABASE_URL="postgresql://kayakrent:password@localhost:5432/kayakrent"

# Применить схему
pnpm --filter @workspace/db run push

# Принудительно (если есть конфликты данных)
pnpm --filter @workspace/db run push-force
```

### В Docker

```bash
docker compose exec api sh -c "
  cd /app && DATABASE_URL=\$DATABASE_URL pnpm --filter @workspace/db run push
"
```

### Посеять дефолтные настройки

После первой установки войдите в CRM как admin и нажмите кнопку "Инициализировать настройки", или вызовите API:

```bash
# Получить токен
TOKEN=$(curl -s -X POST https://kayakrent.ru/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kayak.ru","password":"Admin123!"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# Посеять настройки
curl -X POST https://kayakrent.ru/api/settings/init \
  -H "Authorization: Bearer $TOKEN"
```

> ⚠️ После первого входа обязательно смените пароль admin!

### Демо-аккаунты (удалить в production!)

| Email | Пароль | Роль |
|-------|--------|------|
| admin@kayak.ru | Admin123! | superadmin |
| manager@kayak.ru | Manager123! | manager |
| user@kayak.ru | Test123! | customer |

---

## 7. Перенос данных

### Создать backup на Replit (или текущем сервере)

```bash
# Дамп в SQL файл
./deploy/backup-db.sh

# Или напрямую
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
gzip backup_*.sql
```

### Перенести на новый сервер

```bash
# Скопировать файл
scp backups/backup_*.sql.gz user@newserver:/opt/kayakrent/backups/

# Восстановить
./deploy/restore-db.sh backups/backup_*.sql.gz
```

### Восстановить вручную

```bash
gunzip -c backup.sql.gz | psql $DATABASE_URL
```

### После восстановления

```bash
# Убедиться, что схема актуальна
pnpm --filter @workspace/db run push

# Проверить количество записей
psql $DATABASE_URL -c "
SELECT
  (SELECT count(*) FROM users) AS users,
  (SELECT count(*) FROM products) AS products,
  (SELECT count(*) FROM orders) AS orders,
  (SELECT count(*) FROM settings) AS settings;
"
```

---

## 8. Статические файлы и загрузки

### Где хранятся файлы

| Тип | Расположение (Docker) | Расположение (manual) |
|-----|-----------------------|----------------------|
| Загрузки | Docker volume `uploads_data` → `/app/uploads` | `/opt/kayakrent/uploads` |
| Публичный доступ | `https://domain.com/uploads/` | nginx: `root /opt/kayakrent/uploads` |

### Перенести загруженные файлы

```bash
# Из Docker volume
docker run --rm -v kayakrent_uploads_data:/data alpine tar -czf - /data \
  > uploads_backup.tar.gz

# Восстановить на новом сервере
cat uploads_backup.tar.gz | docker run --rm -i \
  -v kayakrent_uploads_data:/data alpine tar -xzf - -C /

# Без Docker: rsync
rsync -avz /opt/kayakrent/uploads/ user@newserver:/opt/kayakrent/uploads/
```

### Монтирование volume (docker-compose.yml)

Volumes уже настроены в `docker-compose.yml`:
```yaml
volumes:
  - uploads_data:/app/uploads       # в api контейнере
  - uploads_data:/var/www/uploads:ro # в nginx контейнере (read-only)
```

---

## 9. Telegram и Email

### Telegram — что перенастроить

После смены домена:

1. **Webhook URL** — обновить в настройках CRM (`/crm/settings` → вкладка Telegram) или через API:

```bash
curl -X POST "https://api.telegram.org/bot{TOKEN}/setWebhook" \
  -d "url=https://kayakrent.ru/api/telegram/webhook" \
  -d "secret_token=YOUR_WEBHOOK_SECRET"
```

2. **Bot Token** — из `@BotFather`, прописать в `.env` и в CRM Settings
3. **Group/Topic IDs** — прописать в CRM Settings → Telegram

### Email — что настроить

В CRM Settings → Уведомления укажите SMTP-данные или пропишите в `.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password    # App Password для Gmail
SMTP_FROM=noreply@kayakrent.ru
```

---

## 10. Nginx / SSL / Домены

### Структура доменов

```
kayakrent.ru        → публичный сайт (/)
kayakrent.ru/crm    → панель управления
kayakrent.ru/api    → REST API + WebSocket
kayakrent.ru/uploads → статические файлы
```

### Let's Encrypt (рекомендуется)

```bash
# Установить certbot
sudo apt install -y certbot python3-certbot-nginx

# Получить сертификат
sudo certbot --nginx -d kayakrent.ru -d www.kayakrent.ru

# Автообновление (cron)
echo "0 3 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### WebSocket поддержка

Уже настроена в `docker/nginx.conf`:
```nginx
location /api/ {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### Несколько субдоменов (опционально)

Если нужны отдельные субдомены:
```nginx
# app.kayakrent.ru → публичный сайт
server {
    server_name app.kayakrent.ru;
    location / { proxy_pass http://web_backend; }
}

# admin.kayakrent.ru → CRM
server {
    server_name admin.kayakrent.ru;
    location / { proxy_pass http://admin_backend; }
}
```

---

## 11. Команды проекта

### Разработка (на Replit или локально)

```bash
# Установка зависимостей
pnpm install

# Запуск API в dev режиме
pnpm --filter @workspace/api-server run dev

# Запуск публичного сайта
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/kayak-rental run dev

# Запуск CRM
PORT=3001 BASE_PATH=/crm pnpm --filter @workspace/admin-crm run dev

# БД: применить схему
DATABASE_URL=... pnpm --filter @workspace/db run push
```

### Production сборка

```bash
# API
pnpm --filter @workspace/api-server run build

# Публичный сайт
BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/kayak-rental run build

# CRM
BASE_PATH=/crm NODE_ENV=production pnpm --filter @workspace/admin-crm run build
```

### Docker

```bash
# Собрать и запустить все
docker compose up -d --build

# Пересобрать только API (после изменений в коде)
docker compose up -d --build api

# Посмотреть логи
docker compose logs -f api
docker compose logs -f nginx

# Остановить
docker compose down

# Остановить и удалить volumes (ОСТОРОЖНО: потеря данных!)
docker compose down -v
```

### База данных

```bash
# Применить схему
pnpm --filter @workspace/db run push

# Backup
./deploy/backup-db.sh

# Restore
./deploy/restore-db.sh backups/backup_20250101.sql.gz
```

---

## 12. Troubleshooting

### API не запускается

```bash
docker compose logs api
# Проверить DATABASE_URL, JWT_SECRET
# Убедиться, что postgres запустился и healthy
docker compose ps
```

### БД не подключается

```bash
# Проверить, что postgres запущен
docker compose exec postgres psql -U kayakrent -c "SELECT 1;"

# Проверить DATABASE_URL
echo $DATABASE_URL
```

### Telegram webhook не работает

```bash
# Проверить, что webhook установлен
curl "https://api.telegram.org/bot{TOKEN}/getWebhookInfo"

# Должен быть ваш домен. Если нет — переустановить:
curl -X POST "https://api.telegram.org/bot{TOKEN}/setWebhook" \
  -d "url=https://kayakrent.ru/api/telegram/webhook"
```

Webhook должен быть доступен публично — убедитесь, что порт 443 открыт.

### Build errors: `@replit/*` plugins not found

Это нормально при сборке вне Replit. Плагины загружаются только если установлена переменная `REPL_ID`. На вашем сервере её не будет, плагины не загрузятся.

```bash
# Если ошибка всё равно есть — удалить replit пакеты из node_modules
pnpm remove @replit/vite-plugin-runtime-error-modal \
            @replit/vite-plugin-cartographer \
            @replit/vite-plugin-dev-banner
```

### Frontend не загружается (белый экран)

```bash
# Проверить BASE_PATH при сборке
# Для web: BASE_PATH=/
# Для admin: BASE_PATH=/crm

# Проверить nginx конфиг
docker compose exec nginx nginx -t
```

### WebSocket не работает (чат)

Убедитесь, что в nginx есть:
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### ENV переменная не применяется

```bash
# Перезапустить контейнеры после изменения .env
docker compose down && docker compose up -d
```

---

## 13. Checklist переноса

Используйте этот список перед запуском в production:

### Инфраструктура
- [ ] Сервер с Ubuntu 22.04+ создан
- [ ] Docker и Docker Compose установлены
- [ ] Открыты порты: 80, 443
- [ ] Домен настроен и DNS пропагирован

### Конфигурация
- [ ] `.env` создан на основе `.env.example`
- [ ] `POSTGRES_PASSWORD` — сильный уникальный пароль
- [ ] `JWT_SECRET` и `JWT_REFRESH_SECRET` — случайные 64+ символа
- [ ] `APP_URL` — указывает на ваш домен
- [ ] `docker/nginx.conf` — `YOUR_DOMAIN` заменён на реальный домен

### SSL
- [ ] SSL сертификаты получены (Let's Encrypt или ваш CA)
- [ ] Сертификаты скопированы в `docker/ssl/`

### База данных
- [ ] `docker compose up -d postgres` запущен
- [ ] `pnpm --filter @workspace/db run push` — схема применена
- [ ] Демо-данные посеяны (`/api/settings/init`)
- [ ] Данные с Replit перенесены (если нужно)

### Приложение
- [ ] `docker compose up -d --build` выполнен успешно
- [ ] `curl https://domain.com/api/auth/healthz` возвращает 200
- [ ] Публичный сайт открывается
- [ ] CRM открывается на `/crm`
- [ ] Вход в CRM работает
- [ ] Настройки загружаются

### После запуска
- [ ] Пароль admin@kayak.ru изменён
- [ ] Telegram webhook настроен на новый домен
- [ ] SMTP настроен и протестирован
- [ ] Настроен cron для backup БД
- [ ] Настроен cron для обновления SSL сертификатов

---

## Вещи, завязанные на Replit (что было исправлено)

| Что | Статус | Как исправлено |
|-----|--------|----------------|
| `@replit/vite-plugin-runtime-error-modal` | ✅ Исправлено | Загружается только при `REPL_ID !== undefined` |
| `@replit/vite-plugin-cartographer` | ✅ Уже было условным | Проверка `REPL_ID` была в исходном коде |
| `PORT` — обязательный env | ✅ Исправлено | Теперь дефолт 3000/3001 если не задан |
| `BASE_PATH` — обязательный env | ✅ Исправлено | Дефолт `/` и `/crm` |
| `DATABASE_URL` | ✅ Стандартно | Читается из env, работает везде |
| `.replit` | ℹ️ Оставлен | Не влияет на работу вне Replit |
| `SESSION_SECRET` как Replit Secret | ✅ Задокументировано | Прописать в `.env` |

---

*Проект: КаякРент | Stack: NestJS + React + Vite + Drizzle ORM + PostgreSQL*
