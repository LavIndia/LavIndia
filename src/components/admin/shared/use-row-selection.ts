import { useCallback, useMemo, useState } from "react";

/**
 * Which rows of an admin list are ticked.
 *
 * Only ids still in the list count: after a delete the screen refreshes with
 * fewer rows, and a stale tick on a row that no longer exists must not keep
 * the "N selected" bar open or be sent to the server again.
 */
export function useRowSelection(allIds: readonly string[]) {
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());

  const selected = useMemo(() => {
    const live = new Set(allIds);
    return allIds.filter((id) => ticked.has(id) && live.has(id));
  }, [allIds, ticked]);

  const toggle = useCallback((id: string, on: boolean) => {
    setTicked((previous) => {
      const next = new Set(previous);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (on: boolean) => setTicked(on ? new Set(allIds) : new Set()),
    [allIds],
  );

  const clear = useCallback(() => setTicked(new Set()), []);

  return {
    selected,
    count: selected.length,
    isSelected: (id: string) => ticked.has(id),
    allSelected: allIds.length > 0 && selected.length === allIds.length,
    someSelected: selected.length > 0 && selected.length < allIds.length,
    toggle,
    toggleAll,
    clear,
  };
}
