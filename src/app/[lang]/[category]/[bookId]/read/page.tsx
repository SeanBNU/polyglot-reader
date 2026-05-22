import Link from "next/link";
import { notFound } from "next/navigation";
import { LANGUAGES, type Lang } from "@/lib/types";
import { getBook } from "@/data/library";
import { Reader } from "@/components/Reader";

export default async function ReadPage({
  params,
}: {
  params: Promise<{ lang: string; category: string; bookId: string }>;
}) {
  const { lang, category, bookId } = await params;
  const langMeta = LANGUAGES.find((l) => l.code === lang);
  const book = getBook(lang as Lang, bookId);
  if (!langMeta || !book) notFound();

  return (
    <div className="max-w-md mx-auto px-5 pt-4 pb-32">
      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/${lang}/${category}/${bookId}`}
          className="inline-flex items-center gap-1 text-sm text-neutral-400"
        >
          ← Back
        </Link>
        <div className="text-xs text-neutral-500">{langMeta.native}</div>
      </div>

      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">{book.title}</h1>
        <div className="text-sm text-neutral-500">{book.author}</div>
      </header>

      <Reader book={book} lang={lang as Lang} />

      {book.sourceUrl && (
        <div className="mt-8 pt-6 border-t border-neutral-800 text-center">
          <a
            href={book.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-neutral-500 underline"
          >
            Continue reading on {book.sourceLabel ?? "source"} →
          </a>
        </div>
      )}
    </div>
  );
}
