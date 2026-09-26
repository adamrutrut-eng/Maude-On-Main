#!/usr/bin/env node
/**
 * Keeps the landing page in step with the live Shopify store so nothing a
 * visitor clicks leads to a sold-out product or an empty collection.
 *
 *   node scripts/sync-shopify.mjs              # arrivals from the "just-in" collection
 *   node scripts/sync-shopify.mjs bestsellers  # arrivals from another collection
 *
 * It rewrites four marked blocks in index.html:
 *   shopify:arrivals     in-stock products with photos, prices and available sizes
 *   shopify:collections  quick links, only for collections with something in stock
 *   shopify:jewelry      three in-stock jewelry pieces for the collage
 *   shopify:footer       footer shop links, same rule as the quick links
 * and points every store link at STORE. Requires Node 18+ (fetch).
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** The Shopify store's primary domain, used for every link. Change it here and re-run. */
export const STORE = "https://maudeonmain.com";
/** Where product data is read from: STORE when it resolves, otherwise the store's
 *  permanent Shopify address (used until the shop subdomain is live). */
const FALLBACK_ORIGIN = "https://maude-on-main.myshopify.com";
let DATA_ORIGIN = STORE;

const ARRIVALS_COLLECTION = process.argv[2] || "just-in";
const ARRIVALS_LIMIT = Number(process.argv[3]) || 8;

/** Collections shown as the four large tiles. The script warns if one runs dry. */
const TILE_COLLECTIONS = ["just-in", "dress", "frankies-favorites", "jewelry"];
/** Collections offered as quick links, in this order, when they have stock. */
const LINK_COLLECTIONS = ["tops", "bottoms", "jackets-outerwear", "shoes", "mono-b", "date-night", "sale"];
/** Jewelry pieces to prefer for the collage; anything in stock fills the gaps. */
const JEWELRY_PREFERRED = ["kinsley-armelle-necklace", "bold-silver-ring-with-champagne-gemstone", "sterling-silver-ring"];
const LABELS = {
  "just-in": "Just In",
  dress: "Dresses",
  "frankies-favorites": "Frankie’s Favorites",
  jewelry: "Jewelry",
  tops: "Tops",
  bottoms: "Bottoms",
  "jackets-outerwear": "Jackets & Outerwear",
  shoes: "Shoes",
  "mono-b": "Athleisure",
  "date-night": "Date Night",
  sale: "Sale",
};

const here = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(here, "..", "index.html");

const escapeHtml = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const money = (value) => "$" + Number(value).toFixed(2);
const label = (handle, fallback) => LABELS[handle] || fallback || handle;

/** Shopify's image CDN resizes (and converts HEIC) when a width param is present. */
const sized = (src, width) => {
  const clean = src.replace(/([?&])width=\d+&?/, "$1").replace(/[?&]$/, "");
  return clean + (clean.includes("?") ? "&" : "?") + "width=" + width;
};

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(`${response.status} for ${url}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await pause(2000 * attempt);
    }
  }
  throw lastError;
}

/** Collections that could not be read this run. Their blocks and links are left as they were. */
const failures = [];

async function collectionProducts(handle) {
  try {
    const { products = [] } = await fetchJson(`${DATA_ORIGIN}/collections/${handle}/products.json?limit=250`);
    return products;
  } catch (error) {
    console.warn(`Could not read collection "${handle}" (${error.message}); keeping its previous content.`);
    failures.push(handle);
    return null;
  }
}

async function chooseDataOrigin() {
  try {
    const response = await fetch(`${STORE}/collections.json?limit=1`, { headers: { accept: "application/json" } });
    if (response.ok) return STORE;
  } catch (error) {
    /* not live yet */
  }
  console.log(`${STORE} is not serving the store yet; reading from ${FALLBACK_ORIGIN}.`);
  return FALLBACK_ORIGIN;
}

const availableVariants = (product) => product.variants.filter((v) => v.available);
const inStock = (product) => Boolean(product.images && product.images.length && availableVariants(product).length);

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "1X", "2X", "3X", "4X"];
/** Natural size order: lettered sizes first, then numbers ascending, then anything else as-is. */
function sortSizes(values) {
  const rank = (v) => {
    const i = SIZE_ORDER.indexOf(String(v).toUpperCase());
    if (i !== -1) return i;
    const n = parseFloat(v);
    return Number.isFinite(n) ? 100 + n : 1000;
  };
  return [...values].sort((a, b) => rank(a) - rank(b));
}

/** "Sizes S · M · L", "Size 6", "One size", or "" when the product has no size option. */
function sizeLine(product, available) {
  const options = product.options || [];
  const index = options.findIndex((o) => /size|ring/i.test(o.name));
  if (index === -1) {
    return options.length === 1 && /^title$/i.test(options[0].name) ? "One size" : "";
  }
  const key = "option" + (index + 1);
  const values = [...new Set(available.map((v) => v[key]).filter(Boolean))];
  if (!values.length || (values.length === 1 && values[0] === "Default Title")) return "One size";
  return (values.length === 1 ? "Size " : "Sizes ") + sortSizes(values).join(" · ");
}

function priceLine(available) {
  const prices = available.map((v) => Number(v.price));
  const low = Math.min(...prices);
  const varies = prices.some((p) => p !== low);
  const compare = available.map((v) => Number(v.compare_at_price)).filter((n) => n > low);
  const was = compare.length && !varies ? `<s>${money(Math.max(...compare))}</s> ` : "";
  return `${was}${varies ? "From " : ""}${money(low)}`;
}

function productCard(product) {
  const image = product.images[0];
  const available = availableVariants(product);
  const ratio = image.width && image.height ? image.height / image.width : 1.25;
  const sizes = sizeLine(product, available);
  return `          <a class="product" href="${STORE}/products/${product.handle}" data-handle="${escapeHtml(product.handle)}">
            <div class="product__media">
              <img src="${escapeHtml(sized(image.src, 800))}"
                   srcset="${escapeHtml(sized(image.src, 400))} 400w, ${escapeHtml(sized(image.src, 800))} 800w, ${escapeHtml(sized(image.src, 1200))} 1200w"
                   sizes="(min-width: 900px) 25vw, (min-width: 600px) 50vw, 90vw"
                   alt="${escapeHtml(image.alt || product.title)}" width="800" height="${Math.round(800 * ratio)}" loading="lazy" decoding="async">
            </div>
            <h3 class="product__title">${escapeHtml(product.title)}</h3>
            <p class="product__meta"><span class="product__price">${priceLine(available)}</span>${sizes ? `<span class="product__sizes">${escapeHtml(sizes)}</span>` : ""}</p>
          </a>`;
}

function collageItem(product) {
  const image = product.images[0];
  const available = availableVariants(product);
  const low = Math.min(...available.map((v) => Number(v.price)));
  return `          <a class="collage__item" href="${STORE}/products/${product.handle}" aria-label="${escapeHtml(product.title)}, ${money(low)}">
            <img src="${escapeHtml(sized(image.src, 900))}" alt="" width="${image.width || 900}" height="${image.height || 900}" loading="lazy" decoding="async">
          </a>`;
}

function replaceBlock(html, name, body) {
  const start = `<!-- shopify:${name}:start -->`;
  const end = `<!-- shopify:${name}:end -->`;
  const from = html.indexOf(start);
  const to = html.indexOf(end);
  if (from === -1 || to === -1 || to < from) throw new Error(`Missing shopify:${name} markers in index.html`);
  const indent = html.slice(html.lastIndexOf("\n", from) + 1, from);
  return html.slice(0, from + start.length) + "\n" + body + "\n" + indent + html.slice(to);
}

// ---------------------------------------------------------------------------

let html = await readFile(indexPath, "utf8");

// Point every store link at STORE (lets the store domain change in one place).
html = html.replace(
  /https:\/\/(?:www\.)?(?:maudeonmain\.com|maude-on-main\.myshopify\.com|shop\.maudeonmain\.com)(?=\/(?:collections|products|pages|contact|cart|account|search|policies)\b)/g,
  STORE
);

// Stock per collection.
const handles = [...new Set([ARRIVALS_COLLECTION, "jewelry", ...TILE_COLLECTIONS, ...LINK_COLLECTIONS])];
DATA_ORIGIN = await chooseDataOrigin();
const stock = new Map();
for (const handle of handles) {
  stock.set(handle, await collectionProducts(handle));
  await pause(400); // be gentle with the storefront
}
/** In-stock count for a collection, or null when it could not be read this run. */
const availableCount = (handle) => (stock.get(handle) ? stock.get(handle).filter(inStock).length : null);

// Arrivals (left untouched if the collection could not be read).
const arrivals = (stock.get(ARRIVALS_COLLECTION) || []).filter(inStock).slice(0, ARRIVALS_LIMIT);
if (stock.get(ARRIVALS_COLLECTION)) {
  html = replaceBlock(
    html,
    "arrivals",
    arrivals.length
      ? `          <!-- synced from ${STORE}/collections/${ARRIVALS_COLLECTION} -->\n` + arrivals.map(productCard).join("\n")
      : `          <p class="products__empty">New arrivals are landing soon. <a href="${STORE}/collections/all">Shop the full store</a>.</p>`
  );
}

// Quick links: only collections with something to buy (unreadable ones are kept, not hidden).
const linkable = LINK_COLLECTIONS.filter((h) => availableCount(h) !== 0);
const pills = linkable.map((h) => `          <li><a href="${STORE}/collections/${h}">${escapeHtml(label(h))}</a></li>`);
pills.push(`          <li><a href="${STORE}/collections/all">Shop everything</a></li>`);
html = replaceBlock(html, "collections", pills.join("\n"));

// Jewelry collage: preferred pieces first, then anything in stock, three total.
const jewelry = (stock.get("jewelry") || []).filter(inStock);
const byHandle = new Map(jewelry.map((p) => [p.handle, p]));
const picks = JEWELRY_PREFERRED.map((h) => byHandle.get(h)).filter(Boolean);
for (const product of jewelry) {
  if (picks.length >= 3) break;
  if (!picks.includes(product)) picks.push(product);
}
if (stock.get("jewelry") && picks.length) {
  html = replaceBlock(html, "jewelry", picks.slice(0, 3).map(collageItem).join("\n"));
}

// Footer links: tiles first, then in-stock quick links, then everything.
const footer = [...TILE_COLLECTIONS.filter((h) => availableCount(h) !== 0), ...linkable]
  .map((h) => `          <li><a href="${STORE}/collections/${h}">${escapeHtml(label(h))}</a></li>`);
footer.push(`          <li><a href="${STORE}/collections/all">All products</a></li>`);
html = replaceBlock(html, "footer", footer.join("\n"));

await writeFile(indexPath, html);

// Report.
console.log(`Arrivals: ${arrivals.length} in-stock product(s) from "${ARRIVALS_COLLECTION}".`);
console.log(`Quick links: ${linkable.map(label).join(", ") || "none"}.`);
console.log(`Jewelry collage: ${picks.slice(0, 3).map((p) => p.title).join(" | ")}.`);
for (const handle of TILE_COLLECTIONS) {
  const count = availableCount(handle);
  if (count === null) continue;
  if (count === 0) console.warn(`WARNING: tile collection "${handle}" has nothing in stock. Swap that tile in index.html.`);
  else console.log(`Tile "${label(handle)}": ${count} in stock.`);
}
for (const handle of LINK_COLLECTIONS) {
  if (availableCount(handle) === 0) console.log(`Hidden (nothing in stock): ${label(handle)}.`);
}
if (failures.length) {
  console.error(`Sync incomplete: could not read ${failures.join(", ")}. Nothing from those collections was changed.`);
  process.exitCode = 1;
}
