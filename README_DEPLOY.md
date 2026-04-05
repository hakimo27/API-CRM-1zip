# Байдабаза — Production Deployment Guide

## Требования к серверу

| Что | Минимум |
|-----|---------|
| OS | Ubuntu 22.04 / Debian 12 / любой Linux |
| CPU | 2 vCPU |
| RAM | 2 GB (рекомендуется 4 GB) |
| Диск | 20 GB SSD |
| Docker | 24+ с плагином docker compose |
| Порты | 80 и 443 открыты |

### Установка Docker (если нет)
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

---

## Установка (первый запуск)

```bash
# 1. Скопировать проект на сервер
scp -r . user@your-server:/opt/baydabaza
ssh user@your-server
cd /opt/baydabaza

# 2. Создать .env из примера
cp .env.example .env
nano .env          # заполнить обязательные переменные

# 3. Запустить установку
sh deploy/install.sh
```

Скрипт автоматически:
- соберёт Docker-образы
- поднимет PostgreSQL, Redis
- применит миграции БД
- запустит API, сайт, CRM, nginx
- создаст начальные настройки

---

## Что нужно заполнить в .env

**Обязательно:**
```env
POSTGRES_PASSWORD=очень_сильный_пароль
JWT_SECRET=случайная_строка_64_символа
JWT_REFRESH_SECRET=другая_случайная_строка_64
SESSION_SECRET=ещё_одна_строка_32_символа

APP_URL=https://ваш-домен.ru
ADMIN_URL=https://ваш-домен.ru/crm
API_URL=https://ваш-домен.ru/api

ADMIN_EMAIL=admin@ваш-домен.ru
ADMIN_PASSWORD=надёжный_пароль
```

Сгенерировать случайные строки:
```bash
openssl rand -hex 64   # для JWT_SECRET и JWT_REFRESH_SECRET
openssl rand -hex 32   # для SESSION_SECRET
```

---

## Где открывается

| Что | URL |
|-----|-----|
| Сайт | `https://ваш-домен.ru` |
| CRM (панель управления) | `https://ваш-домен.ru/crm` |
| API | `https://ваш-домен.ru/api` |
| Health check | `https://ваш-домен.ru/api/auth/healthz` |

---

## Обновление

После изменений в коде:
```bash
sh deploy/update.sh
```

Скрипт:
1. Делает резервную копию БД
2. Пересобирает образы
3. Применяет новые миграции
4. Перезапускает сервисы

---

## Резервная копия БД

```bash
# Создать бэкап (сохраняется в ./backups/)
sh deploy/backup-db.sh

# Восстановить из бэкапа
sh deploy/restore-db.sh ./backups/backup_20250101_120000.sql.gz
```

---

## Проверка состояния

```bash
# Статус всех сервисов
sh deploy/healthcheck.sh

# Логи конкретного сервиса
docker compose logs -f api
docker compose logs -f nginx

# Статус контейнеров
docker compose ps
```

---

## SSL (HTTPS)

### Вариант 1: Certbot (Let's Encrypt) — рекомендуется

```bash
# Установить certbot
apt install certbot

# Получить сертификат (nginx должен работать на 80)
certbot certonly --webroot -w /var/www/certbot -d ваш-домен.ru

# Скопировать сертификаты
cp /etc/letsencrypt/live/ваш-домен.ru/fullchain.pem docker/ssl/
cp /etc/letsencrypt/live/ваш-домен.ru/privkey.pem docker/ssl/

# В nginx.conf заменить YOUR_DOMAIN на ваш домен
nano docker/nginx.conf

# Перезапустить nginx
docker compose restart nginx
```

### Вариант 2: Cloudflare Proxy

Включить Cloudflare Proxy (оранжевое облако) — SSL будет автоматически.
В nginx.conf можно использовать HTTP-only конфиг.

---

## DNS настройка

Укажите у регистратора домена:
```
A    @           →  IP вашего сервера
A    www         →  IP вашего сервера
```

---

## Telegram бот (опционально)

1. Создать бота через @BotFather
2. Получить токен и вставить в `.env`:
   ```env
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
   ```
3. Установить webhook после деплоя:
   ```bash
   curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
     -d "url=${APP_URL}/api/telegram/webhook&secret_token=${TELEGRAM_WEBHOOK_SECRET}"
   ```

---

## SMTP / Email (опционально)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=app_password    # не обычный пароль, а App Password
SMTP_FROM=noreply@baydabaza.ru
```

---

## Что остаётся сделать руками после установки

| Действие | Где |
|----------|-----|
| Поменять пароль admin | CRM → Профиль |
| Заполнить контакты компании | CRM → Настройки → Общие |
| Загрузить логотип | CRM → Настройки → Брендинг |
| Настроить Telegram бот | CRM → Настройки → Telegram |
| Настроить SMTP | CRM → Настройки → Уведомления |
| Добавить категории | CRM → Каталог → Категории |
| Добавить товары | CRM → Каталог → Товары |
| Настроить SSL | см. раздел SSL выше |

---

## Структура deployment файлов

```
.
├── .env.example              # шаблон переменных
├── docker-compose.yml        # все сервисы
├── Dockerfile.api            # образ для API
├── Dockerfile.web            # образ для публичного сайта
├── Dockerfile.admin          # образ для CRM
├── docker/
│   ├── nginx.conf            # главный nginx (HTTPS + routing)
│   ├── nginx-web.conf        # nginx внутри web контейнера
│   ├── nginx-admin.conf      # nginx внутри admin контейнера
│   └── ssl/                  # место для SSL сертификатов
├── deploy/
│   ├── install.sh            # первый запуск (полная установка)
│   ├── update.sh             # обновление без потери данных
│   ├── healthcheck.sh        # проверка состояния всех сервисов
│   ├── init-db.sh            # инициализация/seed БД
│   ├── backup-db.sh          # резервная копия PostgreSQL
│   └── restore-db.sh         # восстановление из бэкапа
└── backups/                  # папка для бэкапов (создаётся автоматически)
```

---

## Часто задаваемые вопросы

**Как посмотреть логи?**
```bash
docker compose logs -f          # все сервисы
docker compose logs -f api      # только API
docker compose logs --tail=100 nginx
```

**Как перезапустить один сервис?**
```bash
docker compose restart api
docker compose restart nginx
```

**Как зайти в БД?**
```bash
docker compose exec postgres psql -U kayakrent kayakrent
```

**Как полностью сбросить и переустановить?**
```bash
docker compose down -v    # ВНИМАНИЕ: удалит все данные!
sh deploy/install.sh
```
