# API

Base path: `/api/v1`

Responses use:

```json
{ "ok": true, "data": {} }
```

or:

```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Invalid request data" } }
```

## Implemented Endpoints

- `GET /health`
- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/categories`
- `GET /api/v1/products`
- `GET /api/v1/products/:id`
- `GET /api/v1/stores`
- `GET /api/v1/stores/nearby`
- `GET /api/v1/stores/:id`
- `GET /api/v1/search`
- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PATCH /api/v1/cart/items/:id`
- `DELETE /api/v1/cart/items/:id`
- `POST /api/v1/orders`
- `GET /api/v1/orders`
- `GET /api/v1/orders/:id`
- `GET /api/v1/seller/dashboard`
- `GET /api/v1/seller/products`
- `POST /api/v1/seller/products`
- `PATCH /api/v1/seller/products/:id`
- `GET /api/v1/seller/orders`
- `PATCH /api/v1/seller/orders/:id/status`
- `GET /api/v1/seller/inventory`
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/sellers`
- `PATCH /api/v1/admin/sellers/:id/status`

Protected endpoints require a bearer access token. Cookie-backed state changes also require `x-csrf-token`.
