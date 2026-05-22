"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/types";
import { getStoredProgress, clearStoredProgress } from "@/lib/progress";

interface ReadingCTAProps {
  lang: Lang;
  bookId: string;
  category: string;
  chapterCount: number | null;
  readHref: string;
  backHref: string;
  sourceUrl?: string;
  sourceLabel?: string;
}

export function ReadingCTA({
  lang,
  bookId,
  chapterCount,
  readHref,
  backHref,
  sourceUrl,
  sourceLabel,
}: ReadingCTAProps) {
  const [savedChapter, setSavedChapter] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const p = getStoredProgress(lang, bookId);
    setSavedChapter(p ? p.chapterIndex : null);
    setHydrated(true);
  }, [lang, bookId]);

  const hasProgress = hydrated && savedChapter !== null && savedChapter > 0;
  const continueLabel =
    chapterCount !== null && savedChapter !== null
      ? `Continue (ch. ${savedChapter + 1})`
      : "Continue reading";

  return (
    <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <div className="text-lg font-medium">Read now?</div>
      <p className="text-sm text-neutral-400 mt-1">
        Tap any word while reading to translate and save it to your vocab.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {hasProgress ? (
          <>
            <Link
              href={readHref}
              className="rounded-xl bg-white text-black text-center py-3 font-medium active:bg-neutral-200 text-sm"
            >
              {continueLabel}
            </Link>
            <button
              onClick={() => {
                clearStoredProgress(lang, bookId);
                setSavedChapter(null);
              }}
              className="rounded-xl border border-neutral-700 text-center py-3 font-medium active:bg-neutral-800 text-sm text-neutral-400"
            >
              Start over
            </button>
          </>
        ) : (
          <>
            <Link
              href={readHref}
              className="rounded-xl bg-white text-black text-center py-3 font-medium active:bg-neutral-200"
            >
              {hydrated ? "Start reading" : "Read"}
            </Link>
            <Link
              href={backHref}
              className="rounded-xl border border-neutral-700 text-center py-3 font-medium active:bg-neutral-800"
            >
              Not now
            </Link>
          </>
        )}
      </div>
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-4 text-xs text-neutral-500 underline text-center"
        >
          View source on {sourceLabel ?? "source"} →
        </a>
      )}
    </div>
  );
}
