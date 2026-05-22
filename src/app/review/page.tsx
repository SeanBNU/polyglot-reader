"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useVocab } from "@/lib/vocab";
import type { ReviewGrade, VocabEntry } from "@/lib/types";

export default function ReviewPage() {
  const { dueNow, grade, hydrated } = useVocab();
  const [queue, setQueue] = useState<VocabEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionDone, setSessionDone] = useState(0);

  useEffect(() => {
    if (!hydrated) return;
    if (queue.length === 0 && index === 0 && !sessionDone) {
      setQueue(dueNow());
    }
  }, [hydrated, queue.length, index, sessionDone, dueNow]);

  const current = queue[index];
  const remaining = useMemo(
    () => Math.max(0, queue.length - index),
    [queue.length, index]
  );

  function handleGrade(g: ReviewGrade) {
    if (!current) return;
    grade(current.word, current.lang, g);
    setSessionDone((s) => s + 1);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  function startNewSession() {
    setQueue(dueNow());
    setIndex(0);
    setRevealed(false);
  }

  if (!hydrated) {
    return (
      <div className="max-w-md mx-auto px-5 pt-10">
        <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
        <p className="text-neutral-400 mt-4">Loading…</p>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="max-w-md mx-auto px-5 pt-6 pb-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
        </header>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">
          <div className="text-3xl mb-2">{sessionDone > 0 ? "🎉" : "✨"}</div>
          <div className="text-neutral-100 font-medium text-lg">
            {sessionDone > 0
              ? `Session complete — ${sessionDone} reviewed`
              : "Nothing due right now"}
          </div>
          <div className="text-sm text-neutral-500 mt-1">
            {sessionDone > 0
              ? "Check back tomorrow for the next round."
              : "Save words while reading to build your review queue."}
          </div>
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={startNewSession}
              className="rounded-xl border border-neutral-700 text-center py-3 font-medium active:bg-neutral-800"
            >
              Refresh queue
            </button>
            <Link
              href="/"
              className="rounded-xl bg-white text-black text-center py-3 font-medium active:bg-neutral-200"
            >
              Browse library
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-5 pt-6 pb-8">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
        <div className="text-xs text-neutral-500">
          {remaining} left · {sessionDone} done
        </div>
      </header>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 min-h-[280px] flex flex-col">
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          {current.lang.toUpperCase()}
        </div>
        <div className="text-3xl font-semibold mt-3 break-words">
          {current.word}
        </div>
        {current.context && (
          <div className="text-xs text-neutral-500 mt-2 italic line-clamp-2">
            …{current.context.trim()}…
          </div>
        )}

        <div className="mt-6 border-t border-neutral-800 pt-4 flex-1">
          {revealed ? (
            <div className="text-xl text-neutral-100">{current.translation}</div>
          ) : (
            <button
              onClick={() => setRevealed(true)}
              className="w-full text-center text-neutral-500 py-6"
            >
              Tap to reveal
            </button>
          )}
        </div>
      </div>

      {revealed && (
        <div className="mt-5 grid grid-cols-3 gap-2">
          <button
            onClick={() => handleGrade("forgot")}
            className="rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 py-3 font-medium active:bg-red-500/30"
          >
            Forgot
          </button>
          <button
            onClick={() => handleGrade("hard")}
            className="rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 py-3 font-medium active:bg-amber-500/30"
          >
            Hard
          </button>
          <button
            onClick={() => handleGrade("easy")}
            className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 py-3 font-medium active:bg-emerald-500/30"
          >
            Easy
          </button>
        </div>
      )}

      {!revealed && (
        <div className="mt-5 text-center text-xs text-neutral-600">
          Recall the meaning, then reveal.
        </div>
      )}
    </div>
  );
}
