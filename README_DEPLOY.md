# Байдабаза — Руководство по развёртыванию

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

## Установка одной командой

```bash
# 1. Скопировать проект на сервер
scp -r . user@your-server:/opt/baydabaza
ssh user@your-server
cd /opt/baydabaza

# 2. Настроить окружение
cp .env.example .env
nano .env          # заполнить обязательные переменные (см. ниже)

# 3. Запустить автоустановщик
bash deploy/install.sh
```

Скрипт автоматически:
- проверит Docker и переменные окружения
- соберёт Docker-образы
- поднимет PostgreSQL и Redis
- применит миграции БД
- запустит API, проверит его готовность
- создаст суперадмина (если `BOOTSTRAP_SUPERADMIN_CREATE=true`)
- посеет начальные настройки (если `APP_RUN_SEED=true`)
- запустит сайт, CRM и nginx
- покажет финальный статус всех сервисов

---

## Что заполнить в .env

### Обязательные переменные

```env
# База данных
POSTGRES_PASSWORD=очень_сильный_пароль
DATABASE_URL=postgresql://baydabaza:очень_сильный_пароль@postgres:5432/baydabaza

# JWT — сгенерировать: openssl rand -hex 64
JWT_SECRET=случайная_строка_64_символа
JWT_REFRESH_SECRET=другая_случайная_строка_64_символа
# Сгенерировать: openssl rand -hex 32
SESSION_SECRET=строка_32_символа

# Домен
APP_URL=https://ваш-домен.ru
ADMIN_URL=https://ваш-домен.ru/crm
API_URL=https://ваш-домен.ru/api
```

Сгенерировать секреты одной командой:
```bash
echo "JWT_SECRET=$(openssl rand -hex 64)"
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 64)"
echo "SESSION_SECRET=$(openssl rand -hex 32)"
```

### Флаги первой установки

```env
APP_RUN_MIGRATIONS=true      # применить миграции БД
APP_RUN_SEED=true            # посеять начальные настройки
APP_RUN_DEMO_SEED=false      # демо-данные (только для стенда)
```

### Создание суперадмина

```env
BOOTSTRAP_SUPERADMIN_CREATE=true
BOOTSTRAP_SUPERADMIN_EMAIL=admin@ваш-домен.ru
BOOTSTRAP_SUPERADMIN_PASSWORD=надёжный_пароль
BOOTSTRAP_SUPERADMIN_FIRST_NAME=Администратор
BOOTSTRAP_SUPERADMIN_LAST_NAME=
BOOTSTRAP_SUPERADMIN_PHONE=
```

Если суперадмин уже создан — шаг автоматически пропускается.  
После успешной установки рекомендуется установить `BOOTSTRAP_SUPERADMIN_CREATE=false`.

---

## Куда открывается

| Что | URL |
|-----|-----|
| Публичный сайт | `https://ваш-домен.ru` |
| Панель управления (CRM) | `https://ваш-домен.ru/crm` |
| REST API | `https://ваш-домен.ru/api` |
| Health check | `https://ваш-домен.ru/api/auth/healthz` |

---

## Обновление

```bash
bash deploy/update.sh
```

Скрипт:
1. Создаёт резервную копию БД
2. Пересобирает образы
3. Применяет новые миграции
4. Перезапускает сервисы без потери данных

---

## Резервные копии БД

```bash
# Создать бэкап (сохраняется в ./backups/)
bash deploy/backup-db.sh

# Восстановить из бэкапа
bash deploy/restore-db.sh ./backups/backup_20250101_120000.sql.gz
```

---

## Проверка состояния

```bash
# Статус всех сервисов
bash deploy/healthcheck.sh

# Логи сервиса
docker compose logs -f api
docker compose logs -f nginx

# Статус контейнеров
docker compose ps
```

---

## SSL (HTTPS)

### Вариант 1: Let's Encrypt — рекомендуется

```bash
# Установить certbot
apt install certbot

# Получить сертификат (nginx должен работать на порту 80)
certbot certonly --webroot -w /var/www/certbot -d ваш-домен.ru

# Скопировать сертификаты
cp /etc/letsencrypt/live/ваш-домен.ru/fullchain.pem docker/ssl/
cp /etc/letsencrypt/live/ваш-домен.ru/privkey.pem docker/ssl/

# Заменить YOUR_DOMAIN в nginx.conf на реальный домен
nano docker/nginx.conf

# Перезапустить nginx
docker compose restart nginx
```

### Вариант 2: Cloudflare Proxy

Включить Cloudflare Proxy (оранжевое облако) — SSL будет автоматически.

---

## DNS

```
A    @    →  IP вашего сервера
A    www  →  IP вашего сервера
```

---

## Telegram-бот (опционально)

1. Создать бота через @BotFather
2. Вписать токен в `.env`:
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
SMTP_PASS=app_password
SMTP_FROM=noreply@ваш-домен.ru
EMAIL_FROM_NAME=Байдабаза
MANAGER_EMAIL=manager@ваш-домен.ru
```

Mail.ru — использовать пароль для внешних приложений (не пароль аккаунта):  
`mail.ru → Настройки → Пароли для внешних приложений`

---

## PWA и Push-уведомления

Оба сайта — публичный и CRM — встроены как PWA (Progressive Web App).  
**Требование:** HTTPS. Без SSL install-prompt и push-уведомления не работают.

### Что входит в PWA

| Файл | Публичный сайт | CRM |
|------|---------------|-----|
| `manifest.webmanifest` | `/manifest.webmanifest` | `/crm/manifest.webmanifest` |
| Service Worker | `/sw.js` (scope `/`) | `/crm/sw.js` (scope `/crm/`) |
| Офлайн-страница | `/offline.html` | `/crm/offline.html` |
| Иконки | `/icons/icon-{192,512}.png` | `/crm/icons/icon-{192,512}.png` |
| Скриншоты | `/screenshots/{mobile,desktop}.png` | `/crm/screenshots/{mobile,desktop}.png` |

### Как браузер предлагает установку

1. Сайт открыт по HTTPS  
2. Manifest загружен с корректным MIME-типом (`application/manifest+json`)  
3. Service Worker зарегистрирован и обрабатывает `fetch`  
4. Иконки 192×192 и 512×512 доступны  

→ Chrome показывает mini-infobar «Добавить на главный экран».  
→ На Android — полный диалог установки (со скриншотами, добавленными в manifest).  
→ На iOS — установка через Safari → «Поделиться» → «На экран Домой».

**Кнопка установки в CRM:** кнопка ⬇ в шапке появляется автоматически, когда браузер сигнализирует о доступности install.

### Генерация VAPID-ключей (один раз!)

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
VAPID_SUBJECT=mailto:admin@ваш-домен.ru
```

**Важно:** после первой генерации не меняйте ключи — все существующие подписки браузеров перестанут работать.

### Подключение push-уведомлений в CRM

1. Открыть CRM на `https://ваш-домен.ru/crm`
2. Нажать иконку 🔔 в шапке (зелёная — уже подключено, серая — нажать для подключения)
3. Разрешить уведомления в браузере
4. Менеджеры будут получать push при: новых заказах, бронях, сообщениях чата, новых заявках

### Проверка PWA после деплоя

```bash
# 1. Manifest доступен
curl -I https://ваш-домен.ru/manifest.webmanifest
# Ожидаемо: Content-Type: application/manifest+json

# 2. Service Worker доступен
curl -I https://ваш-домен.ru/sw.js
# Ожидаемо: Cache-Control: no-cache

# 3. CRM manifest
curl -I https://ваш-домен.ru/crm/manifest.webmanifest

# 4. VAPID endpoint
curl https://ваш-домен.ru/api/notifications/push/vapid-key
# Ожидаемо: {"publicKey":"BP01..."}
```

В Chrome DevTools: **Application → Manifest** — должно быть «Installable» без ошибок.  
В Chrome DevTools: **Application → Service Workers** — должен быть «Activated and running».

### SEO-эндпоинты

| URL | Назначение |
|-----|-----------|
| `/robots.txt` | Инструкции для поисковых роботов |
| `/sitemap.xml` | Карта сайта (Яндекс, Google) |
| `/feed.xml` | RSS-лента статей |
| `/feed/yml` | YML-выгрузка товаров (Яндекс.Маркет) |

---

## Что сделать после установки

| Действие | Где |
|----------|-----|
| Поменять пароль admin | CRM → Профиль |
| Заполнить контакты компании | CRM → Настройки → Общие |
| Загрузить логотип | CRM → Настройки → Брендинг |
| Настроить Telegram-бот | CRM → Настройки → Telegram |
| Настроить SMTP | CRM → Настройки → Уведомления |
| Сгенерировать VAPID-ключи | `node -e ...` (см. раздел PWA выше) |
| Включить push-уведомления | CRM → 🔔 в шапке → разрешить в браузере |
| Добавить категории | CRM → Каталог → Категории |
| Добавить товары | CRM → Каталог → Товары |
| Настроить SSL | см. раздел SSL выше |

---

## Структура deployment-файлов

```
.
├── .env.example              # шаблон переменных окружения
├── docker-compose.yml        # все сервисы
├── Dockerfile.api            # образ для API
├── Dockerfile.web            # образ для публичного сайта
├── Dockerfile.admin          # образ для CRM
├── docker/
│   ├── nginx.conf            # nginx (HTTPS + роутинг)
│   └── ssl/                  # SSL-сертификаты
├── deploy/
│   ├── install.sh            # ← главная команда установки
│   ├── update.sh             # обновление без потери данных
│   ├── backup-db.sh          # резервная копия PostgreSQL
│   ├── restore-db.sh         # восстановление из бэкапа
│   ├── healthcheck.sh        # проверка состояния сервисов
│   └── init-db.sh            # ручная инициализация БД
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
docker compose exec postgres psql -U baydabaza baydabaza
```

**Как полностью сбросить и переустановить?**
```bash
docker compose down -v    # ВНИМАНИЕ: удалит все данные!
bash deploy/install.sh
```

**API не запускается?**
```bash
docker compose logs api
# Проверить DATABASE_URL, JWT_SECRET в .env
docker compose ps
```
