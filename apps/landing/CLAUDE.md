# Landing Page – `apps/landing`

Next.js 15, React 19, static export (`output: 'export'`). Marketing site for Pointly. Bilingual (EN/AR) with RTL support. No server-side logic — pure static HTML/CSS/JS.

## Commands

```bash
pnpm dev              # next dev on port 3002
pnpm build            # next build → exports to /out (static files)
pnpm type-check       # tsc --noEmit
pnpm lint             # biome check

# From monorepo root
pnpm dev:landing      # turbo run dev --filter=@pointly/landing
```

## Directory Structure

```
src/
  app/
    page.tsx          # Home — all major sections stitched together
    layout.tsx        # Root layout — fonts, RTL init script, metadata
    globals.css       # Tailwind entry — @imports all style modules
    blog/page.tsx     # Blog listing (static placeholder)
    careers/page.tsx  # Careers (static)
    contact/page.tsx  # Contact (static)
    help/page.tsx     # Help (static)
    privacy/page.tsx  # Privacy policy
    terms/page.tsx    # Terms of service
  components/
    Navbar.tsx          # Sticky nav with language toggle + CTA
    Hero.tsx            # Above-fold: headline, animated card, CTA
    StatsBar.tsx        # Key numbers strip
    Features.tsx        # Feature grid
    NetworkSection.tsx  # Merchant network explainer
    TiersSection.tsx    # Bronze/Gold/Platinum/Diamond table
    PricingSection.tsx  # Pricing plans + signup modal trigger (non-Enterprise plans open SignupModal)
    SignupModal.tsx     # 2-step signup form (business info → contact info) → Moyasar payment redirect
    AboutSection.tsx    # Company/mission blurb
    CTASection.tsx      # Final call-to-action
    Footer.tsx          # Links, legal, social
    PageShell.tsx       # Shared shell for inner pages (blog, careers, etc.)
    ScrollReveal.tsx    # Intersection observer scroll animation wrapper
  i18n/
    translations.ts     # All en/ar strings — no external i18n package
  styles/
    tokens.css          # @theme {} brand tokens (teal, navy, fonts)
    animations.css      # Keyframe + scroll animation utilities
    base.css            # Reset + base body styles
    shared.css          # Reusable utility classes
    navbar.css          # Navbar-specific styles
    hero.css            # Hero-specific styles
    stats.css, features.css, network.css, tiers.css,
    pricing.css, about.css, cta.css, footer.css,
    inner.css           # Per-section style modules
    signup-modal.css    # .modal-overlay, .modal-card, .modal-step-dots, .modal-input, .modal-btn-primary
```

## CSS Architecture

- **Tailwind CSS v4** — no `tailwind.config.js`
- `globals.css` is the single entry: it `@import`s tailwind then all style modules
- `styles/tokens.css` defines brand tokens in `@theme {}`:
  - `--color-teal: #08b0a2` (primary)
  - `--color-teal-dark: #07a093`
  - `--color-navy: #1e2d4a`
  - `--color-navy-dark: #141e33`
  - `--font-sans: "Plus Jakarta Sans"` (English)
  - `--font-arabic: "IBM Plex Sans Arabic"` (Arabic)
- Component-specific CSS lives in its own file in `styles/` — not scoped modules, just conventional co-location
- **Never add styles inline or in `globals.css` directly** — always add a new import to the appropriate `styles/*.css` file

## i18n & RTL

No external i18n library. Custom hook pattern:

```ts
// src/i18n/translations.ts
export type Locale = 'en' | 'ar';
export const translations = { en: { ... }, ar: { ... } };

// Usage in components — read locale from state/localStorage:
const t = translations[locale];
```

- Default locale: `'ar'`
- Language stored in `localStorage` key `pointly-language`
- RTL toggle: set `document.documentElement.dir = isAr ? 'rtl' : 'ltr'`
- Inline script in `layout.tsx` sets dir before hydration to prevent flash
- `<LanguageToggle />` from `@pointly/ui` handles the toggle UI
- `useRTL()` from `@pointly/ui` provides `{ isRTL, textStart, textEnd, flexRow }`

## Static Export

- `output: 'export'` in `next.config.js` → produces `/out` directory
- No `getServerSideProps`, no API routes, no middleware
- All content is hardcoded/static — no API calls
- Images use `<img>` tags directly (Next.js `<Image>` requires a server for optimisation)
- Deployed to S3 + CloudFront via Terraform `modules/landing`

## Key Components

### `ScrollReveal.tsx`
Wraps sections in an `IntersectionObserver`. Children gain a CSS class when they enter the viewport, triggering entrance animations defined in `styles/animations.css`.

### `TiersSection.tsx`
Shows the Bronze/Gold/Platinum/Diamond table. Tier data is hardcoded here (mirrors `@pointly/shared` — keep in sync if thresholds change).

### `PricingSection.tsx`
Pricing cards. Non-Enterprise plans open `SignupModal` on click (state: `modalOpen`, `selectedPlan`). Enterprise plan links to contact. Reads `NEXT_PUBLIC_API_URL` from env for the modal's API calls.

### `SignupModal.tsx`
2-step signup form. Step 1: `businessName` + `contactName`. Step 2: `email` + `phone`. On submit: `POST ${apiUrl}/v1/merchants/initiate-signup` → `window.location.href = data.paymentUrl` (Moyasar hosted page). `callbackUrl` is set to `${dashboardUrl}/signup-complete`. No password field — server generates a temp password; merchant sets their real password on first login via `NEW_PASSWORD_REQUIRED` flow.

### `PageShell.tsx`
Used by inner pages (blog, careers, contact, help). Renders Navbar + Footer + content slot + RTL-aware padding.

## Fonts

Loaded via Google Fonts in `layout.tsx`:
- **Plus Jakarta Sans** — used for English text
- **IBM Plex Sans Arabic** — used for Arabic text

Both loaded with `display=swap`. Font family applied via CSS variables in `tokens.css`.

## Env Vars

```
NEXT_PUBLIC_API_URL        # e.g. https://api.pointly.sa — used by SignupModal for POST /v1/merchants/initiate-signup
NEXT_PUBLIC_MERCHANT_URL   # e.g. https://merchant.pointly.sa — used as callbackUrl base for Moyasar
```

## Gotchas

- Feature icons in `Features.tsx` use **emoji** (not SVG) — Biome enforces `noSvgWithoutTitle` as an error; inline SVGs without a `<title>` will fail `pnpm check`
- `output: 'export'` means **no dynamic routes with `generateStaticParams`** unless all params are known at build time
- `ScrollReveal` uses `useEffect` + `IntersectionObserver` — it's a Client Component. Keep it as a thin wrapper; don't put server data fetching inside it
- All href links to the merchant dashboard or customer portal use full absolute URLs (env var or hardcoded) — not relative paths
- Adding a new page: create `src/app/<name>/page.tsx`, wrap content in `<PageShell>` for inner pages
- Adding a new section to the home page: create `components/NewSection.tsx` + `styles/new-section.css`, import the CSS in `globals.css`, add component to `app/page.tsx`
- Translation keys must exist in **both** `en` and `ar` objects in `translations.ts` — TypeScript will catch missing keys if you type the return properly
