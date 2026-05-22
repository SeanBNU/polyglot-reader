"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Book, Lang } from "@/lib/types";
import { useVocab } from "@/lib/vocab";
import { getStoredProgress, saveStoredProgress } from "@/lib/progress";

interface Token {
  text: string;
  isWord: boolean;
  index: number;
}

function tokenize(text: string): Token[] {
  const out: Token[] = [];
  const regex = /([\p{L}\p{M}''\-]+)|([^\p{L}\p{M}''\-]+)/gu;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m[1]) out.push({ text: m[1], isWord: true, index: i++ });
    else if (m[2]) out.push({ text: m[2], isWord: false, index: i++ });
  }
  return out;
}

interface ReaderProps {
  book: Book;
  lang: Lang;
}

export function Reader({ book, lang }: ReaderProps) {
  const chapters = book.chapters;
  const totalChapters = chapters?.length ?? 1;

  const [chapterIndex, setChapterIndex] = useState(0);
  const [progressRestored, setProgressRestored] = useState(false);

  // Restore saved chapter on mount
  useEffect(() => {
    if (!chapters) { setProgressRestored(true); return; }
    const saved = getStoredProgress(lang, book.id);
    if (saved && saved.chapterIndex < chapters.length) {
      setChapterIndex(saved.chapterIndex);
    }
    setProgressRestored(true);
  }, [lang, book.id, chapters]);

  // Save progress whenever chapter changes (after initial restore)
  useEffect(() => {
    if (!chapters || !progressRestored) return;
    saveStoredProgress(lang, book.id, { chapterIndex, lastRead: Date.now() });
  }, [chapterIndex, lang, book.id, chapters, progressRestored]);

  const currentText = chapters ? chapters[chapterIndex].text : (book.text ?? "");
  const tokens = useMemo(() => tokenize(currentText), [currentText]);

  const { upsert, has, get } = useVocab();
  const [active, setActive] = useState<{ word: string; index: number } | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);

  // Dismiss popover on outside tap
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      const tappedWord = (target as HTMLElement)?.dataset?.word;
      if (tappedWord) return;
      setActive(null);
      setTranslation(null);
      setError(null);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [active]);

  // Scroll to top when chapter changes
  useEffect(() => {
    articleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(null);
    setTranslation(null);
    setError(null);
  }, [chapterIndex]);

  async function onWordTap(word: string, index: number) {
    setActive({ word, index });
    setError(null);
    const cached = get(word, lang);
    if (cached?.translation) {
      setTranslation(cached.translation);
      return;
    }
    setLoading(true);
    setTranslation(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: word, sourceLang: lang, targetLang: "EN" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Translation failed");
      setTranslation(data.translation);
      upsert({
        word,
        lang,
        translation: data.translation,
        bookId: book.id,
        context: contextAround(tokens, index),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setLoading(false);
    }
  }

  function goToChapter(idx: number) {
    setChapterIndex(Math.max(0, Math.min(totalChapters - 1, idx)));
  }

  const chapterTitle = chapters?.[chapterIndex]?.title;

  return (
    <div className="relative">
      {chapters && (
        <div className="flex items-center justify-between mb-6 gap-3">
          <button
            onClick={() => goToChapter(chapterIndex - 1)}
            disabled={chapterIndex === 0}
            className="px-3 py-1.5 rounded-lg border border-neutral-700 text-sm text-neutral-400 disabled:opacity-30 active:bg-neutral-800"
            aria-label="Previous chapter"
          >
            ← Prev
          </button>
          <div className="text-center min-w-0">
            <div className="text-xs text-neutral-500">
              {chapterIndex + 1} / {totalChapters}
            </div>
            {chapterTitle && (
              <div className="text-xs text-neutral-400 mt-0.5 truncate max-w-[180px]">
                {chapterTitle}
              </div>
            )}
          </div>
          <button
            onClick={() => goToChapter(chapterIndex + 1)}
            disabled={chapterIndex === totalChapters - 1}
            className="px-3 py-1.5 rounded-lg border border-neutral-700 text-sm text-neutral-400 disabled:opacity-30 active:bg-neutral-800"
            aria-label="Next chapter"
          >
            Next →
          </button>
        </div>
      )}

      <article
        ref={articleRef}
        className="text-lg leading-loose text-neutral-100 select-text"
      >
        {tokens.map((t) => {
          if (!t.isWord) return <span key={t.index}>{t.text}</span>;
          const saved = has(t.text, lang);
          const isActive = active?.index === t.index;
          return (
            <span
              key={t.index}
              data-word={t.text}
              onClick={() => onWordTap(t.text, t.index)}
              className={`cursor-pointer rounded-md px-0.5 -mx-0.5 transition ${
                isActive
                  ? "bg-yellow-400/30 text-yellow-100"
                  : saved
                  ? "underline decoration-dotted decoration-emerald-500/70 underline-offset-4"
                  : "hover:bg-neutral-800"
              }`}
            >
              {t.text}
            </span>
          );
        })}
      </article>

      {chapters && (
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-neutral-800 gap-3">
          <button
            onClick={() => goToChapter(chapterIndex - 1)}
            disabled={chapterIndex === 0}
            className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-sm text-neutral-400 disabled:opacity-30 active:bg-neutral-800"
          >
            ← Previous
          </button>
          <button
            onClick={() => goToChapter(chapterIndex + 1)}
            disabled={chapterIndex === totalChapters - 1}
            className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-sm text-neutral-400 disabled:opacity-30 active:bg-neutral-800"
          >
            Next →
          </button>
        </div>
      )}

      {active && (
        <div
          ref={popoverRef}
          className="fixed bottom-24 inset-x-4 z-50 max-w-md mx-auto rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-neutral-500">
                {lang.toUpperCase()} → EN
              </div>
              <div className="text-xl font-semibold mt-0.5 truncate">{active.word}</div>
            </div>
            <button
              onClick={() => { setActive(null); setTranslation(null); setError(null); }}
              className="text-neutral-500 text-xl leading-none px-2"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="mt-3 min-h-[2.5rem]">
            {loading && <div className="text-neutral-400 text-sm">Translating…</div>}
            {error && <div className="text-red-400 text-sm">{error}</div>}
            {translation && !loading && (
              <div className="text-base text-neutral-100">{translation}</div>
            )}
          </div>
          <div className="mt-3 text-xs text-emerald-400">✓ Saved to vocab</div>
        </div>
      )}
    </div>
  );
}

function contextAround(tokens: Token[], index: number, span = 8): string {
  const start = Math.max(0, index - span);
  const end = Math.min(tokens.length, index + span);
  return tokens.slice(start, end).map((t) => t.text).join("");
}
