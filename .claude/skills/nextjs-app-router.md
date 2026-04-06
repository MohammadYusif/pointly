# Next.js App Router Expert — Pointly Frontend Context

> Load this skill when working with Next.js pages, layouts,
> server/client components, data fetching, caching, or metadata.

## Environment

- **Framework**: Next.js 15 (customer-portal, landing), Next.js 16 (merchant-dashboard)
- **React**: 18/19 with Server Components
- **Styling**: Tailwind CSS 3.x
- **Package Manager**: pnpm 10+
- **Deployment**: S3 + CloudFront (static export)

## Project Structure

```
apps/merchant-dashboard/src/
  app/                    # App Router pages
    layout.tsx            # Root layout
    page.tsx              # Home page
    login/
      page.tsx            # Login page
    dashboard/
      page.tsx            # Dashboard page
    ...
  components/             # Shared components
  hooks/                  # Custom hooks
  lib/                    # Utilities
  types/                  # Type definitions

apps/customer-portal/src/
  app/                    # App Router pages
  components/             # Shared components
  hooks/                  # Custom hooks
  ...

apps/landing/src/
  app/                    # App Router pages
  components/             # Shared components
  ...
```

## Server vs Client Components

### Server Components (Default)
- ✅ Access to server-side data
- ✅ Direct database/API access
- ✅ Smaller bundle size
- ❌ No interactivity (no useState, useEffect)
- ❌ No browser APIs

### Client Components ('use client')
- ✅ Interactivity (useState, useEffect, event handlers)
- ✅ Browser APIs
- ❌ Larger bundle size
- ❌ No direct server-side data access

### When to Use 'use client'
- Forms with state management
- Event handlers (onClick, onChange)
- Browser APIs (localStorage, window)
- Third-party UI libraries
- Animations (framer-motion)
- TanStack Query hooks

## Data Fetching Patterns

### Server Components (Static/SSR)
```tsx
// app/page.tsx (Server Component)
export default async function Page() {
  const data = await fetch('https://api.pointly.sa/...', {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });
  return <div>{data.name}</div>;
}
```

### Client Components (TanStack Query)
```tsx
// app/dashboard/page.tsx (Client Component)
'use client';

export default function Dashboard() {
  const { data, isLoading } = useMerchantAnalytics();
  return <div>{isLoading ? 'Loading...' : data.total}</div>;
}
```

## Caching Strategies

### Next.js Cache
- **Static** — Default for Server Components
- **Dynamic** — `fetch` with `cache: 'no-store'`
- **Revalidated** — `fetch` with `next: { revalidate: seconds }`

### TanStack Query Cache
- **staleTime** — How long data is fresh
- **gcTime** — How long unused data is kept
- **refetchOnWindowFocus** — Refetch on focus (default: true)

## Metadata

### Static Metadata
```tsx
export const metadata = {
  title: 'Pointly — Merchant Dashboard',
  description: 'Manage your loyalty program',
};
```

### Dynamic Metadata
```tsx
export async function generateMetadata({ params }) {
  const merchant = await getMerchant(params.id);
  return {
    title: `${merchant.name} — Pointly`,
  };
}
```

## Layouts

### Root Layout
```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html dir="rtl">
      <body>{children}</body>
    </html>
  );
}
```

### Nested Layouts
```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

## Route Groups

```
app/
  (auth)/           # Auth routes (no dashboard layout)
    login/page.tsx
    register/page.tsx
  (dashboard)/      # Dashboard routes (with layout)
    dashboard/page.tsx
    settings/page.tsx
  api/              # API routes
    health/route.ts
```

## Error Handling

### Error Boundary
```tsx
// app/error.tsx
'use client';

export default function Error({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### Not Found
```tsx
// app/not-found.tsx
export default function NotFound() {
  return <div>Page not found</div>;
}
```

## Best Practices

1. **Default to Server Components** — only use 'use client' when needed
2. **Colocate components** — keep components near their pages
3. **Use route groups** — organize routes without affecting URL
4. **Streamline data fetching** — fetch in Server Components when possible
5. **Cache appropriately** — use revalidation for dynamic data
6. **Handle errors gracefully** — use error boundaries
7. **Optimize images** — use Next.js Image component
8. **Use metadata API** — for SEO and social sharing

## Common Gotchas

1. **'use client' boundary** — imports from client components become client code
2. **Server/Client composition** — pass server data as props to client components
3. **Dynamic routes** — use `[id]` for dynamic segments
4. **Parallel routes** — use `@folder` for parallel rendering
5. **Intercepting routes** — use `(.)folder` for modal patterns
6. **Build output** — static export requires `output: 'export'` in next.config
