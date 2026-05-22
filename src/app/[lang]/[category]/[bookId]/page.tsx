import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, LANGUAGES, type Lang } from "@/lib/types";
import { getBook } from "@/data/library";

export default async function BookPage({
  params,
}: {
  params: Promise<{ lang: string; category: string; bookId: string }>;
}) {
  const { lang, category, bookId } = await params;
  const langMeta = LANGUAGES.find((l) => l.code === lang);
  const catMeta = CATEGORIES.find((c) => c.code === category);
  const book = getBook(lang as Lang, bookId);
  if (!langMeta || !catMeta || !book) notFound();

  const wordCount = book.text.split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-md mx-auto px-5 pt-6 pb-8">
      <Link
        href={`/${lang}/${category}`}
        className="inline-flex items-center gap-1 text-sm text-neutral-400 mb-4"
      >
        ← {catMeta.label}
      </Link>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          {langMeta.native} · {catMeta.label}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mt-2">
          {book.title}
        </h1>
        <div className="text-neutral-400 text-sm mt-1">{book.author}</div>
        <p className="text-neutral-300 text-sm mt-4 leading-relaxed">
          {book.blurb}
        </p>
        <div className="text-xs text-neutral-500 mt-4">
          ~{wordCount} words excerpt
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="text-lg font-medium">Read now?</div>
        <p className="text-sm text-neutral-400 mt-1">
          Tap any word while reading to translate and save it to your vocab.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link
            href={`/${lang}/${category}/${bookId}/read`}
            className="rounded-xl bg-white text-black text-center py-3 font-medium active:bg-neutral-200"
          >
            Yes, read
          </Link>
          <Link
            href={`/${lang}/${category}`}
            className="rounded-xl border border-neutral-700 text-center py-3 font-medium active:bg-neutral-800"
          >
            Not now
          </Link>
        </div>
        {book.sourceUrl && (
          <a
            href={book.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-4 text-xs text-neutral-500 underline text-center"
          >
            Read full text on {book.sourceLabel ?? "source"} →
          </a>
        )}
      </div>
    </div>
  );
}
