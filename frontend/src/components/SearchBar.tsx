"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SearchIcon, CloseIcon } from "@/components/icons";
import type { GoogleAccount } from "@/lib/types";

export type SearchFilters = { category: string; accountId: string };

export default function SearchBar({
  accounts,
  onSearch,
  onClear,
}: {
  accounts: GoogleAccount[] | null;
  onSearch: (query: string, filters: SearchFilters) => void;
  onClear: () => void;
}) {
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [focused, setFocused] = useState(false);

  function runSearch(q: string, cat: string, acc: string) {
    if (q.trim()) onSearch(q.trim(), { category: cat, accountId: acc });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch(value, category, accountId);
  }

  function handleClear() {
    setValue("");
    setCategory("");
    setAccountId("");
    onClear();
  }

  function handleCategoryChange(next: string) {
    setCategory(next);
    runSearch(value, next, accountId);
  }

  function handleAccountChange(next: string) {
    setAccountId(next);
    runSearch(value, category, next);
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <form onSubmit={handleSubmit} style={{ position: "relative" }}>
        <motion.span
          animate={{ color: focused ? "var(--gold)" : "var(--text-faint)", scale: focused ? 1.1 : 1 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            translateY: "-50%",
            pointerEvents: "none",
            display: "flex",
          }}
        >
          <SearchIcon size={16} />
        </motion.span>
        <input
          type="text"
          placeholder="Search files by name…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ paddingLeft: 38, paddingRight: value ? 38 : 12 }}
        />
        <AnimatePresence>
          {value && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.15 }}
              onClick={handleClear}
              className="secondary"
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                padding: 6,
                borderRadius: "50%",
                lineHeight: 0,
              }}
              aria-label="Clear search"
            >
              <CloseIcon size={11} />
            </motion.button>
          )}
        </AnimatePresence>
      </form>

      <AnimatePresence initial={false}>
        {value && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="row" style={{ gap: 8, flexWrap: "wrap", paddingTop: 2 }}>
              <select value={category} onChange={(e) => handleCategoryChange(e.target.value)} aria-label="Filter by type">
                <option value="">All types</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="document">Documents</option>
                <option value="other">Other</option>
              </select>
              {accounts && accounts.length > 1 && (
                <select value={accountId} onChange={(e) => handleAccountChange(e.target.value)} aria-label="Filter by account">
                  <option value="">All accounts</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.google_email}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
