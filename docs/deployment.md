# Deployment

## Frontend on Vercel

Set the project root to `client` or configure Vercel to build the workspace command:

```bash
npm install
npm run build --workspace client
```

Set:

```bash
VITE_API_URL=https://api.your-domain.com/api/v1
```

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
