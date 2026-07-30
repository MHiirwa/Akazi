import { useEffect, useState } from "react";

// Returns a debounced copy of `value` that only updates after `delay` ms have
// passed without it changing. Used to avoid firing a search request on every
// keystroke.
export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
