# Deployment

## Frontend on Vercel

The monorepo includes a `vercel.json` at the root configured for fast client builds.

### Option A: Monorepo Root Deployment (Recommended)
Deploying from the monorepo root preserves full npm workspace dependency resolution (including `@etukas/shared` and the root `package-lock.json`).

In the Vercel Project Settings under **General -> Build & Development Settings**:
- **Root Directory**: `./` (leave default repository root)
- **Framework Preset**: `Other`
- **Build Command**: Turn ON the override toggle and set to `npm run build:client` (or rely on `vercel.json`)
- **Output Directory**: Turn ON the override toggle and set to `client/dist`
  - *Important*: In Vercel, the "Other" framework preset defaults to `public`. If the dashboard override is not explicitly set to `client/dist` or if dashboard settings override code, Vercel will look for `public` and fail with `[STATIC_BUILD_NO_OUT_DIR]`.
- **Install Command**: `npm install` (default)
- **Node.js Version**: `20.x` (or `22.x`)

SPA client-side routing rewrites are configured in `vercel.json`.

### Option B: Client Subdirectory Deployment
If you set **Root Directory** to `client` in the Vercel Project Settings:
- **Root Directory**: `client`
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist` (default for Vite)
- **Include Files Outside Root Directory**: Must be enabled in Vercel so `packages/shared` can be resolved.
- SPA rewrites are handled by `client/vercel.json`.
*Note*: Option A is recommended over Option B because Option A uses the root `package-lock.json` and natively resolves all npm workspace links.

### Environment Variables on Vercel
Set the following in the Vercel Project Settings under **Environment Variables**:
- `VITE_API_URL`: URL of your deployed backend REST API (e.g., `https://api.your-domain.com/api/v1`). If omitted, defaults to `/api/v1`.
- `VITE_MAP_PROVIDER`: (Optional) `manual`, `google`, or `osm` (defaults to `manual`).
- `VITE_MAP_PROVIDER_API_KEY`: (Optional) Your map provider API key if using Google Maps.
- `VITE_DEMO_LOGIN`: (Optional) Set to `false` for production (demo logins are also automatically disabled in production mode).

> [!CAUTION]
> Never set backend secrets (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, etc.) in the frontend Vercel project settings. Any variable starting with `VITE_` is bundled into the client code and exposed to browsers.

## Backend

### Backend on Vercel
If deploying `server` as a separate Vercel project:

In the Vercel Project Settings under **General -> Build & Development Settings**:
- **Root Directory**: `server`
- **Include source files outside of the Root Directory in the Build Step**: MUST be **Enabled** (to access `packages/shared` and `prisma/schema.prisma`).
- **Framework Preset**: `Other` (the backend `vercel.json` also sets `framework` to `null` so Vercel uses the `/api` serverless function instead of auto-detecting Express).
- **Build Command**: `npm run build` (or leave default to execute `build` in `server/package.json`)
- **Output Directory**: `public` (configured in `server/vercel.json`; it contains a minimal fallback page while API requests are rewritten to the serverless function).
- **Install Command**: `npm install` (default)
- **Node.js Version**: `20.x` (or `22.x`)

Rewrite rules routing incoming API requests to the serverless entry point (`/api/index.ts`) are defined in `server/vercel.json`.

### Backend on Persistent Node Host (Alternative)
Deploy `server` to a Node.js host such as Render, Fly.io, Railway, ECS, or a VPS. Use managed PostgreSQL. Required production variables:

- `DATABASE_URL`
- `CLIENT_URL`
- `SERVER_PORT`
- `NODE_ENV=production`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `COOKIE_SECURE=true`
- payment/image/map provider variables as needed

Run:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run build --workspace server
npm run start --workspace server
```

CORS only allows configured frontend origins in production. Never deploy with demo secrets or public default admin credentials.
