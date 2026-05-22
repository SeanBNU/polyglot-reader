"use client";

import { useCallback, useEffect, useState } from "react";
import type { Lang, ReviewGrade, VocabEntry } from "./types";

const STORAGE_KEY = "polyglot-reader.vocab.v1";
const DAY_MS = 24 * 60 * 60 * 1000;

function normalize(word: string): string {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function keyOf(word: string, lang: Lang): string {
  return `${lang}:${normalize(word)}`;
}

function loadAll(): Record<string, VocabEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, VocabEntry>;
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, VocabEntry>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("polyglot:vocab-changed"));
}

export function useVocab() {
  const [entries, setEntries] = useState<Record<string, VocabEntry>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEntries(loadAll());
    setHydrated(true);
    const handler = () => setEntries(loadAll());
    window.addEventListener("polyglot:vocab-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("polyglot:vocab-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const upsert = useCallback(
    (entry: Omit<VocabEntry, "normalized" | "addedAt" | "ease" | "intervalDays" | "dueAt" | "reps" | "lapses">) => {
      const key = keyOf(entry.word, entry.lang);
      const all = loadAll();
      const now = Date.now();
      const existing = all[key];
      if (existing) {
        all[key] = {
          ...existing,
          translation: entry.translation || existing.translation,
          context: entry.context ?? existing.context,
          bookId: entry.bookId ?? existing.bookId,
        };
      } else {
        all[key] = {
          word: entry.word,
          normalized: normalize(entry.word),
          translation: entry.translation,
          lang: entry.lang,
          context: entry.context,
          bookId: entry.bookId,
          addedAt: now,
          ease: 2.5,
          intervalDays: 0,
          dueAt: now,
          reps: 0,
          lapses: 0,
        };
      }
      saveAll(all);
      return all[key];
    },
    []
  );

  const remove = useCallback((word: string, lang: Lang) => {
    const all = loadAll();
    delete all[keyOf(word, lang)];
    saveAll(all);
  }, []);

  const grade = useCallback((word: string, lang: Lang, g: ReviewGrade) => {
    const all = loadAll();
    const key = keyOf(word, lang);
    const entry = all[key];
    if (!entry) return;
    const now = Date.now();
    const updated = applyGrade(entry, g, now);
    all[key] = updated;
    saveAll(all);
  }, []);

  return {
    entries,
    list: Object.values(entries).sort((a, b) => b.addedAt - a.addedAt),
    hydrated,
    has: (word: string, lang: Lang) => Boolean(entries[keyOf(word, lang)]),
    get: (word: string, lang: Lang) => entries[keyOf(word, lang)],
    upsert,
    remove,
    grade,
    dueNow: () =>
      Object.values(entries)
        .filter((e) => e.dueAt <= Date.now())
        .sort((a, b) => a.dueAt - b.dueAt),
  };
}

function applyGrade(entry: VocabEntry, g: ReviewGrade, now: number): VocabEntry {
  let { ease, intervalDays, reps, lapses } = entry;

  if (g === "forgot") {
    lapses += 1;
    reps = 0;
    intervalDays = 0;
    ease = Math.max(1.3, ease - 0.2);
  } else if (g === "hard") {
    reps += 1;
    if (reps === 1) intervalDays = 1;
    else intervalDays = Math.max(1, Math.round(intervalDays * 1.2));
    ease = Math.max(1.3, ease - 0.15);
  } else {
    reps += 1;
    if (reps === 1) intervalDays = 2;
    else if (reps === 2) intervalDays = 5;
    else intervalDays = Math.round(intervalDays * ease);
    ease = Math.min(3.0, ease + 0.1);
  }

  return {
    ...entry,
    ease,
    intervalDays,
    reps,
    lapses,
    dueAt: now + intervalDays * DAY_MS,
  };
}

export { normalize as normalizeWord, keyOf as vocabKey };
