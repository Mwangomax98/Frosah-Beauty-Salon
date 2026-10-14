# Blue Spark Holdings — website & booking system

One site for two Dar es Salaam services:

- **Johnson Rentals** — car hire, self-drive or with driver.
- **Blue Spark Stays** (placeholder name until the BnB brand is supplied) — short-stay apartments and houses.

One design system, two booking flows, one admin dashboard, vendor notifications by email + WhatsApp, iCal sync with Airbnb / Booking.com.

```
client/   React 19 + TypeScript + Tailwind v4 (Vite)      → the public site and /admin dashboard
server/   Node 22 + Express 5 + MySQL (mysql2)            → REST API, payments, emails, WhatsApp, iCal
shared/   Types, constants, date helpers and the pricing engine used by BOTH client and server
docs/     API contract (docs/API.md)
```

## Run it on your computer — step by step

You need **Node.js 22** (https://nodejs.org, LTS) and **MySQL 8** or **MariaDB 10.6+** installed.

1. Open a terminal and go into the project folder:
   `cd Frosah-Beauty-Salon`
2. Install every package for all three workspaces in one go:
   `npm install`
3. Create the database and a user. Open the MySQL shell (`mysql -u root -p`) and paste:
   ```sql
   CREATE DATABASE bluesparks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'bluesparks'@'localhost' IDENTIFIED BY 'bluesparks';
   GRANT ALL ON bluesparks.* TO 'bluesparks'@'localhost';
   FLUSH PRIVILEGES;
   ```
   Type `exit` to leave the MySQL shell.
4. Create the server config file: copy `server/.env.example` to `server/.env`
   (`cp server/.env.example server/.env`). Open `server/.env` in your editor and set at least
   `DB_PASSWORD`, `JWT_SECRET` (any long random text), `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
   Leave `PAYMENT_GATEWAY=mock` for now — it gives you a fake "Pay" page so you can test the whole flow.
5. Create the tables and load the placeholder fleet, properties, extras and your admin login:
   `npm run db:setup`
6. Start both the API and the website:
   `npm run dev`
7. Open http://localhost:5173 in your browser. The admin dashboard is at http://localhost:5173/admin
   (log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in step 4).

Useful commands: `npm run typecheck` (all workspaces), `npm test` (server tests against a `bluesparks_test` database — see `server/README.md`), `npm run build` (production build).

## Things the owner must replace before launch

| Item | Where |
|---|---|
| Logo colours — already sampled from the supplied logo (navy `#081132`, royal blue `#015CD9`, deep blue `#0133A5`, sky `#02A2FB`) | `client/src/index.css` |
| Logo files — already cut from the supplied JPG; replace with vector exports when available | `client/public/brand/` |
| Photos (free Unsplash placeholders are bundled) | `client/public/images/placeholders/` + `client/src/content/images.ts` |
| BnB brand name | Admin → Settings → "BnB brand name" |
| Business WhatsApp number, vendor email, phone, address | Admin → Settings |
| Fleet, properties, prices, extras, delivery zones, promo codes | Admin dashboard |
| Real payment gateway | `server/.env` → `PAYMENT_GATEWAY=flutterwave` + keys (see `server/README.md`) |
| WhatsApp Cloud API credentials (optional — click-to-chat links work without them) | `server/.env` |
| Airbnb / Booking.com calendar links | Admin → Properties → edit → iCal import URLs; paste our export URL into those platforms |

## Deploying (summary)

Build with `npm run build`, serve `client/dist` as static files and run `npm start` for the API behind nginx with HTTPS (Let's Encrypt). Full numbered steps are in `server/README.md`.

## Deploying the frontend on Vercel (quick preview)

Vercel hosts only the React site (`client/`). The API needs a Node host with MySQL (Railway, Render, a VPS — see `server/README.md`).

1. On vercel.com click **Add New → Project**, import `Mwangomax98/Frosah-Beauty-Salon`, and pick branch `claude/hopeful-bardeen-n0ugti`.
2. Leave **Root Directory** as the repository root — `vercel.json` already sets the build command and output folder.
3. Under **Environment Variables** add `VITE_API_URL` = the public URL of your API server (e.g. `https://api.bluesparks.co.tz`). Without it the site renders but listings, quotes and bookings show a connection error.
4. Click **Deploy**.
5. On the API host set `CLIENT_ORIGIN` and `PUBLIC_URL` to your Vercel URL (e.g. `https://bluesparks.vercel.app`) so CORS, emails and payment redirects point at the right place.
