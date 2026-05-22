"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useVocab } from "@/lib/vocab";
import { LANGUAGES, type Lang } from "@/lib/types";

export default function VocabPage() {
  const { list, hydrated, remove, dueNow } = useVocab();
  const [filter, setFilter] = useState<Lang | "all">("all");

  const filtered = useMemo(
    () => (filter === "all" ? list : list.filter((e) => e.lang === filter)),
    [list, filter]
  );

  const due = dueNow().length;

  return (
    <div className="max-w-md mx-auto px-5 pt-6 pb-8">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Vocab</h1>
        <p className="text-neutral-400 text-sm mt-1">
          {hydrated ? `${list.length} saved · ${due} due` : "Loading…"}
        </p>
      </header>

      <div className="flex gap-2 mb-5 overflow-x-auto">
        <FilterChip
          label="All"
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        {LANGUAGES.map((l) => (
          <FilterChip
            key={l.code}
            label={l.native}
            active={filter === l.code}
            onClick={() => setFilter(l.code)}
          />
        ))}
      </div>

      {hydrated && list.length === 0 && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">
          <div className="text-3xl mb-2">📖</div>
          <div className="text-neutral-300 font-medium">No words yet</div>
          <div className="text-sm text-neutral-500 mt-1">
            Tap words while reading to save them here.
          </div>
          <Link
            href="/"
            className="inline-block mt-4 text-sm text-white underline"
          >
            Browse library →
          </Link>
        </div>
      )}

      <ul className="grid grid-cols-1 gap-2">
        {filtered.map((entry) => {
          const isDue = entry.dueAt <= Date.now();
          return (
            <li
              key={`${entry.lang}:${entry.normalized}`}
              className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 flex items-center gap-3"
            >
              <div className="text-xs uppercase font-mono text-neutral-500 w-7 shrink-0">
                {entry.lang}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{entry.word}</div>
                <div className="text-sm text-neutral-400 truncate">
                  {entry.translation}
                </div>
              </div>
              <div className="text-xs text-neutral-500 shrink-0">
                {isDue ? (
                  <span className="text-emerald-400">due</span>
                ) : (
                  `${Math.max(1, Math.round((entry.dueAt - Date.now()) / 86_400_000))}d`
                )}
              </div>
              <button
                onClick={() => remove(entry.word, entry.lang)}
                className="text-neutral-600 hover:text-red-400 text-lg leading-none px-1"
                aria-label="Remove"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm shrink-0 transition ${
        active
          ? "bg-white text-black"
          : "bg-neutral-900 border border-neutral-800 text-neutral-300"
      }`}
    >
      {label}
    </button>
  );
}
