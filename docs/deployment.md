# Deployment

## Frontend on Vercel

The monorepo includes a `vercel.json` at the root configured for fast client builds.

### Option A: Monorepo Root Deployment (Recommended)
- **Root Directory**: Leave as `./` (default)
- **Framework Preset**: `Other` or `Vite`
- **Build Command**: `npm run build:client` (automatically handled by `vercel.json`)
- **Output Directory**: `client/dist` (automatically handled by `vercel.json`)
- **Install Command**: `npm install` (default)

### Option B: Client Subdirectory Deployment
If configuring Vercel with **Root Directory** set to `client`:
- **Root Directory**: `client`
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- SPA rewrites are automatically handled by `client/vercel.json`.

### Environment Variables on Vercel
Set the following in the Vercel Project Settings under **Environment Variables**:
- `VITE_API_URL`: URL of your deployed backend REST API (e.g., `https://api.your-domain.com/api/v1`)
- `VITE_MAP_PROVIDER`: (Optional) `manual`, `google`, or `osm` (defaults to `manual`)
- `VITE_MAP_PROVIDER_API_KEY`: (Optional) Your map provider API key if using Google Maps

## Backend

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
