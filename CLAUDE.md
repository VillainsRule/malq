# malq

Temp-mail aggregator. Each provider scrapes one disposable-mail site behind a common interface.

## Adding a provider

ALWAYS READ EXAMPLE PROVIDERS FIRST:
- src/providers/impl/anonymmail.net.ts
- src/providers/impl/cheapluxurymail.xyz.ts
- src/providers/impl/gomax2025.com.ts
- src/providers/impl/tempmail.io.vn.ts

Create `src/providers/impl/<site.tld>.ts` exporting a default class implementing `ProviderImpl`
(`src/providers/Provider.ts`). Nothing registers it — `src/main.ts` autoloads every `.ts` in
`impl/` and its subdirs, keyed by filename. Files/dirs containing `_` are skipped, so shared
base classes are named `_constructor.ts`.

Conventions:

- Class name is the filename with dots as `$`: `email-fake.com.ts` -> `class email$fake$com`.
- Instance state is `$`-prefixed (`$token`, `$cookie`); `bodies: Record<string, string>` caches
  mail bodies by id.
- `getDomains()` returns usable domains only — drop VIP/premium, IDN, and login-gated ones.
- `createInbox(address)` does session setup (cookies, CSRF/API tokens). Many sites need nothing (if so, `void 0;`)
- `getMail(address)` lists mail, then fetches each missing body and caches it in `bodies`.

Helpers:

- `fish` (`@/util/util`) — `fetch` wrapper that honors `PROXY`. Default choice.
- `wafFetch` (`@/util/waf/fetch`) — raw HTTP/2 with a full Chrome header set, for Cloudflare/WAF
  sites that have low protection requirements. Returns `cookies` and **sync** `text()`/`json()`.
- `CookieJar` (`@/util/CookieJar`) — feed it `getSetCookie()` / `res.cookies`, read `getCookie()`.
  Dedupes by name, last write wins. Use it whenever more than one response sets cookies.
- `toEST(ms, utcOffset)` (`@/util/util`) — normalize timestamps. `date` on `Mail` is EST-based.
- `node-html-parser` for HTML; prefer regex only for values embedded in `<script>`.

Work through errors with providers - if I ask you to add them, they work.

## Testing

- `bun inbox <filename-without-.ts>` creates an address, sends it a real email via Resend, and
polls forever — watch the output and kill it yourself. It warns if `date` is off by hours.
- `bun run check` typechecks.

## Debugging a broken provider

These sites break constantly. Work from `curl` first:

- `curl -sD- -o /dev/null <url>` with **manual** redirects. Auto-following redirects is the single
  most common bug source: `getSetCookie()` then returns only the final hop's cookies, and sites
  hand out a fresh random session there.
- `curl -c jar -b jar` to confirm a flow works with real cookie continuity before blaming parsing.
- Grep inline `<script>` for the endpoints and tokens the page actually uses — most of these sites
  are server-rendered, so selectors and poll intervals are right there in the source.

## Remember

- Sites CAN be scrapped. Reasons for discard include: ratelimit fetching mail, session reliant on IP address, ANY captchas that you cannot avoid (including PoW)
- This file is a work in progress. If you find additional things to add, go ahead and do so (keep it short!)
- If you have big questions, ask! (Small questions are something you should be able to figure out by reading other providers.)