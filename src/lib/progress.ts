"use client";

import { useCallback, useEffect, useState } from "react";
import type { Lang, ReadingProgress } from "./types";

const STORAGE_KEY = "polyglot-reader.progress.v1";

type ProgressMap = Record<string, ReadingProgress>;

function progressKey(lang: Lang, bookId: string): string {
  return `${lang}:${bookId}`;
}

function loadAll(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProgressMap;
  } catch {
    return {};
  }
}

function saveAll(data: ProgressMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getStoredProgress(lang: Lang, bookId: string): ReadingProgress | null {
  return loadAll()[progressKey(lang, bookId)] ?? null;
}

export function saveStoredProgress(lang: Lang, bookId: string, p: ReadingProgress) {
  const all = loadAll();
  all[progressKey(lang, bookId)] = p;
  saveAll(all);
}

export function clearStoredProgress(lang: Lang, bookId: string) {
  const all = loadAll();
  delete all[progressKey(lang, bookId)];
  saveAll(all);
}

export function useProgress(lang: Lang, bookId: string) {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProgress(getStoredProgress(lang, bookId));
    setHydrated(true);
  }, [lang, bookId]);

  const save = useCallback(
    (p: ReadingProgress) => {
      saveStoredProgress(lang, bookId, p);
      setProgress(p);
    },
    [lang, bookId]
  );

  const clear = useCallback(() => {
    clearStoredProgress(lang, bookId);
    setProgress(null);
  }, [lang, bookId]);

  return { progress, hydrated, save, clear };
}
