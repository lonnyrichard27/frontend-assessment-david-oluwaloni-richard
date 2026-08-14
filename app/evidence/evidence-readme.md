The Evidence

Using React Devtools profiler (see attached screenshots in the evidence folder), when the user types into the search input with all 5k records displayed, the rerender counts is as follows

1. with memoization - 20 commits across 3keystrokes, there are 0 rerenders in every commit for OrderRow, but on the other hand OrderTable and Filters rerender on each keystroke because Next's SearchParamsContext updates when the URL changes, but the memo stops every row already on screen from re-rendering.

Note: Commit means a batch of DOM updates.

- At commit 2, the filter runs 5k rows, duration came at 509.2ms and OrderRow has 0 re-renders
- At commit 11, typing when the list is already filtered down duration came at 6.4ms and OrderRow has 0 re-renders
- At commit 17, the search was cleared so all 5,000 rows returned. Duration was 734.6ms. Still 0 re-renders, the time went into building 5,002 rows from scratch, not re-rendering existing ones.

2. without memoization - 6 commits across 2 keystrokes  1,294 OrderRow re-renders total. Every row on screen re-rendered, even though none of their data changed.

The memoized run's 509 ms and 734 ms commits are not re-renders. They are reconciliation over 5,000 children (509 ms) and mounting 5,000 new rows when the filter widens (734 ms). Rows entering and leaving the filtered set must mount and unmount — that is correct behaviour, and at this data size it is the dominant cost. Typing within an already-narrow set costs ~6 ms.
