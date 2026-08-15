Position applied for: Frontend Engineer

# Part A

## Section 1 — Code

### Q1

memo does a shallow comparison of props. It runs Object.is on each prop. The comparison fails at the top level because columns is a new array created on every parent render, so its reference differs each time and the nested objects are never reached. Both claims in the diagnosis are wrong.

Wrapping columns in useMemo works only if the useMemo dependency array is itself stable, and columns is the only unstable prop.

Two things that would independently defeat memo:

- an inline function prop, e.g. onSelect={() => select(row.id)}, which has a new identity on every render
- a context value used inside ProductRow, because memo cannot block a re-render caused by a context change

The re-render is caused by a state update in a common ancestor on every keystroke. The unstable props are only why the comparison fails, and the 1,000 rows are what make it expensive.

### Q2

Defects

1. **Rollback missing.** The catch block never calls `patch.undo()`. On any failed request (validation error, 500, offline) the row keeps showing the new status although the server rejected it, and nothing corrects it. The user sees a status that is not real.
2. **Wrong cache entry.** `updateQueryData` targets `{} as ProductFilters`. RTK Query stores a separate cache entry for each set of arguments, so this patches only the no-filter entry. Whenever the user has any filter applied, the optimistic update lands on an entry that is not on screen. The user clicks, nothing happens, then the row jumps when the refetch returns.
3. **Over-broad invalidation.** `invalidatesTags: ['Product']` invalidates every getProducts entry on every success, so each status change refetches all mounted product queries. The user sees the table reload, loading states and lost scroll position after every change, and the optimistic update buys nothing because a full round trip happens anyway.

Ranked 1, 2, 3. Rollback is first because it is the only one that shows the user data that is false and leaves it there, and an operations team will act on it. The other two degrade the experience, but the table eventually shows what the server actually holds.

**False comment**

`// ignore - the invalidation will refetch anyway`. `invalidatesTags` only runs when a mutation succeeds. A rejected mutation does not invalidate tags, so nothing refetches and the optimistic patch is never undone. That comment is the reasoning that causes defect 1.

**Looks like a defect, is not**

Mutating the draft directly (`row.status = status`). In Redux that would be a bug. `updateQueryData` hands you an Immer draft, so direct mutation is the intended API and produces an immutable patch.

### Q3
```tsx
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

```tsx
const onClick = async () => {
  setLabel('saving');
  try {
    await update({ id, status: 'ACTIVE' }).unwrap();
    setLabel('saved');
  } catch {
    setLabel('failed');
  }
};
```

Better still, derive the label from the mutation hook's own isLoading, isSuccess and isError instead of local state. But the smallest correct change is removing that line.

## Q5
```ts
const ERROR_CODES = ['SUPPLIER_LOCKED', 'STOCK_NEGATIVE', 'IMPORT_IN_PROGRESS',
  'VALIDATION_FAILED', 'RATE_LIMITED'] as const;
type ErrorCode = (typeof ERROR_CODES)[number];

type AppError =
  | { code: ErrorCode; message: string; field?: string }
  | { code: 'UNKNOWN'; rawCode: string; message: string; field?: string };

type Meta = { page: number; pageSize: number; total: number };

type Result<T> =
  | { ok: true; data: T; meta: Meta }
  | { ok: false; error: AppError };

type ErrorPolicy =
  | { mode: 'form'; mapField: (e: AppError) => string | null }
  | { mode: 'toast' }
  | { mode: 'silent' };

function call<T>(
  endpoint: Endpoint<T>,
  args: Args,
  policy: ErrorPolicy,
): Promise<Result<T>>;

```

The layer unwraps the envelope once, performs the policy's side effect — attach to a field, show a toast, or stay silent — and returns Result<T>. No consumer sees the envelope.

1. Non-null data

error is either null or an object, and TypeScript treats null as a checkable value. So after if (error === null), TypeScript knows data is real. The layer does this once and returns a clean result.

2. New ErrorCode

The presentation table is Record<ErrorCode, Presentation>, one entry per code, required. Add a sixth code to the union and the table is missing a key, so it will not compile.

3. Unknown code at runtime

Types cannot help; the code does not exist in the deployed app. So the runtime checks: ERROR_CODES is a real array, the type is derived from it so the two cannot drift, and an unrecognised code is labelled UNKNOWN, showing the server's own message. Otherwise the user sees nothing.

Point 2 is a build-time guarantee about my code: a code I know exists. Point 3 is a runtime guarantee about the server's: one I do not.

4. Mismatched field

The message is attached to a field that does not exist, so nothing shows. The user submits and nothing happens. Fixed per-form with a small translation function, since the shared layer cannot know your field names. If the translation returns nothing, show the error at the top of the form rather than dropping it.

## Q6

Reject.

What breaks, and for whom. Virtualisation keeps only the visible rows in the DOM, roughly 30. Ctrl-P prints the DOM, so the warehouse gets a clipboard sheet with 30 rows out of 3,000 filtered and nothing indicating rows are missing. People pick stock against an incomplete sheet. Ctrl-F stops working too, because the browser cannot find an order number that is not rendered, killing the find-then-print workflow the team uses.

What I would do instead. Measure first. Six seconds for 3,000 rows is not a row-count problem; plain rows render in well under a second. The cost is almost certainly per row: a formatter constructed per cell, a subscription per row, unmemoised cells, or table-layout auto forcing repeated layout passes. Then, keeping every row in the DOM: hoist formatters to module scope, memoise the row with stable props, set table-layout fixed, and fetch what rows need above the table.

Its cost. Six seconds becomes roughly one, not 100ms. Scrolling stays worse than virtualised. It needs profiling time rather than an afternoon installing a library, and it does not scale to 100,000 rows. I am buying a correct printout at this team's data size, not an unbounded list.


## Q7

(b), the forms.

(a) is one visible hang, on load, in a demo, and I can hide it for Thursday in an hour by defaulting the table to a filtered view. (b) is silent data loss hitting real users daily with no workaround. Demos are recoverable; trust is not.

What stays broken: the table still freezes four seconds on load. I mitigate it, I do not fix it.

To the person who wanted (a): "The freeze is embarrassing and it is next after the demo. I can hide it Thursday by defaulting to a filtered view, an hour not two days. What I cannot hide is a form discarding everything the user typed, which is happening now with no workaround."

## Q8

4 vs 5. More than 500 ids needs two requests, and separate requests cannot be atomic from the browser. Keep 5. Ticket: a server endpoint that takes the filter and applies it in one transaction. Question: is a hard 500 cap acceptable, or do you need unlimited size?

5 vs 6. Atomic means all or none, so a mixed succeeded/failed count cannot happen. Keep 5, rewrite 6 as "N updated" or "nothing changed, reason X". Ticket: define both toast messages. Question: did you mean some products get skipped, for example locked suppliers? That is a validation report, not a partial write.

2 vs 3. Select-all by filter exists because the client does not know the ids; showing the exact SKUs means fetching all of them, which is the paging we avoided, and the set can change before the request lands. Keep 2, weaken 3 to the count, the filter description and a sample. Question: is the count enough, or must a human read every SKU?

1 vs 2. Select all under filter X, then switch to Y: the UI cannot show what is selected, and unchecking a row makes the selection an expression rather than a list. Keep both, but pin the model: a list of ids, or a filter plus exclusions. Question: should changing the filter clear the selection?

Two survive unchanged: 4 and 5. 4 is a stated API fact, 5 is the one I would defend. The rest need their wording pinned before they mean anything.

## Q9

1. Verdict: request changes.
2. Comments

1 — FilterBar.tsx, clear() does window.location.href = '/products'. This is a full page reload, which is exactly what AC-2 forbids. It also drops every other active filter and re-downloads the bundle. Replace with onChange({ ...value, suppliers: [] }) and reset draft, updating the URL through the router if the filter is URL-backed. This alone fails the ticket.

2 — FilterBar.tsx, local suppliers state duplicates value. The applied list is held locally and only pushed up on Apply, so it diverges from value.suppliers whenever the parent changes filters. This is also the opposite of the stated goal: the description says the component was made controlled, and this makes it less controlled. Derive the applied list from value.suppliers and keep only draft local. Separately, setSuppliers([...suppliers, draft]) does not trim, dedupe, reject empty input or clear draft, and there is no way to remove a single supplier — so AC-1 is half built.

3 — Contract change with no visible consumers. Filters.supplier: string becomes suppliers: string[], but the diff shows no change to the Filters type, the query serialisation, or the API. Where is suppliers serialised, and does the backend accept it? Any other reader of value.supplier is now silently broken. Please include those changes here or link them.

4 — useProducts.ts, refetchOnMountOrArgChange: true. Unrelated to both acceptance criteria and undiscussed. Every mount now refetches, discarding cache on each navigation back to the table. If it was added to work around the filter not updating, that treats the symptom. Remove it, or split it out with its own justification.

5 — Scope, and the shared formatDate. The date helper move is unrelated to the ticket and inflates the review. If it is to become the shared util used everywhere, it cannot be a bare toLocaleDateString() with no locale or timezone — it will render differently on every user's machine. Pin the locale and options and reuse one Intl.DateTimeFormat instance.

3. Deliberately not commented on

I left the absence of tests alone — it is a team policy conversation rather than a blocker for this diff, and raising it here would dilute the five problems that are.

4. Acceptance criteria

AC-1 — cannot tell from the diff alone. The UI collects multiple suppliers, but nothing shown proves they are serialised into the request or accepted by the API, and there is no way to remove one. To find out: read the Filters type and the getProducts query builder, add two suppliers and inspect the outgoing request, and confirm the contract with the backend.

AC-2 — not met. window.location.href is a full page reload by definition. Observable directly from the diff.

## Q10

1. First 60 minutes. Post in the channel: nobody pushes, prunes, or deletes local branches, because a prune makes this permanent. Lock development with branch protection. Recover the old SHAs, fastest first: the developer's reflog, the host's activity log which records a force push's before and after, CI records, the pull request pages. Restore development and the four branches at exactly those SHAs, changing nothing else. Verify with the blocked developers.
2. The blocked developers: immediately, inside five minutes, before recovering. What happened, an explicit do not prune or delete anything, that their local copies may be the recovery source, and an update in thirty minutes either way.
3. The business owner: yes, once I know the size of it, around 09:30. Production unaffected, no customer impact, two developers blocked, ETA, one process change. Hearing it later from someone else costs me the ability to be believed next time.
4. Permanently: force-push and branch deletion denied on development and main, including admins. The engineering lead owns repository settings and must agree; the team needs to know their own feature branches are unaffected. The business owner is informed, not consulted.



## Q11

to the dev
Hey buddy I want to talk about PR size, and be straight about why.

Your work is really solid on the team. Last week's 900-line PR was approved under deadline pressure. I do not think it was reviewed, which means we shipped it based on your previous good work rather than a second pair of eyes.

From now on, please let your PRs be under 400 lines, with tests for the logic they add. If something cannot be split, tell me before you start and we will plan it together.

im always glad to help :)

to the business owner
Quick note on shipping speed. We have been merging very large changes with limited review. That is fast this week and expensive later. it is the main reason things come back to us as bugs weeks after release.

From next sprint the team ships in smaller pieces. You should see work reaching you more often rather than less, and fewer things bouncing back. Nothing changes for what is already committed this sprint.

## Q12

The password reset email contained a link pointing at the wrong base URL, so clicking it landed users on the login page instead of the reset form. The route did not match, so it fell through to another route. Nobody could complete a password reset for the duration.

I did not find it. Users contacted customer service, customer service escalated to the CTO, and he brought it to me. It was live for about a day.

What changed in how I work: I stopped testing flows that leave the app locally. Anything involving an email, a redirect or an external callback, I now click through end to end in the deployed environment before calling it done, locally the base URL is correct by accident, which is exactly why I missed it.

## Q13

First admin dashboard: This was a big dashboard for the whole staff of a bank, internal backend team built the apis and it was documented on swagger

The second dashboard: A fintech dashboard for a companys finanace management, distribution and tax disbursement automatically internal backend team built the apis and it was documented on swagger