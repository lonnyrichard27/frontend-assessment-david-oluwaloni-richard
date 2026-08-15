# NOTES

## Constraints 1 and 2 together

Constraint 1 rules out virtualisation. It only keeps the rows you can see in the DOM, so Ctrl-P would print about 30 rows out of the filtered set and Ctrl-F would not find an order that has not been scrolled to.

So every filtered row stays in the DOM, and I met constraint 2 by stopping rows re-rendering instead of removing them:

- memo on OrderRow
- only the order object as a prop, no inline callbacks
- one click handler on <tbody> using event delegation
- the search input is uncontrolled, so typing does not re-render the table shell

Measured: 0 row re-renders per keystroke, against 1,179 without memo. See evidence/.

**What I had to let go of.** React still walks all 5,000 children on a filter change (about 509ms), and clearing the filter rebuilds all 5,000 rows (734ms). Virtualisation would avoid both, since it only builds the rows on screen. Typing when the list is already short costs 6ms. This buys a correct printout at 5,000 rows; it would not hold at 100,000.

## Three decisions

1. **No table library.** I was allowed one and used none, @tanstack/react-virtual is out because of constraint 1. @tanstack/react-table was allowed, but its column definitions would have cost more lines than the .filter() they replaced. It becomes the right call as soon as sorting, resizing or grouping is needed.
2. **URL as the only source of truth.** Filters are read from useSearchParams on every render and never copied into state. That is what makes constraint 4 possible without a sync effect. The alternative would be local state plus an effect, which would be correct if the filter needed debouncing or validation before the URL updated.
3. **Kept the semantic table.** I tried content-visibility: auto on the rows to skip work for off-screen ones. CSS containment does not apply to table elements, so I removed it. div rows with ARIA roles would make it work, and would be right if scroll performance mattered more than thead repeating on each printed page.

## Not finished

- Selection does not reset when the filter changes, so a selected row can leave the list. It should be derived during render.
- The search input's ref callback is the only direct DOM write. It re-syncs the value on back navigation but skips while the input has focus, so the field can go stale.

