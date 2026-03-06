# UI Package – `packages/ui`

Shared React component library used by `merchant-dashboard`, `customer-portal`, and `landing`. Built on Radix UI primitives with Tailwind CSS. Imported as `@pointly/ui`.

## Exports

```ts
// All imports from the package root
import { Button, Card, Input, Navbar, Sheet, ... } from '@pointly/ui';
```

## Components

### `Button` (`components/Button/Button.tsx`)
CVA-based button with variants and sizes.
```ts
<Button variant="default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
        size="default" | "sm" | "lg" | "icon" />
```
Also exports `buttonVariants` (CVA function) and `ButtonProps`.

### `Card` (`components/Card/Card.tsx`)
Compound component. Root has `data-slot="card"` — used by merchant-dashboard's global glassmorphism selector.
```ts
<Card>
  <CardHeader>
    <CardTitle />
    <CardDescription />
  </CardHeader>
  <CardContent />
  <CardFooter />
</Card>
```
- Card and CardFooter use `useRTL()` internally for direction-aware defaults
- Do NOT wrap Card in another div to add RTL alignment — the component handles it

### `Input` / `Textarea` (`components/Input/Input.tsx`)
Standard form inputs with consistent border/ring styling.
```ts
<Input type="text" className="..." />
<Textarea rows={4} />
```
Phone inputs should always add `dir="ltr"` manually — inputs do not auto-flip direction.

### Layout Components (`components/Layout/Layouts.tsx`)
Utility wrappers for common layout patterns:
```ts
<Flex gap={4} align="center" />    // flex container
<Grid cols={3} gap={4} />          // grid container
<Container maxWidth="xl" />        // centered max-width wrapper
<Stack gap={4} />                  // vertical flex stack
```

### `LanguageToggle` (`components/LanguageToggle/LanguageToggle.tsx`)
Toggles between `'ar'` and `'en'`. Writes to `localStorage` key `pointly-language` and updates `document.documentElement.dir` + `lang`.
```ts
<LanguageToggle variant="default" | "ghost" showLabel={true | false} />
```

### `Sheet` (`components/Sheet/Sheet.tsx`)
Radix Dialog-based slide-out panel. Exports the full Radix Sheet API:
```ts
<Sheet>
  <SheetTrigger />
  <SheetContent side="left" | "right" | "top" | "bottom">
    <SheetHeader>
      <SheetTitle />
      <SheetDescription />
    </SheetHeader>
    <SheetFooter />
  </SheetContent>
</Sheet>
```

### `Navbar` (`components/Navbar/Navbar.tsx`)
Generic navigation bar. Props:
```ts
<Navbar logo={ReactNode} items={NavItem[]} actions={ReactNode} />
// NavItem: { label: string; href: string; active?: boolean }
```

## Hooks

### `useRTL()` (`hooks/useRTL.ts`)
Reads direction from `@pointly/i18n`'s `useDirection()`. Returns utilities for RTL-aware styling:

```ts
const {
  isRTL,           // boolean
  direction,       // 'rtl' | 'ltr'
  dir(ltr, rtl),   // pick class by direction
  ms(value),       // margin-inline-start class (swapped in RTL)
  me(value),       // margin-inline-end class (swapped in RTL)
  ps(value),       // padding-inline-start
  pe(value),       // padding-inline-end
  flexRow,         // 'flex-row-reverse' in RTL, 'flex-row' in LTR
  textStart,       // 'text-right' in RTL, 'text-left' in LTR
  textEnd,         // 'text-left' in RTL, 'text-right' in LTR
  roundedStart,    // 'rounded-e' in RTL, 'rounded-s' in LTR
  roundedEnd,
  start(v),        // 'right-{v}' in RTL, 'left-{v}' in LTR
  end(v),
  translateXStart, // 'translate-x-full' in RTL
  translateXEnd,
  flipIcon,        // 'scale-x-[-1]' in RTL (for arrow/chevron icons)
} = useRTL();
```

Use this instead of hardcoded `text-left`, `ml-`, `pl-` etc. in any component that must work in both directions.

## Utilities

### `cn()` (`utils/cn.ts`)
Merges Tailwind classes using `clsx` + `tailwind-merge`.
```ts
import { cn } from '@pointly/ui';
cn('base-class', conditional && 'optional', className)
```

## Adding a New Component

1. Create `src/components/MyComponent/MyComponent.tsx`
2. Export from `src/index.ts`
3. Use `cn()` for className merging
4. Use `useRTL()` if the component has directional layout
5. Mark file `'use client'` — all components here are client components

## Gotchas

- All components are Client Components (`'use client'`) — cannot be used directly in React Server Components without a client wrapper
- `Card` has `data-slot="card"` hardcoded — merchant-dashboard's glassmorphism CSS targets this attribute; do not rename it
- `useRTL` depends on `@pointly/i18n`'s context being present — wrap the app in `i18n`'s provider or the hook will return LTR defaults
- Tailwind CSS is **not bundled** — consuming apps must have Tailwind configured and include `@pointly/ui` in their content glob
