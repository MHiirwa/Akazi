import { useSearchParams } from "react-router-dom";

// Keeps a dashboard's active section in the URL (?section=…) so a refresh (or a
// shared/bookmarked link) lands on the same tab instead of resetting to the
// default. The default section is kept out of the URL to keep it clean.
export function useSectionParam(defaultKey = "overview") {
  const [params, setParams] = useSearchParams();
  const section = params.get("section") || defaultKey;

  const setSection = (key) => {
    const next = new URLSearchParams(params);
    if (!key || key === defaultKey) next.delete("section");
    else next.set("section", key);
    setParams(next, { replace: true });
  };

  return [section, setSection];
}
