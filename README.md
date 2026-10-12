# Etukas.com

Etukas is a production-oriented building materials marketplace monorepo. It connects customers with nearby shops, retailers, wholesalers, and manufacturers using a local discovery model plus ecommerce flows.

## Status

Implemented in this milestone:

- npm workspaces for `client`, `server`, and `packages/shared`
- Responsive React marketplace UI with Etukas colors, homepage, products, stores, cart, auth screens, seller dashboard, admin dashboard, and planned module pages
- Express `/api/v1` REST API with auth, refresh cookies, RBAC, CSRF protection, rate limiting, marketplace routes, cart routes, transactional order creation, seller routes, and admin seller approval
- Prisma PostgreSQL schema and seed script with development-only demo users, categories, store, and products
- Shared Zod schemas and TypeScript API types
- Docs for architecture, database, API, and deployment

Rentals, real estate, designs/professionals, advanced reports, image upload adapters, live payment provider verification, and full CRUD admin screens are prepared as extension areas, not presented as complete features.

## Prerequisites

- Node.js 20.11 or newer
- npm 10 or newer
- PostgreSQL 14 or newer

On Windows PowerShell, if `npm` is blocked by execution policy, use `npm.cmd`.

## Installation

```bash
npm install
```

## Environment

Copy `.env.example` to `.env` and replace secrets:

```bash
cp .env.example .env
```

Required local values:

- `DATABASE_URL`
- `CLIENT_URL`
- `SERVER_PORT`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- Optional map configuration: `MAP_PROVIDER`, `MAP_PROVIDER_API_KEY`, `VITE_MAP_PROVIDER`, and `VITE_MAP_PROVIDER_API_KEY`

Do not commit real `.env` files.

## PostgreSQL Setup

Create a local database:

```bash
createdb etukas
```

Then run:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Existing databases should apply migrations normally; do not reset production data. The seller enquiry migration adds optional nullable latitude and longitude fields, so existing enquiries remain valid without coordinates.

## Demo Accounts

Seeded only for development:

- Customer: `customer.demo@etukas.local` / `Etukas@123`
- Seller: `seller.demo@etukas.local` / `Etukas@123`
- Admin: `admin.demo@etukas.local` / `Etukas@123`

Never use these in production. Safe admin provisioning for production should use environment-controlled credentials or a private CLI flow.

To use these accounts for a **UI-only review without PostgreSQL**, set `VITE_DEMO_LOGIN=true` in `client/.env.local`, then start only the frontend with `npm run dev:client`. Demo login checks credentials in the browser and opens the corresponding customer, seller, or admin screen; database-backed marketplace features are not available in this mode. Do not enable this option in production.

## Start Development

```bash
npm run dev
```

Or separately:

```bash
npm run dev:server
npm run dev:client
```

Frontend: `http://localhost:5173`

Backend health check: `http://localhost:4000/health`

Seller enquiry form: `/seller-enquiry`

Admin seller enquiry review: `/admin` after signing in as an admin.

## Quality Commands

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Mobile App (Android & iOS)

Etukas includes native Android and iOS mobile project configurations powered by Capacitor.

### Commands

1. **Build web assets & sync to native mobile projects**:
   ```bash
   npm run mobile:build
   ```
2. **Sync changes without full rebuild**:
   ```bash
   npm run mobile:sync
   ```
3. **Open Android Studio (requires Android Studio installed)**:
   ```bash
   npm run mobile:android
   ```
4. **Open Xcode on macOS (requires Xcode installed)**:
   ```bash
   npm run mobile:ios
   ```

### Native Mobile Features Included:
- **Android & iOS wrapper projects**: Located in `client/android` and `client/ios`.
- **Status Bar & Splash Screen**: Styled with Etukas brand theme colors.
- **Hardware & Gesture Navigation**: Built-in Android back button handling.
- **Notch & Safe Area adaptation**: Dynamic Island and safe area padding (`pt-safe`, `pb-safe`, `viewport-fit=cover`).
- **Cross-Origin & Native Webview Support**: Server CORS configured to accept native mobile origins (`capacitor://localhost`, `https://localhost`, `http://localhost`).


## Troubleshooting

- If PowerShell blocks npm, run `npm.cmd install` and `npm.cmd run dev`.
- If Prisma cannot connect, verify `DATABASE_URL` and that PostgreSQL is running.
- If auth refresh does not work locally, confirm cookie settings: `COOKIE_SECURE=false` and `COOKIE_SAME_SITE=lax`.
- If CORS fails, ensure `CLIENT_URL` matches the browser origin exactly.

More details are in `docs/architecture.md`, `docs/database.md`, `docs/api.md`, and `docs/deployment.md`.
