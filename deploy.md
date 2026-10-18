# Деплой Fragrances & Co на Linux VPS через SSH

Инструкция рассчитана на **чистый VPS с Ubuntu Server 24.04 LTS**, systemd и прямым доступом к серверу по SSH. Локальная машина в примерах — Windows / PowerShell. Команды внутри SSH-сессии выполняются в Bash.

Используется текущий стек проекта: React / Vite, Express, Prisma 6 и SQLite. Nginx принимает HTTPS-запросы и передаёт их Express. Express раздаёт одновременно API, клиентскую сборку и изображения. Vite dev server в production не запускается.

Инструкция подготовлена по коду проекта и документации компонентов. На вашем VPS команды ещё не выполнялись.

Выполняйте команды по порядку и проверяйте результат: при ошибке остановитесь, исправьте её и только затем продолжайте. Значения `REPLACE_WITH_...` в командах восстановления обязательно заменяйте существующими путями.

## 1. Что заменить перед началом

| Значение в примерах | На что заменить |
| --- | --- |
| `203.0.113.10` | Публичный IPv4 вашего VPS |
| `example.com` | Ваш домен без `https://` и без завершающего `/` |
| `deploy` | SSH-пользователь с sudo; можно оставить это имя |
| `admin@example.com` | Email, который будете вводить при входе в админку |
| `fragrances-vps` | Имя локального SSH-ключа |

`203.0.113.10` и `example.com` — примеры, а не реальные параметры этого сервиса. Телефон `+998 93 385 48 88` и Telegram `@Otdushkiuz` уже соответствуют данным компании.

Нужны доступ к DNS домена, IP сервера и первоначальный SSH-доступ от хостинга. Перед настройкой посмотрите свободную память и диск: установка зависимостей и сборка Vite выполняются на VPS, а каждая сохранённая версия занимает дополнительное место.

Схема размещения:

```text
Интернет → Nginx :443 → Express 127.0.0.1:3001

/srv/fragrances/releases/<версия>/     код, node_modules, client/dist
/srv/fragrances/current               ссылка на запущенную версию
/etc/fragrances/fragrances.env         production-настройки
/var/lib/fragrances/production.db      постоянная SQLite
/var/lib/fragrances/uploads/           постоянные изображения из админки
/var/backups/fragrances/               резервные копии
```

В каждой версии `.env` ссылается на общий файл настроек, а `images/uploads` — на общий каталог изображений. Поэтому переключение версии кода сохраняет данные. Сервис работает **в одном процессе Node.js**; кластеризацию и несколько экземпляров с этой SQLite-схемой не включайте.

## 2. Настройте DNS

В панели домена создайте A-запись для `example.com`, указывающую на IP VPS. Если публикуете AAAA-запись, IPv6 также должен вести на этот сервер и принимать HTTP/HTTPS.

Пока используйте один основной домен. `www.example.com` можно добавить позже, выпустив сертификат для обоих имён и настроив перенаправление на основной домен. Не добавляйте `www` в команду выпуска сертификата, если для него ещё нет DNS-записи.

Эта схема предполагает один reverse proxy — Nginx непосредственно перед Express. Если используете CDN или другой proxy, настройку реального IP нужно согласовать с этой цепочкой отдельно.

## 3. Подключитесь по SSH и создайте пользователя

### 3.1. SSH-ключ на локальном компьютере

**Локально, PowerShell:**

```powershell
ssh -V
Test-Path "$env:USERPROFILE\.ssh\fragrances-vps"
```

Если ключа с таким именем нет, создайте его и задайте парольную фразу:

```powershell
ssh-keygen -t ed25519 -C "fragrances-vps" -f "$env:USERPROFILE\.ssh\fragrances-vps"
```

Если файл уже существует, используйте этот ключ или другое имя; существующий приватный ключ перезаписывать не нужно. Файл без `.pub` — приватный, его оставляют на локальном компьютере.

### 3.2. Первое подключение

**Локально, PowerShell:**

```powershell
ssh root@203.0.113.10
```

Используйте первоначальный пароль или ключ, предоставленный хостингом. Если хостинг выдал пользователя `ubuntu`, войдите под ним и выполняйте административные команды через `sudo`. При первом подключении сверяйте fingerprint SSH-ключа сервера с данными хостинга, если они доступны.

**На VPS, в первоначальной root-сессии:**

```bash
adduser deploy
usermod -aG sudo deploy
install -d -m 0700 -o deploy -g deploy /home/deploy/.ssh
```

Не закрывая эту сессию, откройте второе окно PowerShell и установите публичный ключ:

```powershell
Get-Content "$env:USERPROFILE\.ssh\fragrances-vps.pub" | ssh root@203.0.113.10 'cat >> /home/deploy/.ssh/authorized_keys; chown deploy:deploy /home/deploy/.ssh/authorized_keys; chmod 600 /home/deploy/.ssh/authorized_keys'
ssh -i "$env:USERPROFILE\.ssh\fragrances-vps" deploy@203.0.113.10
```

Если root-вход выполняется отдельным ключом хостинга, укажите его через `-i` в команде установки публичного ключа. Проверьте в новой SSH-сессии:

```bash
whoami
sudo -v
```

Ожидается пользователь `deploy` и работающий sudo. Дальнейшие VPS-команды выполняйте под `deploy`.

### 3.3. Отключение входа по паролю

Делайте это **после успешной проверки входа под `deploy` по ключу**, сохраняя первоначальную сессию открытой:

```bash
sudo nano /etc/ssh/sshd_config.d/00-fragrances.conf
```

Содержимое:

```text
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
```

```bash
sudo sshd -t
sudo sshd -T | grep -E '^(pubkeyauthentication|passwordauthentication|kbdinteractiveauthentication|permitrootlogin) '
sudo systemctl reload ssh
```

Проверьте ещё одно новое SSH-подключение, прежде чем закрывать старые. Если итоговые значения `sshd -T` отличаются, проверьте настройки образа хостинга: OpenSSH учитывает порядок параметров. Описание настройки — в [документации Ubuntu OpenSSH](https://ubuntu.com/server/docs/how-to/security/openssh-server/).

## 4. Установите системные пакеты, firewall и Node.js

**На VPS, пользователь `deploy`:**

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg nginx ufw sqlite3 rsync xz-utils build-essential python3 dnsutils nano snapd
```

Если обновления требуют перезагрузки, выполните её сейчас и подключитесь заново.

Разрешите SSH **до** включения firewall. В примере SSH использует порт 22:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status verbose
```

Если SSH работает на другом порту, сначала разрешите именно его. В firewall панели хостинга также должны быть разрешены входящие TCP 22, 80 и 443. Порты 3001 и 5173 публиковать не нужно. Команды UFW описаны в [документации Ubuntu](https://ubuntu.com/server/docs/firewalls/).

Установите Node.js **ветки 22**, не ниже 22.12. Для systemd удобно использовать системный `/usr/bin/node`, а не Node из домашнего каталога nvm. В примере используется [репозиторий NodeSource](https://github.com/nodesource/distributions):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource-22.sh
less /tmp/nodesource-22.sh
sudo bash /tmp/nodesource-22.sh
sudo apt install -y nodejs
node --version
npm --version
command -v node
```

После просмотра файла из `less` выходят клавишей `q`. Ожидаются Node.js `v22.x` и путь `/usr/bin/node`. Если на сервере уже настроен другой источник Node.js, сначала проверьте его версию; смешивать установки не требуется.

## 5. Создайте сервисного пользователя и постоянные каталоги

`deploy` устанавливает версии приложения. Отдельный пользователь `fragrances` запускает Node.js и записывает базу и изображения:

```bash
sudo useradd --system --user-group --home-dir /var/lib/fragrances --shell /usr/sbin/nologin fragrances
sudo usermod -aG fragrances deploy
sudo install -d -o deploy -g fragrances -m 0755 /srv/fragrances /srv/fragrances/releases
sudo install -d -o fragrances -g fragrances -m 0750 /var/lib/fragrances /var/lib/fragrances/uploads
sudo install -d -o root -g fragrances -m 0750 /etc/fragrances
sudo install -d -o root -g root -m 0700 /var/backups/fragrances
```

Эти команды предназначены для первой установки: если пользователь уже существует, повторно создавать его не нужно. Переподключитесь по SSH, чтобы членство `deploy` в группе `fragrances` вступило в силу:

```bash
exit
```

**Локально, PowerShell:**

```powershell
ssh -i "$env:USERPROFILE\.ssh\fragrances-vps" deploy@203.0.113.10
```

**На VPS:**

```bash
id
```

В списке групп должна быть `fragrances`.

## 6. Передайте исходники с Windows на VPS

Этот способ не требует удалённого Git-репозитория: он подходит для текущего локального проекта. В архив обязательно должны попасть `package-lock.json`, `client`, `server`, `prisma`, `scripts` и исходные изображения из `images`.

**Локально, PowerShell, из папки проекта:**

```powershell
Set-Location 'C:\Users\amirk\OneDrive\Desktop\fragrances'
tar --exclude='./node_modules' --exclude='./.git' --exclude='./.cache' --exclude='./.env' --exclude='./.env.*' --exclude='./client/dist' --exclude='./output' --exclude='./.playwright-cli' --exclude='*.db*' --exclude='./export-db.mjs' --exclude='./images/uploads' -czf "$env:TEMP\fragrances-source.tar.gz" .
scp -i "$env:USERPROFILE\.ssh\fragrances-vps" "$env:TEMP\fragrances-source.tar.gz" deploy@203.0.113.10:/tmp/fragrances-source.tar.gz
```

Шаблон `.env.*` исключает и `.env.example`; production-файл создаётся явно в следующем разделе. База и загруженные через админку изображения переносятся отдельно, если они нужны. **Windows-папку `node_modules` не переносите**: Prisma и Sharp должны установить Linux-бинарники на VPS.

**На VPS:**

```bash
RELEASE_ID=$(date -u +%Y%m%dT%H%M%SZ)
RELEASE_DIR="/srv/fragrances/releases/$RELEASE_ID"
install -d -m 0755 "$RELEASE_DIR"
tar -xzf /tmp/fragrances-source.tar.gz -C "$RELEASE_DIR"
cd "$RELEASE_DIR"
test -f package.json
test -f package-lock.json
test -f prisma/schema.prisma
test -f images/hero-bg.jpg
```

Сохраняйте эту SSH-сессию: переменная `RELEASE_DIR` используется дальше. При переподключении задайте её заново, указав фактическую папку версии из `ls /srv/fragrances/releases`.

## 7. Настройте production `.env` и пароль администратора

Создайте файл один раз. Условие сохраняет существующую конфигурацию при повторном выполнении:

```bash
if [ ! -e /etc/fragrances/fragrances.env ]; then
  sudo install -o deploy -g fragrances -m 0640 /dev/null /etc/fragrances/fragrances.env
fi
nano /etc/fragrances/fragrances.env
```

Для первой установки заполните:

```dotenv
NODE_ENV=production
PORT=3001
SITE_URL=https://example.com
DATABASE_URL="file:/var/lib/fragrances/production.db"
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=
ADMIN_PASSWORD_HASH=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
CONTACT_PHONE="+998 93 385 48 88"
CONTACT_TELEGRAM="@Otdushkiuz"
CONTACT_EMAIL=
CONTACT_ADDRESS=
TRUST_PROXY=1
```

Замените домен и email администратора. `SITE_URL` — точный публичный origin, включая `https://`, без пути. Например, `https://example.com` и `https://www.example.com` — разные origin; несоответствие блокирует вход и отправку форм.

`DATABASE_URL` — абсолютный путь, поэтому рабочая папка и новая версия кода не изменят расположение БД. `TRUST_PROXY=1` соответствует одному локальному Nginx, который ниже перезаписывает forwarding-заголовки.

Создайте ссылки. Архив из раздела 6 уже исключил `.env` и `images/uploads`, поэтому их место свободно:

```bash
cd "$RELEASE_DIR"
ln -s /etc/fragrances/fragrances.env .env
ln -s /var/lib/fragrances/uploads images/uploads
npm ci --include=dev
npm run admin:password
```

Введите **новый production-пароль** минимум из 12 символов; максимальный размер — 72 байта UTF-8. Ввод этой команды виден в терминале. Она записывает bcrypt-хеш в `ADMIN_PASSWORD_HASH` и очищает `ADMIN_PASSWORD`. Не записывайте обычный пароль в `ADMIN_PASSWORD_HASH` и не переносите короткий локальный пароль на VPS.

Такой порядок важен: production-код требует пароль и HTTPS `SITE_URL` уже при запуске. Команда установки пароля не импортирует сервер и позволяет подготовить конфигурацию до его первого старта.

Альтернативно можно задать обычный пароль в `ADMIN_PASSWORD`, оставив хеш пустым. Если заполнены оба поля, используется хеш. Значения с `#` и пробелами заключайте в кавычки. Выполнять `source .env` или `export $(cat .env ...)` не нужно: приложение читает `.env` само.

Проверьте доступ сервисного пользователя, не выводя секреты:

```bash
sudo -u fragrances test -r /etc/fragrances/fragrances.env
sudo -u fragrances test -w /var/lib/fragrances
sudo -u fragrances test -w /var/lib/fragrances/uploads
readlink -f .env
readlink -f images/uploads
```

Dev-зависимости устанавливаются намеренно: они нужны для Vite, Prisma CLI и тестов. Их наличие не запускает dev server. `sudo npm install` для проекта не используйте.

## 8. Если нужно перенести существующие товары и заявки

Этот раздел необязателен. Для нового пустого каталога переходите к разделу 9. Для переноса сохраните **базу вместе с загруженными файлами** до первого запуска сервиса на VPS.

На исходном компьютере остановите локальный сервер и другие процессы, изменяющие эти данные. В корне проекта создайте временный файл `export-db.mjs`:

```javascript
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { resolve } from 'node:path';

dotenv.config();
const db = new PrismaClient();
try {
  // Целевой файл не должен существовать. При повторном экспорте выберите новое имя.
  await db.$executeRawUnsafe('VACUUM INTO ?', resolve('fragrances-data.db'));
  console.log('Database exported.');
} finally {
  await db.$disconnect();
}
```

**Локально, PowerShell:**

```powershell
node export-db.mjs
tar -czf "$env:TEMP\fragrances-uploads.tar.gz" -C images/uploads .
scp -i "$env:USERPROFILE\.ssh\fragrances-vps" fragrances-data.db deploy@203.0.113.10:/tmp/fragrances-data.db
scp -i "$env:USERPROFILE\.ssh\fragrances-vps" "$env:TEMP\fragrances-uploads.tar.gz" deploy@203.0.113.10:/tmp/fragrances-uploads.tar.gz
```

Экспорт содержит контакты заявителей и сессии; не добавляйте `fragrances-data.db` в Git или архив исходников. При нестандартном локальном `DATABASE_URL` скрипт использует его значение из локального `.env`.

**На VPS, только при первой установке с ещё не запущенным сервисом:**

```bash
(
set -e
if sudo test -e /var/lib/fragrances/production.db; then
  echo 'Database already exists. Stop and back it up before replacing it.' >&2
  exit 1
fi
sudo install -o fragrances -g fragrances -m 0640 /tmp/fragrances-data.db /var/lib/fragrances/production.db
sudo tar -xzf /tmp/fragrances-uploads.tar.gz -C /var/lib/fragrances/uploads
sudo chown -R fragrances:fragrances /var/lib/fragrances/uploads
sudo chmod -R u=rwX,g=rX,o= /var/lib/fragrances/uploads
test "$(sudo -u fragrances sqlite3 /var/lib/fragrances/production.db 'PRAGMA integrity_check;')" = 'ok'
sudo -u fragrances sqlite3 /var/lib/fragrances/production.db 'DELETE FROM AdminSession;'
echo 'Import verified.'
)
```

Блок прервётся, если база уже существует или какая-либо операция завершится ошибкой. При успешном переносе появится `Import verified.` Старые локальные сессии удаляются, вход на VPS выполняется с production-логином и паролем из раздела 7. Временные копии БД после проверки переноса удалите из `/tmp` и локальной папки либо перенесите в защищённое хранилище.

## 9. Примените миграции, проверьте код и соберите сайт

**На VPS, из папки новой версии:**

```bash
cd "$RELEASE_DIR"
npx prisma generate
sudo -u fragrances /usr/bin/node node_modules/prisma/build/index.js migrate deploy
npm test
npm run build
test -f client/dist/index.html
```

CLI миграций запускается пользователем `fragrances`, поэтому новая БД и служебные файлы SQLite принадлежат тому же пользователю, что и работающий сервер. Используется закреплённая в проекте версия Prisma из `node_modules`.

Для первоначального демонстрационного наполнения, **только если оно действительно нужно**:

```bash
sudo -u fragrances /usr/bin/node prisma/seed.js
```

Без seed миграция создаст базовые категории, а реальные товары можно добавить в админке. После переноса готового каталога seed обычно не нужен. Общую команду `npm run setup` здесь заменяют явные шаги, чтобы автоматически не добавлять демонстрационные продукты.

На production применяются готовые миграции через `migrate deploy`. `prisma migrate dev`, `db push --accept-data-loss` и пересоздание рабочей базы в этот процесс не входят.

## 10. Создайте systemd-сервис

При первой установке выберите собранную версию:

```bash
ln -s "$RELEASE_DIR" /srv/fragrances/current
sudo nano /etc/systemd/system/fragrances.service
```

Содержимое `/etc/systemd/system/fragrances.service`:

```ini
[Unit]
Description=Fragrances and Co web service
After=network.target

[Service]
Type=simple
User=fragrances
Group=fragrances
WorkingDirectory=/srv/fragrances/current
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /srv/fragrances/current/server/src/index.js
Restart=on-failure
RestartSec=5
KillSignal=SIGTERM
TimeoutStopSec=20
UMask=0027
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/var/lib/fragrances
SyslogIdentifier=fragrances

[Install]
WantedBy=multi-user.target
```

Код и настройки доступны для чтения, а постоянный каталог данных — для записи. Это согласовано с настройками [`ProtectSystem` и `ReadWritePaths` в systemd](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html#ProtectSystem=). Временные файлы Sharp могут создаваться в изолированном `/tmp`.

```bash
sudo systemd-analyze verify /etc/systemd/system/fragrances.service
sudo systemctl daemon-reload
sudo systemctl enable --now fragrances
sudo systemctl status fragrances --no-pager
curl --fail http://127.0.0.1:3001/api/health
```

Ожидаемый ответ health endpoint:

```json
{"status":"ok"}
```

Сервис переживает закрытие SSH-сессии и перезагрузку VPS. systemd запускает Node напрямую, чтобы сигналы остановки попадали в обработчик корректного завершения Express.

## 11. Настройте Nginx

**На VPS:**

```bash
sudo nano /etc/nginx/sites-available/fragrances
```

Содержимое, заменив домен:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name example.com;

    client_max_body_size 9m;
    access_log /var/log/nginx/fragrances.access.log;
    error_log /var/log/nginx/fragrances.error.log;

    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/javascript application/json application/xml image/svg+xml;

    location ~ /\.(?!well-known/) {
        return 404;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_connect_timeout 5s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
```

`X-Forwarded-For` здесь перезаписывается адресом клиента, пришедшего напрямую в Nginx, что соответствует `TRUST_PROXY=1`. Настройка заголовков описана в [документации Nginx proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header). Ограничение 9 МБ вмещает разрешённый приложением файл 8 МБ и multipart-обвязку.

Все пути проксируются Express, включая `/api`, `/images`, `/hero-bg.jpg`, `/sitemap.xml` и `/robots.txt`. Отдельный публичный `root` на весь каталог проекта не задаётся.

Включите сайт:

```bash
sudo ln -s /etc/nginx/sites-available/fragrances /etc/nginx/sites-enabled/fragrances
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx
curl --fail -H 'Host: example.com' http://127.0.0.1/api/health
dig +short A example.com
```

На чистом сервере стандартная страница Nginx по IP может остаться: запросы по правильному домену обслуживает `server_name`. На VPS с уже существующими сайтами не заменяйте их конфигурацию. Если домен указан в другом server block, устраните дублирование.

HTTP на этом шаге нужен для выпуска сертификата. **Вход в админку и отправку форм проверяйте после настройки HTTPS**: production-cookie имеет `Secure`, а разрешённый `SITE_URL` уже начинается с `https://`.

## 12. Выпустите сертификат HTTPS

Проверьте, что домен доступен из интернета на порту 80 и DNS указывает на VPS. Для Nginx используем [официальную инструкцию Certbot через snap](https://certbot.eff.org/instructions?ws=nginx&os=snap):

```bash
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/local/bin/certbot
sudo certbot --nginx -d example.com --redirect
sudo nginx -t
sudo certbot renew --dry-run
sudo systemctl list-timers --all | grep -i certbot
```

Certbot запросит email для уведомлений и согласие с условиями, добавит HTTPS-конфигурацию и перенаправление с HTTP. Если Certbot уже установлен другим способом, сначала выберите один способ установки; повторно создавать существующую ссылку не нужно.

Откройте `https://example.com`. Проверьте отсутствие ошибок сертификата и перенаправление с `http://example.com`. Порт 80 оставьте доступным для HTTP-проверок продления сертификата. Не добавляйте вторую задачу cron на `certbot renew`, если уже работает установленный таймер.

## 13. Проверьте запущенный сайт

**На VPS:**

```bash
curl --fail https://example.com/api/health
curl --fail https://example.com/api/config
curl --fail https://example.com/api/categories
curl --fail https://example.com/robots.txt
curl --fail https://example.com/sitemap.xml
curl -I https://example.com/collection
curl -I https://example.com/images/logo.png
sudo ss -lntp | grep -E ':(22|80|443|3001|5173)\b'
```

В `/api/config` находятся только публичные контакты и адрес сайта. В sitemap должен быть ваш HTTPS-домен, а не `localhost`. Node слушает `127.0.0.1:3001`; production-порта 5173 быть не должно.

В браузере проверьте:

1. Главную, коллекцию, карточку товара и прямое открытие `/collection` после обновления страницы.
2. Переключение RU / UZ / EN, телефон и Telegram, плавающую кнопку на телефоне.
3. `https://example.com/admin`: логин из `ADMIN_EMAIL`, новый production-пароль.
4. Создание и редактирование тестового товара/категории, загрузку изображения; удалите созданные тестовые записи после проверки.
5. Форму заявки: запрос появился в журнале администратора.
6. После подключения бота — реальное уведомление в нужном Telegram-чате.

### Настройка уведомлений Telegram

Публичный `CONTACT_TELEGRAM=@Otdushkiuz` открывает чат для посетителей. Для автоматических уведомлений нужны `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` в `/etc/fragrances/fragrances.env`.

Создайте бота через BotFather, начните с ним диалог или добавьте в нужную группу с разрешением писать сообщения. ID чата можно получить через [официальный метод getUpdates](https://core.telegram.org/bots/api#getupdates) после сообщения боту; публичное имя пользователя не заменяет числовой ID чата.

После заполнения настроек:

```bash
sudo systemctl restart fragrances
sudo journalctl -u fragrances -n 50 --no-pager
```

Без настроек Telegram сайт продолжает сохранять заявки. После подключения бота сервер обрабатывает ожидающие уведомления раз в минуту. В админке видны статус и число попыток; есть ручной повтор. Отправьте одну тестовую заявку и проверьте чат. Настройки бота не выводите в публичные логи и не помещайте в Git.

## 14. Резервное копирование

Копируйте вместе **SQLite, uploads, production `.env` и идентификатор версии кода**. Для согласованного снимка базы и файлов ниже используется короткая остановка сервиса. Простое копирование работающего файла `.db` не заменяет SQLite backup; команда `.backup` описана в [документации SQLite CLI](https://www.sqlite.org/cli.html).

Создайте скрипт:

```bash
sudo nano /usr/local/sbin/fragrances-backup
```

Содержимое:

```bash
#!/usr/bin/env bash
set -euo pipefail
umask 077

exec 9>/run/lock/fragrances-backup.lock
flock -n 9 || { echo 'Another backup is running.' >&2; exit 1; }

test -s /var/lib/fragrances/production.db
test -d /var/lib/fragrances/uploads
test -f /etc/fragrances/fragrances.env
test -f /srv/fragrances/current/server/src/index.js

BACKUP_ID=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_DIR="/var/backups/fragrances/$BACKUP_ID"
install -d -m 0700 "$BACKUP_DIR"
WAS_ACTIVE=0

resume_service() {
  if [ "$WAS_ACTIVE" -eq 1 ]; then
    systemctl start fragrances
  fi
}
trap resume_service EXIT

if systemctl is-active --quiet fragrances; then
  WAS_ACTIVE=1
  systemctl stop fragrances
fi

sqlite3 /var/lib/fragrances/production.db ".backup '$BACKUP_DIR/production.db'"
tar -czf "$BACKUP_DIR/uploads.tar.gz" -C /var/lib/fragrances uploads
install -m 0600 /etc/fragrances/fragrances.env "$BACKUP_DIR/fragrances.env"
readlink -f /srv/fragrances/current > "$BACKUP_DIR/release.txt"
test "$(sqlite3 "$BACKUP_DIR/production.db" 'PRAGMA integrity_check;')" = 'ok'
echo "Backup ready: $BACKUP_DIR"
```

```bash
sudo chmod 0700 /usr/local/sbin/fragrances-backup
sudo /usr/local/sbin/fragrances-backup
sudo systemctl is-active fragrances
sudo ls -lt /var/backups/fragrances
```

Если сервис был запущен, скрипт запустит его снова и при ошибке backup. Если он был остановлен заранее для обновления, скрипт оставит его остановленным.

Для ежедневного запуска откройте root-cron:

```bash
sudo crontab -e
```

Добавьте строку:

```cron
15 3 * * * /usr/local/sbin/fragrances-backup
```

Время берётся из часового пояса VPS (`timedatectl`). В момент backup сайт кратковременно недоступен. Не запускайте обновление одновременно с плановым backup; на окно обслуживания временно закомментируйте строку cron и затем верните её.

Регулярно проверяйте наличие и целостность копий и свободный диск. Храните дополнительную защищённую копию вне VPS: backup на том же диске не поможет при потере сервера. Папки backup содержат данные заявителей и секреты, их нельзя размещать в каталоге сайта.

## 15. Обновление сервиса

Каждое обновление устанавливается в **новую папку версии**. База и uploads остаются общими. Перед миграциями сделайте backup.

1. На компьютере повторите создание архива и SCP из раздела 6 с обновлённым кодом.
2. На VPS подготовьте новую версию; установка зависимостей и сборка ещё не требуют остановки старой:

```bash
NEXT_ID=$(date -u +%Y%m%dT%H%M%SZ)
NEXT_DIR="/srv/fragrances/releases/$NEXT_ID"
install -d -m 0755 "$NEXT_DIR"
tar -xzf /tmp/fragrances-source.tar.gz -C "$NEXT_DIR"
cd "$NEXT_DIR"
ln -s /etc/fragrances/fragrances.env .env
ln -s /var/lib/fragrances/uploads images/uploads
npm ci --include=dev
npx prisma generate
npm test
npm run build
test -f client/dist/index.html
```

3. Только после успешных проверок сохраните текущую версию и остановите сервис:

```bash
PREVIOUS_DIR=$(readlink -f /srv/fragrances/current)
printf '%s\n' "$PREVIOUS_DIR"
sudo systemctl stop fragrances
sudo /usr/local/sbin/fragrances-backup
```

Запишите путь выданного backup. Дальнейшие команды выполняйте последовательно, проверяя результат каждой:

```bash
(
set -e
cd "$NEXT_DIR"
sudo -u fragrances /usr/bin/node node_modules/prisma/build/index.js migrate deploy
ln -sfnT "$NEXT_DIR" /srv/fragrances/current
sudo systemctl start fragrances
sudo systemctl status fragrances --no-pager
curl --fail http://127.0.0.1:3001/api/health
curl --fail https://example.com/api/health
)
```

Не переключайте ссылку, если миграция завершилась ошибкой. Проверьте `prisma migrate status` и логи; остановившаяся миграция могла частично изменить схему, поэтому запуск старого кода требует проверки совместимости или восстановления backup.

Не запускайте seed при обычном обновлении: он предназначен для демонстрационного наполнения. Изменённый unit-файл требует `sudo systemctl daemon-reload`; обычное переключение версии — нет. Проверяйте сайт в браузере после обновления. Старую версию сохраняйте до подтверждения стабильной работы.

## 16. Откат

### Только код, если схема БД не менялась или совместима

Выберите существующую предыдущую версию, а не копируйте дату из примера:

```bash
ls /srv/fragrances/releases
PREVIOUS_DIR=/srv/fragrances/releases/REPLACE_WITH_PREVIOUS_RELEASE
(
set -e
test -f "$PREVIOUS_DIR/server/src/index.js"
test -f "$PREVIOUS_DIR/client/dist/index.html"
sudo systemctl stop fragrances
ln -sfnT "$PREVIOUS_DIR" /srv/fragrances/current
sudo systemctl start fragrances
curl --fail http://127.0.0.1:3001/api/health
)
```

Проверки `test` должны завершиться успешно до переключения. SQLite не откатывается автоматически вместе с кодом. При несовместимой миграции восстанавливайте и данные, и код из одного backup.

### Восстановление кода и данных из backup

Временно отключите плановый backup. Сначала сохраните текущее состояние, если оно доступно для чтения. Остановите сервис и выберите копию:

```bash
sudo systemctl stop fragrances
BACKUP_DIR=/var/backups/fragrances/REPLACE_WITH_BACKUP_ID
sudo ls -l "$BACKUP_DIR"
sudo sqlite3 "$BACKUP_DIR/production.db" 'PRAGMA integrity_check;'
sudo cat "$BACKUP_DIR/release.txt"
```

Ожидается `ok`. Убедитесь, что записанная версия ещё существует в `/srv/fragrances/releases`. Подготовьте данные отдельно, сохраняя текущий каталог:

```bash
RESTORE_ID=$(date -u +%Y%m%dT%H%M%SZ)
RESTORE_DIR="/var/lib/fragrances-restore-$RESTORE_ID"
(
set -e
test "$(sudo sqlite3 "$BACKUP_DIR/production.db" 'PRAGMA integrity_check;')" = 'ok'
sudo test -f "$BACKUP_DIR/fragrances.env"
sudo test -f "$BACKUP_DIR/uploads.tar.gz"
sudo test ! -e "$RESTORE_DIR"
sudo test ! -e "/var/lib/fragrances-before-restore-$RESTORE_ID"
sudo install -d -o fragrances -g fragrances -m 0750 "$RESTORE_DIR"
sudo install -o fragrances -g fragrances -m 0640 "$BACKUP_DIR/production.db" "$RESTORE_DIR/production.db"
sudo tar -xzf "$BACKUP_DIR/uploads.tar.gz" -C "$RESTORE_DIR"
sudo test -d "$RESTORE_DIR/uploads"
sudo chown -R fragrances:fragrances "$RESTORE_DIR"
sudo chmod -R u=rwX,g=rX,o= "$RESTORE_DIR"
sudo mv /var/lib/fragrances "/var/lib/fragrances-before-restore-$RESTORE_ID"
sudo mv "$RESTORE_DIR" /var/lib/fragrances
sudo install -o deploy -g fragrances -m 0640 "$BACKUP_DIR/fragrances.env" /etc/fragrances/fragrances.env
)
```

Затем укажите проверенный путь из `release.txt` и запустите сервис:

```bash
RESTORE_RELEASE=/srv/fragrances/releases/REPLACE_WITH_RELEASE_FROM_BACKUP
(
set -e
test -f "$RESTORE_RELEASE/server/src/index.js"
test -f "$RESTORE_RELEASE/client/dist/index.html"
ln -sfnT "$RESTORE_RELEASE" /srv/fragrances/current
sudo systemctl start fragrances
sudo systemctl status fragrances --no-pager
curl --fail https://example.com/api/health
)
```

Восстановление возвращает товары, заявки и пароль администратора к моменту backup. Данные, созданные позже, остаются в сохранённом каталоге `fragrances-before-restore-...`; их нужно переносить отдельно при необходимости. После восстановления заполните актуальные контакты/секреты, если они менялись, перезапустите сервис и верните расписание backup.

## 17. Логи и типичные ошибки

```bash
sudo journalctl -u fragrances -f
sudo journalctl -u fragrances -n 100 --no-pager
sudo tail -n 100 /var/log/nginx/fragrances.error.log
sudo systemctl status fragrances nginx --no-pager
df -h
free -h
```

| Симптом | Что проверить |
| --- | --- |
| `502 Bad Gateway` | `systemctl status fragrances`, логи Node, доступность `127.0.0.1:3001/api/health` |
| `Production requires ...` | HTTPS `SITE_URL`, настроенный пароль, доступ пользователя `fragrances` к `.env` |
| `ORIGIN_REJECTED`, формы возвращают 403 | Совпадение домена/протокола с `SITE_URL`, отсутствие перехода на другой `www`/поддомен |
| Вход успешен, но админка снова показывает логин | Открытие по HTTPS, Secure-cookie, передача `X-Forwarded-Proto`, отсутствие второго приложения на другом origin |
| `INVALID_CREDENTIALS` | `ADMIN_EMAIL`, новый production-пароль, приоритет `ADMIN_PASSWORD_HASH`; после изменения `.env` нужен restart |
| Ошибка формата bcrypt | В `ADMIN_PASSWORD_HASH` должен быть хеш; задайте пароль через `npm run admin:password` из текущей версии |
| `SQLITE_CANTOPEN`, `readonly database` | Абсолютный путь БД, права на `/var/lib/fragrances` и возможность создавать journal/WAL рядом с файлом |
| `P2021` / отсутствует таблица Category | Применены ли все миграции к именно production-БД из `DATABASE_URL` |
| Ошибка загрузки изображения, `EACCES` | Ссылка `images/uploads`, владелец каталога `fragrances`, свободное место |
| Nginx возвращает 413 | `client_max_body_size 9m`; само приложение принимает изображение не больше 8 МБ |
| Нативные ошибки Prisma / Sharp | Не переносилась ли Windows-папка `node_modules`; повторите `npm ci --include=dev` и генерацию в новой Linux-версии |
| Сборка завершилась `Killed` | Проверьте память и OOM (`sudo journalctl -k -n 100`); уменьшите нагрузку или увеличьте ресурсы VPS |
| Вместо сайта страница Nginx | DNS, `server_name`, ссылка в `sites-enabled`, дублирующие server blocks |
| Сертификат не выпускается/не продлевается | DNS A/AAAA, доступность порта 80, firewall хостинга, вывод `certbot renew --dry-run` |
| Telegram не пришёл | Заявка в админке, bot token / chat ID, права бота в чате, исходящий HTTPS/DNS и статус доставки |

Изменение `.env`:

```bash
nano /etc/fragrances/fragrances.env
sudo systemctl restart fragrances
```

Смена пароля без пересборки:

```bash
cd /srv/fragrances/current
npm run admin:password
sudo systemctl restart fragrances
```

Если нужно немедленно завершить все существующие административные сессии после смены пароля:

```bash
sudo -u fragrances sqlite3 /var/lib/fragrances/production.db 'DELETE FROM AdminSession;'
```

Эта команда удаляет только сессии; товары и заявки сохраняются. Для других SQL-операций сначала делайте backup.
