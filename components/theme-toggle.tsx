"use client";

import { useEffect, useState } from "react";

// Flips [data-theme] on <html> and persists it. Initial value is set by the
// inline script in layout.tsx (pre-paint); this just keeps React in sync.
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as "light" | "dark") ?? "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    setTheme(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="fixed right-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-sm text-ink-2 transition-colors hover:text-ink"
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
