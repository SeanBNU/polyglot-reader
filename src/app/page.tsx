import Link from "next/link";
import { LANGUAGES } from "@/lib/types";

export default function Home() {
  return (
    <div className="max-w-md mx-auto px-5 pt-10 pb-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Polyglot Reader</h1>
        <p className="text-neutral-400 mt-2 text-sm">
          Read stories. Tap words. Build a vocabulary that sticks.
        </p>
      </header>

      <section>
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
          Choose a language
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {LANGUAGES.map((lang) => (
            <Link
              key={lang.code}
              href={`/${lang.code}`}
              className="flex items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 px-5 py-5 active:bg-neutral-800 transition"
            >
              <div className="text-3xl font-bold tracking-tight w-10 text-neutral-400">
                {lang.flag}
              </div>
              <div className="flex-1">
                <div className="text-lg font-medium">{lang.native}</div>
                <div className="text-sm text-neutral-500">{lang.name}</div>
              </div>
              <div className="text-neutral-600">→</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/review"
            className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-5 active:bg-neutral-800 transition"
          >
            <div className="text-2xl mb-1">🎯</div>
            <div className="font-medium">Review</div>
            <div className="text-xs text-neutral-500 mt-1">Practice saved words</div>
          </Link>
          <Link
            href="/vocab"
            className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-5 active:bg-neutral-800 transition"
          >
            <div className="text-2xl mb-1">📖</div>
            <div className="font-medium">Vocab</div>
            <div className="text-xs text-neutral-500 mt-1">All your saved words</div>
          </Link>
        </div>
      </section>
    </div>
  );
}
