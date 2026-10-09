# Database Design

The Prisma schema models a normalized marketplace:

- `User`, `CustomerProfile`, `SellerProfile`, and `SellerVerificationDocument` represent identities and onboarding.
- `Store`, `Category`, `Product`, `ProductImage`, and `StoreProduct` represent catalog data. One product may be sold by many stores, and each store controls its price, stock, MOQ, tax rate, and delivery ETA.
- `Cart` and `CartItem` enforce unique cart listings.
- `Order`, `OrderItem`, and `Payment` snapshot historical prices and payment state.
- `InventoryMovement` records stock changes and reservation events.
- `Review`, `Wishlist`, `Notification`, and `AuditLog` support customer and admin workflows.

Money is stored in integer minor units, defaulting to INR. Financial calculations must stay server-side. Order creation uses a transaction and conditional stock decrement to prevent negative inventory under concurrent checkouts.

Run migrations with:

```bash
npm run db:migrate
```

Generate Prisma Client with:

```bash
npm run db:generate
```
