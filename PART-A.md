Position applied for: Frontend Engineer

# Part A

## Section 1 — Code

### Q1
memo does a shallow comparison of props. It runs Object.is on each prop. The comparison fails at the top level because columns is a new array created on every parent render, so its reference differs each time and the nested objects are never reached. Both claims in the diagnosis are wrong.

Wrapping columns in useMemo works only if the useMemo dependency array is itself stable, and columns is the only unstable prop.

Two things that would independently defeat memo:

an inline function prop, e.g. onSelect={() => select(row.id)}, which has a new identity on every render a context value used inside ProductRow, because memo cannot block a re-render caused by a context change

The re-render is caused by a state update in a common ancestor on every keystroke. The unstable props are only why the comparison fails, and the 1,000 rows are what make it expensive.

### Q2
Defects

1. **Rollback missing.** The catch block never calls `patch.undo()`. On any failed request (validation error, 500, offline) the row keeps showing the new status although the server rejected it, and nothing corrects it. The user sees a status that is not real.

2. **Wrong cache entry.** `updateQueryData` targets `{} as ProductFilters`. RTK Query stores a separate cache entry for each set of arguments, so this patches only the no-filter entry. Whenever the user has any filter applied, the optimistic update lands on an entry that is not on screen. The user clicks, nothing happens, then the row jumps when the refetch returns.

3. **Over-broad invalidation.** `invalidatesTags: ['Product']` invalidates every getProducts entry on every success, so each status change refetches all mounted product queries. The user sees the table reload, loading states and lost scroll position after every change, and the optimistic update buys nothing because a full round trip happens anyway.

Ranked 1, 2, 3. Rollback is first because it is the only one that shows the user data that is false and leaves it there, and an operations team will act on it. The other two degrade the experience, but the table eventually shows what the server actually holds.

### False comment

`// ignore - the invalidation will refetch anyway`. `invalidatesTags` only runs when a mutation succeeds. A rejected mutation does not invalidate tags, so nothing refetches and the optimistic patch is never undone. That comment is the reasoning that causes defect 1.

### Looks like a defect, is not

Mutating the draft directly (`row.status = status`). In Redux that would be a bug. `updateQueryData` hands you an Immer draft, so direct mutation is the intended API and produces an immutable patch.

### Q3
export const SupplierBadge = memo(function SupplierBadge({ supplierId }: { supplierId: string }) {
  const { data, isLoading, isError } = useGetSupplierQuery(supplierId);
  if (isLoading) return <Skeleton className="h-5 w-24" />;
  if (isError || !data?.name) return null;
  return (
    <span className="rounded bg-muted px-2 py-0.5 text-xs">
      {data.name.toUpperCase()}
    </span>
  );
});
```

### Removals

useState plus useEffect mirroring data.name - Copies server state into local state. Costs an extra render on every data arrival, and causes the bug below because the copy outlives the prop it came from.

useMemo around toUpperCase - The dependency array and comparison cost more than uppercasing a short string, and it hides that the label is derived, not stored.

The useSupplierName wrapper. It existed only to hold that state. With the state gone, all it does is hide the fact that every row fires its own network request.

### The bug

Removing the useState/useEffect mirror fixes it. The component renders for supplier A and name holds "ACME". The list re-sorts, so React reuses that instance with supplierId B. React renders with the new id but the old name state, because effects run after commit, so the browser paints A's name in B's row for one frame. The effect then corrects it, unless B errors or returns no name, in which case the guard never fires and A's name stays permanently.

### At 200 rows

200 rows fire 200 requests. The fix belongs in the data layer, not the component: send the supplier name with the list, or fetch the suppliers once above the table.

## Q4
1. Values painted

idle, saving, idle. Three paints.

2. Why the others never appear

saved is assigned but never painted. React 18 batches state updates inside async continuations, so setLabel('saved') and the final setLabel(...) run in the same microtask after the await and collapse into one render. Only the last value reaches the screen. Under React 17 it would have painted briefly.

done is never assigned at all. label inside onClick comes from the render that created the handler, where it was idle. So label === 'saving' is false, the ternary returns label, and the call is setLabel('idle').

Two independent faults. Fixing the stale closure alone would still lose saved to batching; fixing batching alone would still write idle.

failed is not reached because the request succeeded.

3. Final value and what is lost

The button ends on idle. The user loses every signal that anything happened: a successful save looks identical to never having clicked. The likely result is a second click and a duplicate mutation.

4. Fix

Delete the last line.

tsx
const onClick = async () => {
  setLabel('saving');
  try {
    await update({ id, status: 'ACTIVE' }).unwrap();
    setLabel('saved');
  } catch {
    setLabel('failed');
  }
};

Better still, derive the label from the mutation hook's own isLoading, isSuccess and isError instead of local state. But the smallest correct change is removing that line.