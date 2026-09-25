#!/usr/bin/env node
/**
 * Refresh the "New this season" product cards in index.html from the live
 * Shopify store, so prices and availability on the landing page match the
 * boutique's online store without touching the page by hand.
 *
 *   node scripts/sync-shopify.mjs            # pulls the "just-in" collection
 *   node scripts/sync-shopify.mjs bestsellers
 *
 * Only in-stock products with photos are shown. Requires Node 18+ (fetch).
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const STORE = "https://maudeonmain.com";
const COLLECTION = process.argv[2] || "just-in";
const LIMIT = Number(process.argv[3]) || 8;
const START = "<!-- shopify:arrivals:start -->";
const END = "<!-- shopify:arrivals:end -->";

const here = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(here, "..", "index.html");

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const money = (value) => "$" + Number(value).toFixed(2);

/** Shopify's image CDN resizes (and converts HEIC) when a width param is present. */
const sized = (src, width) => {
  const clean = src.replace(/([?&])width=\d+&?/, "$1").replace(/[?&]$/, "");
  return clean + (clean.includes("?") ? "&" : "?") + "width=" + width;
};

const response = await fetch(`${STORE}/collections/${COLLECTION}/products.json?limit=50`, {
  headers: { accept: "application/json" },
});
if (!response.ok) {
  console.error(`Shopify responded ${response.status} for collection "${COLLECTION}".`);
  process.exit(1);
}
const { products = [] } = await response.json();

const inStock = products
  .filter((p) => p.images && p.images.length && p.variants.some((v) => v.available))
  .slice(0, LIMIT);

const cards = inStock.map((p) => {
  const image = p.images[0];
  const ratio = image.width && image.height ? image.height / image.width : 1.25;
  const available = p.variants.filter((v) => v.available);
  const price = Math.min(...available.map((v) => Number(v.price)));
  const compare = available
    .map((v) => Number(v.compare_at_price))
    .filter((n) => n > price);
  const wasPrice = compare.length ? Math.max(...compare) : null;
  const url = `${STORE}/products/${p.handle}`;
  const alt = escapeHtml(image.alt || p.title);

  return `          <a class="product" href="${url}">
            <div class="product__media">
              <img src="${escapeHtml(sized(image.src, 800))}"
                   srcset="${escapeHtml(sized(image.src, 400))} 400w, ${escapeHtml(sized(image.src, 800))} 800w, ${escapeHtml(sized(image.src, 1200))} 1200w"
                   sizes="(min-width: 900px) 25vw, (min-width: 600px) 50vw, 90vw"
                   alt="${alt}" width="800" height="${Math.round(800 * ratio)}" loading="lazy" decoding="async">
            </div>
            <h3 class="product__title">${escapeHtml(p.title)}</h3>
            <p class="product__price">${wasPrice ? `<s>${money(wasPrice)}</s>` : ""}${money(price)}</p>
          </a>`;
});

const block = cards.length
  ? cards.join("\n")
  : `          <p class="products__empty">New arrivals are landing soon. <a href="${STORE}/collections/all">Shop the full store</a>.</p>`;

const html = await readFile(indexPath, "utf8");
const start = html.indexOf(START);
const end = html.indexOf(END);
if (start === -1 || end === -1 || end < start) {
  console.error("Could not find the arrivals markers in index.html.");
  process.exit(1);
}

const stamp = `<!-- synced from ${STORE}/collections/${COLLECTION} on ${new Date().toISOString().slice(0, 10)} -->`;
const next =
  html.slice(0, start + START.length) +
  "\n          " + stamp + "\n" +
  block + "\n          " +
  html.slice(end);

await writeFile(indexPath, next);
console.log(`Wrote ${cards.length} product card(s) from "${COLLECTION}" into index.html.`);
