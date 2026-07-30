import { useEffect, useState } from "react";

const key = "vertex-hub-hidden-values";
export function useHiddenValuesState() {
  const [hidden, setHidden] = useState(() => localStorage.getItem(key) === "true");
  useEffect(() => localStorage.setItem(key, String(hidden)), [hidden]);
  return { hidden, setHidden };
}
