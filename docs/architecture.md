# Etukas Architecture

Etukas is organized as an npm-workspace monorepo with three deployable or reusable areas:

- `client`: React, TypeScript, Vite, Tailwind, React Router, TanStack Query, React Hook Form, Zod, and Lucide icons.
- `server`: Express REST API with TypeScript, Prisma, JWT access tokens, HttpOnly refresh cookies, RBAC middleware, CSRF protection, rate limiting, and structured HTTP logging.
- `packages/shared`: Zod schemas and API types that are safe to share between client and server.

The MVP focuses on materials marketplace flows: public discovery, authentication, carts, checkout, orders, seller inventory and orders, and admin seller approval. Rentals, real estate, and design/professional modules have reserved frontend routes and server module directories for future implementation.

## Security Model

- Short-lived JWT access tokens are sent in `Authorization` headers.
- Refresh tokens are stored in secure HttpOnly SameSite cookies and hashed in the database.
- State-changing cookie-authenticated requests require a double-submit CSRF token.
- Sensitive endpoints use rate limiting.
- Every protected route checks authentication, and seller/admin routes also enforce roles.
- Seller routes verify resource ownership through seller profile and store relationships.
- Order totals, taxes, discounts, and stock reservation are recalculated on the server.

## External Services

Image storage, map providers, and payments are abstracted by configuration. The current implementation stores image URLs and supports COD plus a development mock payment record. Razorpay/S3/Cloudinary credentials are intentionally not hardcoded.
