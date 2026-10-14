# Blue Spark API server

Express 5 + TypeScript + MySQL backend for Johnson Rentals (car hire) and Blue Spark Stays (apartments). The API contract is in [`docs/API.md`](../docs/API.md); shared types and pricing live in [`shared/`](../shared).

## 1. Local setup (first time)

1. **Install Node.js 20 or newer** from https://nodejs.org (LTS). Check with `node -v`.
2. **Install MySQL 8 or MariaDB 10.6+.**
   - Ubuntu/Debian: `sudo apt install mariadb-server` then `sudo mysql_secure_installation`
   - macOS: `brew install mysql && brew services start mysql`
   - Windows: https://dev.mysql.com/downloads/installer/
3. **Create the database and a user** (run in `mysql -u root -p`):
   ```sql
   CREATE DATABASE bluesparks CHARACTER SET utf8mb4;
   CREATE USER 'bluesparks'@'localhost' IDENTIFIED BY 'choose-a-password';
   GRANT ALL ON bluesparks.* TO 'bluesparks'@'localhost';
   FLUSH PRIVILEGES;
   ```
4. **Install dependencies** from the repository root: `npm install`
5. **Create your `.env`**: `cp server/.env.example server/.env`, then edit it:
   - `DB_PASSWORD` — the password from step 3
   - `JWT_SECRET` — any long random string (`openssl rand -hex 32`)
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — the first admin login
   - Leave `PAYMENT_GATEWAY=mock` and SMTP/WhatsApp empty for now; emails are printed to the terminal.
6. **Create tables and placeholder data**: `npm run db:setup`
   Safe to re-run; it never duplicates data. Re-running also resets the admin password to `ADMIN_PASSWORD`.
7. **Start the API**: `npm run dev -w server` → http://localhost:4000/api/health
   (`npm run dev` from the root starts the API and the React client together.)

Useful commands (run from the repository root):

| Command | What it does |
|---|---|
| `npm run dev -w server` | Development server with auto-reload |
| `npm run typecheck -w server` | Type-check without building |
| `npm test -w server` | Runs the test suite against a `bluesparks_test` database (create it like step 3 and grant the same user) |
| `npm run build -w server` | Compiles to `server/dist` |
| `npm start -w server` | Runs the compiled build (`node dist/server/src/index.js`) |

## 2. Where things are

```
server/
  sql/schema.sql          tables (applied by db:setup)
  scripts/db-setup.ts     schema + seed
  src/index.ts            boot: DB check, listen, iCal scheduler
  src/app.ts              Express app factory (used by tests)
  src/config.ts           zod-validated environment
  src/db.ts               MySQL pool, transactions, row -> camelCase mappers
  src/routes/public/      /api/*  (catalogue, quotes, bookings, uploads, payments, ical, contact)
  src/routes/admin/       /api/admin/* (JWT protected)
  src/services/           availability, bookings, payments, notifications, ical, uploads, reference data
  src/lib/                email templates, WhatsApp, CSV
  uploads/images          public images (served at /uploads/images)
  uploads/private         customer licences/IDs — never served directly, admin-only download
```

## 3. Deploying to a Linux server (Ubuntu + nginx + HTTPS)

1. Install Node 20+, MySQL/MariaDB and nginx. Create the database as in step 3 above.
2. Clone the repo to e.g. `/var/www/bluesparks`, run `npm ci`, copy `.env.example` to `server/.env` and fill it in with production values:
   - `NODE_ENV=production`, `TRUST_PROXY=1` (so rate limiting sees the visitor's real IP behind nginx)
   - `CLIENT_ORIGIN=https://www.yourdomain.co.tz`, `PUBLIC_URL=https://www.yourdomain.co.tz`, `API_PUBLIC_URL=https://api.yourdomain.co.tz`
   - SMTP settings from your email provider (Gmail app password, Zoho, Brevo, etc.)
3. `npm run db:setup && npm run build`
4. Keep the API running with **pm2**: `npm i -g pm2 && pm2 start "npm start -w server" --name bluesparks-api && pm2 save && pm2 startup`
5. nginx site for the API (`/etc/nginx/sites-available/api.yourdomain.co.tz`):
   ```nginx
   server {
     server_name api.yourdomain.co.tz;
     client_max_body_size 6m;
     location / {
       proxy_pass http://127.0.0.1:4000;
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```
   Serve the built client (`client/dist`) from another server block for `www.yourdomain.co.tz` with `try_files $uri /index.html;`.
6. HTTPS with Let's Encrypt: `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d api.yourdomain.co.tz -d www.yourdomain.co.tz`. Certbot renews automatically.
7. Back up the database nightly: `mysqldump bluesparks | gzip > /backups/bluesparks-$(date +%F).sql.gz` in a cron job, and back up `server/uploads/`.

## 4. Switching on real payments (Flutterwave)

1. Create an account at https://flutterwave.com, complete business verification (TZS settlement to your Tanzanian bank or mobile money).
2. In the dashboard: **Settings → API Keys** → copy the Secret key and Public key.
3. **Settings → Webhooks** → URL `https://api.yourdomain.co.tz/api/payments/webhook/flutterwave`, and set a **Secret hash** of your choosing.
4. In `server/.env`:
   ```
   PAYMENT_GATEWAY=flutterwave
   FLUTTERWAVE_SECRET_KEY=FLWSECK-...
   FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-...
   FLUTTERWAVE_WEBHOOK_HASH=the-secret-hash-you-set
   ```
5. Restart the API (`pm2 restart bluesparks-api`). Customers are sent to Flutterwave's hosted page (card + Tanzanian mobile money); card details never touch this server. Test with Flutterwave's test keys first.

## 5. WhatsApp notifications (Meta Cloud API)

Customers always get a "Chat on WhatsApp" link (`wa.me/<businessWhatsapp>`) — that needs no setup beyond the number in **Admin → Settings**. To have the system message *you* automatically for every booking:

1. Go to https://developers.facebook.com → **My Apps → Create App → Business**, add the **WhatsApp** product.
2. In **WhatsApp → API Setup** you get a temporary access token and a **Phone number ID**. Add your own number as a recipient and verify it.
3. For a permanent token: **Business Settings → System Users → Add** (admin role) → **Generate token** with `whatsapp_business_messaging` and `whatsapp_business_management` permissions.
4. In `server/.env`: `WHATSAPP_CLOUD_TOKEN=...` and `WHATSAPP_PHONE_ID=...`, then restart.
5. Messages go to `businessWhatsapp` from Admin → Settings. Free-form messages can only be delivered to numbers that have messaged the business number within 24 hours (or registered test numbers) — send one message from your phone to your business number to open the window, or create an approved message template later.

Every attempt (email and WhatsApp) is recorded in the `notification_log` table and shown on the booking page in admin.

## 6. Syncing calendars with Airbnb / Booking.com (iCal)

**Block our dates on their side (export):**
Admin → Properties → open the apartment → copy the **iCal export URL** (looks like `https://api.yourdomain.co.tz/api/ical/3/<token>.ics`). In Airbnb: *Calendar → Availability → Connect calendars → Import calendar* and paste it. In Booking.com: *Rates & Availability → Sync calendars → Import*.

**Block their bookings on our side (import):**
In Airbnb: *Connect calendars → Export calendar* → copy the URL. In Booking.com: *Sync calendars → Export*. Then Admin → Properties → open the apartment → add the URL to **iCal import URLs** → Save. The server pulls every import URL every 30 minutes and whenever you press **Sync now**; imported events appear as blocked dates (source `ical`). Airbnb and Booking.com themselves refresh imported calendars every few hours, so always keep a manual eye on same-day bookings.

## 7. Troubleshooting

- `Cannot connect to MySQL` on start → check `DB_*` in `.env`, that MySQL is running (`sudo systemctl status mariadb`), and that the user has rights on the database.
- `Invalid environment configuration` → the message lists the variable; compare with `.env.example`.
- Emails not arriving → with no `SMTP_HOST` they are only logged. Check `notification_log` and your SMTP provider's sending logs; many providers require the `SMTP_FROM` address to be verified.
- Payments stuck on "pending" → open the booking in admin; use the Flutterwave dashboard to confirm the transaction, then set the payment status manually if needed.
