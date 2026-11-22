import type { IncomingMessage, ServerResponse } from "node:http";

const SITE_ORIGIN = "https://www.etukas.com";
const FALLBACK_IMAGE = `${SITE_ORIGIN}/etukas-logo.png`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeApiBase(rawUrl?: string): string {
  const trimmed = (rawUrl ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (trimmed.endsWith("/api/v1")) return trimmed;
  if (trimmed.endsWith("/api")) return `${trimmed}/v1`;
  return `${trimmed}/api/v1`;
}

function resolveProductImage(
  image: { id?: string; productId?: string; url?: string } | undefined,
  productId: string | undefined,
  apiBase: string
): string {
  if (!image) return FALLBACK_IMAGE;
  const rawUrl = (image.url || "").trim();
  if (rawUrl) {
    if (rawUrl.startsWith("https://") || rawUrl.startsWith("http://")) {
      return rawUrl;
    }
    if (apiBase && rawUrl.startsWith("/api/v1")) {
      return `${apiBase}${rawUrl.slice("/api/v1".length)}`;
    }
    if (apiBase && rawUrl.startsWith("/api")) {
      return `${apiBase}${rawUrl.slice("/api".length)}`;
    }
    if (rawUrl.startsWith("/")) {
      return `${SITE_ORIGIN}${rawUrl}`;
    }
  }
  const pid = productId || image.productId;
  if (apiBase && image.id && pid) {
    return `${apiBase}/products/${encodeURIComponent(pid)}/images/${encodeURIComponent(image.id)}`;
  }
  return FALLBACK_IMAGE;
}

function formatInr(minor?: number): string {
  if (typeof minor !== "number" || !Number.isFinite(minor)) return "";
  return `₹${(minor / 100).toLocaleString("en-IN")}`;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "www.etukas.com";
  const proto = req.headers["x-forwarded-proto"] || "https";
  const origin = `${proto}://${host}`;

  const parsedUrl = new URL(req.url || "/", origin);
  const id = parsedUrl.searchParams.get("id")?.trim() || "";
  const canonicalUrl = id ? `${origin}/product/${encodeURIComponent(id)}` : origin;

  let title = "Etukas.com | Building Materials Marketplace";
  let description = "Explore verified building materials with live local yard prices on Etukas.";
  let imageUrl = FALLBACK_IMAGE;

  const apiBase = normalizeApiBase(process.env.VITE_API_URL || process.env.API_URL);

  if (id && apiBase) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const response = await fetch(`${apiBase}/products/${encodeURIComponent(id)}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (response.ok) {
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: {
            priceMinor?: number;
            store?: { name?: string; city?: string };
            product?: {
              id?: string;
              name?: string;
              description?: string;
              unit?: string;
              images?: Array<{ id?: string; productId?: string; url?: string }>;
            };
          };
        };

        const listing = payload?.data;
        if (payload?.ok && listing?.product?.name) {
          const priceStr = formatInr(listing.priceMinor);
          const unitStr = listing.product.unit ? `/${listing.product.unit}` : "";
          title = priceStr
            ? `${listing.product.name} — ${priceStr}${unitStr} | Etukas`
            : `${listing.product.name} | Etukas`;

          const storePart = listing.store?.name
            ? `From ${listing.store.name}${listing.store.city ? ` (${listing.store.city})` : ""}. `
            : "";
          const descBody =
            listing.product.description && listing.product.description !== listing.product.name
              ? listing.product.description
              : `Order ${listing.product.name} directly from verified local suppliers on Etukas.`;
          description = `${storePart}${descBody}`.slice(0, 220);

          imageUrl = resolveProductImage(
            listing.product.images?.[0],
            listing.product.id,
            apiBase
          );
        }
      }
    } catch {
      // Fallback to default Etukas metadata if backend is unreachable
    }
  }

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="Etukas.com" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:width" content="640" />
    <meta property="og:image:height" content="640" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" />
    <p><a href="${escapeHtml(canonicalUrl)}">View product on Etukas</a></p>
  </body>
</html>`;

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Cache on Vercel Edge CDN for 5 min (and stale-while-revalidate 1 hr) to stay Vercel Free-friendly
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  res.end(html);
}
