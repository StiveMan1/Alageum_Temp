# Editorial Page delivery

This slice was reimplemented from visible requirements and verified repository content after unpublished files were lost. It is not an exact restoration, and earlier test results do not establish this checkout's correctness.

`/pages/[locale]/[slug]` is a controlled text template, separate from the rich `/company` page. It adds no replacement navigation. Supported locale codes are exactly `ru`, `kk`, `en`, `zh`, and `uz`, with no fallback or fabricated translations. The article carries its content language; the shared existing shell remains Russian.

The server-only loader calls `GET {API_INTERNAL_BASE_URL}/pages/{slug}?locale={locale}`. `API_INTERNAL_BASE_URL` must explicitly end in `/api/v1`, without credentials, query or fragment. Requests omit auth and cookies, use `cache: no-store` and `redirect: error`, time out after five seconds, and stream at most 512 KiB of JSON. Only a 404 becomes `notFound()`; invalid route parameters are absent without an API request. Other errors remain errors and never select bundled content. Payloads require matching slug/locale, published timestamps, exact public fields and bounded valid native Blocks.

React escapes all text. The template owns the only h1; body h1 Blocks render as h2. Paragraphs, headings, native lists, quotes, code, inline marks and safe HTTP(S), mail, phone, root-relative and anchor links are supported. Raw HTML, media, unknown fields/types, unsafe links and malformed nesting fail closed. The renderer fetches no media. Limits are 200 top-level blocks, 200 children per node, depth 8, 2,000 nodes and 100,000 text characters.

Metadata is explicitly `noindex, nofollow`. An own-route canonical is emitted only when `PAGES_SITE_ORIGIN` explicitly identifies the deployment origin; it is otherwise omitted. No official production origin or translated alternates are inferred.

Existing routes, the homepage and their loading boundary now live under the URL-transparent `(site)` group. Editorial routes remain outside that group, with no ancestral loading boundary that could stream 200 before the missing-page/error decision. The single root layout, shared providers, global error/not-found UI, robots and CSS stay in place. Existing URLs and root-shell code remain unchanged. Only four moved pages need relative shared-CSS import adjustments.

The live route has no fixed static parameters. `scripts/build-preview.mjs` adds `generateStaticParams` and `dynamicParams = false` only to its disposable staging copy and sets `PAGES_SOURCE=static` plus `PAGES_STATIC_PREVIEW=1`. This exports exactly `/pages/ru/about` from verbatim verified company text. `lib/public/pagesPreview.js` records the grouped source path, official source URL and review date; its dates are fixture provenance rather than CMS publication evidence.

Verification must be rerun on this reimplementation: focused/full frontend unit tests, lint, normal and static-preview builds, real HTTP hard-404/hard-500 checks, and browser checks when the environment permits them. No earlier verification is claimed for this new checkout.
