# Pointing maudeonmain.com at the new site (optional, for later)

**Nothing here is needed to launch.** The site runs on Netlify's own address (`something.netlify.app`)
with the Shopify store completely untouched, and every link on the page goes to the store as it is
today. Only follow this page if, one day, `maudeonmain.com` itself should show the new landing page.
That needs whoever controls the domain's DNS (GoDaddy, per the nameservers below).

`maudeonmain.com` currently *is* the Shopify store, so the domain can't simply be repointed:
a domain resolves to one host, and if it moves to Netlify the store has to live somewhere else.
The plan below moves the store to **shop.maudeonmain.com**, puts the landing page on
**maudeonmain.com**, and keeps every old product link working.

## What exists today (checked 2026-09-26)

| Record | Value | Meaning |
| --- | --- | --- |
| Nameservers | `ns07.domaincontrol.com`, `ns08.domaincontrol.com` | DNS is managed in **GoDaddy** |
| `@` A | `23.227.38.65` | Shopify |
| `@` AAAA | `2620:127:f00f:e::` | Shopify |
| `www` CNAME | `shops.myshopify.com` | Shopify |
| MX | `maudeonmain-com.mail.protection.outlook.com` | Microsoft 365 email. **Do not touch.** |
| TXT | `v=spf1 include:secureserver.net -all`, `NETORGFT…onmicrosoft.com` | Email authentication. **Do not touch.** |

Store details: the Shopify store's permanent address is `maude-on-main.myshopify.com`.

## Order of operations

Do these in order. Each step is safe on its own, and nothing goes dark in between.

### 1. Give the store its new address (Shopify + GoDaddy)

1. Shopify admin → **Settings → Domains → Connect existing domain** → enter `shop.maudeonmain.com`.
2. Shopify asks for one DNS record. In GoDaddy → **DNS → Add record**:
   `CNAME` · name `shop` · value `shops.myshopify.com` · TTL 1 hour.
3. Back in Shopify, click **Verify connection**, then **Change primary domain** → `shop.maudeonmain.com`.
   Shopify issues its SSL certificate for the subdomain automatically (allow up to an hour).
4. Confirm `https://shop.maudeonmain.com` loads the store and checkout works.

Why first: from this point Shopify redirects `maudeonmain.com` to `shop.maudeonmain.com` itself,
so the store keeps working no matter when the next steps happen.

### 2. Deploy the landing page (Netlify)

1. Netlify → **Add new site → Import an existing project → GitHub** → `adamrutrut-eng/Maude-On-Main`.
2. Branch: `main` (after merging) or `claude/laughing-ptolemy-ce5oe4`. Build command: leave empty.
   Publish directory: `.` (already in `netlify.toml`).
3. Deploy, then open the `*.netlify.app` URL and click a few products: they must open on
   `shop.maudeonmain.com`. Note the site name; step 3 needs it.

### 3. Point the domain at Netlify (Netlify + GoDaddy)

1. Netlify → **Domain management → Add a domain** → `maudeonmain.com`. Add `www.maudeonmain.com` too
   and set `maudeonmain.com` as the primary domain (Netlify then redirects `www` to it).
2. Netlify shows the records it needs. In GoDaddy → **DNS**:
   - `@` **A** record: change `23.227.38.65` → the address Netlify displays
     (Netlify's load balancer, `75.2.60.5` at the time of writing).
   - `@` **AAAA** record (`2620:127:f00f:e::`): **delete** it. That address is Shopify's; if it stays,
     IPv6 visitors keep landing on Shopify.
   - `www` **CNAME**: change `shops.myshopify.com` → `<your-site-name>.netlify.app`.
   - Leave `shop`, MX and TXT records exactly as they are.
3. Wait for DNS to propagate (minutes to a few hours). Netlify provisions the HTTPS certificate on its
   own once it sees the records; check **Domain management → HTTPS**.

### 4. Tidy up (Shopify)

Shopify admin → **Settings → Domains** → remove `maudeonmain.com` and `www.maudeonmain.com`.
They no longer point at Shopify and would otherwise show a "not connected" warning forever.
`shop.maudeonmain.com` stays as the primary domain.

### 5. Tell Google and the socials

- Google Business Profile: keep `maudeonmain.com` as the website (it is now the landing page).
- Google Search Console: add `shop.maudeonmain.com` as a property so product pages keep being indexed.
- Instagram and Facebook bios can stay on `maudeonmain.com`.

## Code changes to make on that day

1. In `scripts/sync-shopify.mjs` set `STORE` to `https://shop.maudeonmain.com`, then run
   `node scripts/sync-shopify.mjs` (it rewrites every store link in `index.html`).
2. In `netlify.toml` change the `/shopify/*` proxy target to `https://shop.maudeonmain.com/:splat`
   and add these rules, so storefront links that used to live on `maudeonmain.com` (old Instagram
   posts, Google results, saved links) keep opening the right product:

   ```toml
   [[redirects]]
     from = "/products/*"
     to = "https://shop.maudeonmain.com/products/:splat"
     status = 301
     force = true
   ```

   Repeat the same block for `/collections/*`, `/pages/*`, `/blogs/*`, `/policies/*`, `/cart*`,
   `/account*`, `/checkout*` and `/search*`.

`shop.` is the convention, but any subdomain works (`store.`, `boutique.`); use the same name everywhere.
