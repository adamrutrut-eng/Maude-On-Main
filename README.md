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

## Deploying on Netlify

1. Create a new site from this GitHub repository.
2. Leave the build command empty and set the publish directory to `.` (both are already declared in
   `netlify.toml`).
3. Deploy. Netlify serves the repository root as-is.

Once the site has its final domain, set the `og:image` meta tag in `index.html` to the absolute URL of
`assets/img/og-image.jpg` so link previews on Facebook and Instagram pick it up.

## Keeping products fresh

```bash
node scripts/sync-shopify.mjs            # pulls the "just-in" collection (default)
node scripts/sync-shopify.mjs bestsellers 8
```

The script reads the store's public `products.json`, keeps only in-stock products that have photos,
and rewrites the product cards between the `shopify:arrivals` markers in `index.html`. Commit the
result and Netlify redeploys. Requires Node 18 or newer.

## Replacing the hero video

Drop new files over `assets/video/hero.mp4`, `assets/video/hero.webm` and `assets/video/hero-poster.jpg`.
Keep the video short (6 to 12 seconds), muted and 16:9. The page ships an MP4 (H.264) for every browser
and a WebM (VP9) for browsers that prefer it.

## Local preview

```bash
python3 -m http.server 4173
# then open http://localhost:4173
```
