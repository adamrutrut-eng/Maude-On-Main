# Maude on Main — landing page

A redesigned, single-page landing site for [Maude on Main](https://maudeonmain.com/), a women's
boutique at 412 Main Street in Historic Downtown Van Buren, Arkansas.

The page is plain HTML, CSS and JavaScript with no build step. Every "shop" link points at the
boutique's existing Shopify store, so pricing, sizes, availability and checkout stay exactly where
they are today.

## What's on the page

| Section | Notes |
| --- | --- |
| Hero | Full-bleed looping video generated with Higgsfield (Seedance 2.5) from a prompt written around the logo's dusty-rose and ivory palette. Muted, autoplays, has a play/pause control, and falls back to a poster image when autoplay is blocked or the visitor prefers reduced motion. |
| Shop by collection | Four tiles (Just In, Dresses, Bestsellers, Jewelry) using the store's own photography, plus quick links to every other collection. |
| New this season | Eight in-stock products pulled from the store's "Just In" collection. Refresh them any time with the sync script below. |
| Jewelry & gifts, Our story, Visit | Store copy, brands carried, address, hours, map and directions. The still life in "Our story" was generated with Higgsfield (GPT Image) to match the logo palette; every product photo is the store's own. |
| Newsletter | Posts to the Shopify customer form, so subscribers land in the store's customer list. |

## Deploying on Netlify and pointing the domain

1. Create a new site from this GitHub repository.
2. Leave the build command empty and set the publish directory to `.` (both are already declared in
   `netlify.toml`).
3. Deploy. Netlify serves the repository root as-is.

`maudeonmain.com` is currently the Shopify store itself, so the store moves to
`shop.maudeonmain.com` and the landing page takes over the main domain. The step-by-step DNS and
Shopify changes, in the order that keeps everything online, are in
[docs/DOMAIN-SETUP.md](docs/DOMAIN-SETUP.md). `netlify.toml` permanently redirects every old
storefront URL (`/products/*`, `/collections/*`, `/cart`, and so on) to the store's new address, so
links shared before the move keep working.

## Keeping inventory honest

Nothing on the page should lead a shopper to a sold-out product or an empty collection. Three
layers keep it that way:

1. **The sync script** reads the store's public product JSON and rewrites four blocks in
   `index.html`: the product cards (in-stock items only, with price, sale price and the sizes
   actually left), the collection quick links and footer links (only collections with something to
   buy), and the jewelry collage (three in-stock pieces, each linked to its product). It also points
   every store link at the `STORE` domain set at the top of the script, and warns if one of the four
   large tiles has nothing in stock.

   ```bash
   node scripts/sync-shopify.mjs            # arrivals from the "just-in" collection (default)
   node scripts/sync-shopify.mjs bestsellers 8
   ```

2. **A scheduled GitHub Action** (`.github/workflows/sync-shopify.yml`) runs that script every six
   hours on the default branch and commits when anything changed, which makes Netlify redeploy.
   It can also be run on demand from the Actions tab.

3. **A live check in the browser.** On Netlify, `/shopify/*` proxies the store's JSON same-origin
   (Shopify sends no CORS headers), so `js/main.js` re-checks each card on page load and marks
   anything that sold out since the last sync, and refreshes the sizes and price. Anywhere else the
   request fails quietly and the cards stay as the last sync left them.

### Store housekeeping worth doing in Shopify

- The **Bestsellers**, **Coming Soon** and **Jackets + Outerwear** collections are empty and
  **Shoes** and **Athleisure** are entirely sold out, so the page hides them. Either restock them or
  turn them into automated collections with the condition *Inventory stock is greater than 0*.
- The Haptics cardigan has the placeholder handle `untitled-mar16_18-49`; renaming its URL handle in
  the product's SEO settings gives it a readable link.

## Replacing the hero video

Drop new files over `assets/video/hero.mp4`, `assets/video/hero.webm` and `assets/video/hero-poster.jpg`.
Keep the video short (6 to 12 seconds), muted and 16:9. The page ships an MP4 (H.264) for every browser
and a WebM (VP9) for browsers that prefer it.

## Local preview

```bash
python3 -m http.server 4173
# then open http://localhost:4173
```
