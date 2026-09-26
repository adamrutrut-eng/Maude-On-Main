# Putting the landing page on maudeonmain.com

Same setup as Cash Hard Club: the landing page owns the domain, and the store lives on the
platform's own address. For Shopify that address is **maude-on-main.myshopify.com** (the
equivalent of a Square store's `.square.site` address). Every link on the page already goes there,
so nothing in the code changes on switch day.

Three steps, in this order. Nothing goes offline in between.

## 1. Shopify: let go of the domain

Shopify admin → **Settings → Domains** → click `maudeonmain.com` → **Remove**. Do the same for
`www.maudeonmain.com` if it is listed. The store carries on at `maude-on-main.myshopify.com`, and
Shopify stops bouncing that address to `maudeonmain.com`.

## 2. GoDaddy: two DNS records

DNS for the domain is managed at GoDaddy (nameservers `ns07`/`ns08.domaincontrol.com`).
Whoever has that login changes two records and deletes one:

| Record | Today | Change to |
| --- | --- | --- |
| `@` A | `23.227.38.65` (Shopify) | the address Netlify shows under Domain management (`75.2.60.5` at the time of writing) |
| `@` AAAA | `2620:127:f00f:e::` (Shopify) | **delete** |
| `www` CNAME | `shops.myshopify.com` | `<your-site-name>.netlify.app` |

Leave every MX and TXT record alone. They carry the shop's Microsoft 365 email.

## 3. Netlify: claim the domain

Netlify → your site → **Domain management → Add a domain** → `maudeonmain.com`, then add
`www.maudeonmain.com` and set `maudeonmain.com` as primary. Netlify issues the HTTPS certificate
itself once the DNS change has spread (minutes to a few hours).

## What happens to old links

`netlify.toml` permanently redirects the storefront paths that used to live on `maudeonmain.com`
(`/products/*`, `/collections/*`, `/cart`, `/checkout`, `/account`, `/search`, `/pages/*`,
`/policies/*`) to the same path on `maude-on-main.myshopify.com`. Links in old Instagram posts
and Google results keep opening the right product.
