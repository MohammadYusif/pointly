# TanStack Query Expert — Pointly Data Fetching Context

> Load this skill when working with TanStack Query hooks,
> cache invalidation, optimistic updates, mutations, or
> query key design in the Pointly platform.

## Environment

- **Library**: @tanstack/react-query v5
- **Usage**: All frontend apps (merchant-dashboard, customer-portal, landing)
- **Pattern**: Custom hooks in `hooks/api/` directory
- **Provider**: QueryClient configured in root layout

## Project Structure

```
apps/merchant-dashboard/src/hooks/api/
  use-analytics.ts      # Merchant analytics data
  use-campaigns.ts      # Marketing campaigns
  use-customers.ts      # Customer list and details
  use-merchant.ts       # Merchant profile
  use-purchases.ts      # Purchase recording
  index.ts              # Barrel exports
```

## Hook Patterns

### Query Hook (Read)
```typescript
export function useMerchantCustomers(limit = 20) {
  const { merchant } = useAuth();

  return useQuery({
    queryKey: ['merchant', merchant?.merchantId, 'customers', limit],
    queryFn: () => merchantApi.getCustomers(merchant!.merchantId, { limit }),
    enabled: !!merchant?.merchantId,
    staleTime: 30_000, // 30 seconds
  });
}
```

### Mutation Hook (Write)
```typescript
export function useRecordPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RecordPurchaseRequest) =>
      merchantApi.recordPurchase(data),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
```

### Infinite Query Hook (Pagination)
```typescript
export function useInfiniteTransactions(limit = 20) {
  const { merchant } = useAuth();

  return useInfiniteQuery({
    queryKey: ['merchant', merchant?.merchantId, 'transactions', limit],
    queryFn: ({ pageParam }) =>
      merchantApi.getTransactions(merchant!.merchantId, {
        limit,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!merchant?.merchantId,
  });
}
```

## Query Key Design

### Convention
```
['entity', entityId, 'subEntity', subEntityId, ...filters]

Examples:
['merchant', 'merch_123', 'customers', 20]
['merchant', 'merch_123', 'transactions', 20, 'pending']
['customer', 'cust_456', 'profile']
['analytics', 'merch_123', { startDate, endDate }]
```

### Rules
1. **Always include entity ID** — scope queries to specific entities
2. **Use stable references** — no inline objects in query keys
3. **Include filters** — different filters = different cache entries
4. **Keep it flat** — avoid deeply nested arrays

### BAD: Unstable Query Key
```typescript
// ❌ Creates new object reference every render
queryKey: ['analytics', { startDate, endDate }]
```

### GOOD: Stable Query Key
```typescript
// ✅ Flat array with primitive values
queryKey: ['analytics', startDate, endDate]
```

## Cache Configuration

### Global Defaults
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

### Per-Query Overrides
```typescript
useQuery({
  queryKey: ['realtime-data'],
  queryFn: fetchRealtimeData,
  staleTime: 0,           // Always stale
  refetchInterval: 5000,  // Poll every 5 seconds
});
```

## Cache Invalidation

### After Mutation
```typescript
onSuccess: () => {
  // Invalidate specific query
  queryClient.invalidateQueries({
    queryKey: ['merchant', merchantId, 'customers'],
  });

  // Invalidate all queries matching pattern
  queryClient.invalidateQueries({
    queryKey: ['merchant', merchantId],
  });
}
```

### Optimistic Updates
```typescript
useMutation({
  mutationFn: updateCustomer,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['customer', id] });

    // Snapshot previous value
    const previous = queryClient.getQueryData(['customer', id]);

    // Optimistically update
    queryClient.setQueryData(['customer', id], (old) => ({
      ...old,
      ...newData,
    }));

    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['customer', id], context.previous);
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['customer', id] });
  },
});
```

## Common Patterns

### Dependent Queries
```typescript
// Query that depends on another query's data
const { data: merchant } = useMerchant();

const { data: customers } = useQuery({
  queryKey: ['customers', merchant?.id],
  queryFn: () => getCustomers(merchant.id),
  enabled: !!merchant?.id, // Only run when merchant is loaded
});
```

### Prefetching
```typescript
// Prefetch data before navigation
const queryClient = useQueryClient();

const prefetchCustomer = (customerId: string) => {
  queryClient.prefetchQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomer(customerId),
  });
};
```

### Background Refetch
```typescript
useQuery({
  queryKey: ['analytics'],
  queryFn: fetchAnalytics,
  refetchOnMount: true,        // Refetch on mount
  refetchOnWindowFocus: false, // Don't refetch on focus
  refetchOnReconnect: true,    // Refetch on reconnect
});
```

## Best Practices

1. **Use custom hooks** — never call useQuery directly in components
2. **Stable query keys** — no inline objects or functions
3. **Invalidate after mutations** — keep cache in sync
4. **Set appropriate staleTime** — balance freshness vs performance
5. **Handle loading states** — show skeletons, not spinners
6. **Handle error states** — show user-friendly messages
7. **Use optimistic updates** — for instant UI feedback
8. **Prefetch likely data** — improve perceived performance

## Common Gotchas

1. **Query key stability** — inline objects create new references
2. **Enabled flag** — use for dependent queries
3. **staleTime vs gcTime** — staleTime is freshness, gcTime is cache lifetime
4. **Mutation side effects** — always invalidate related queries
5. **Infinite query cursor** — ensure getNextPageParam returns undefined at end
6. **SSR hydration** — use dehydrate/hydrate for server-side rendering
