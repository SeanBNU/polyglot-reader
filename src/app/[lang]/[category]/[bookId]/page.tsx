import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, LANGUAGES, bookWordCount, type Lang } from "@/lib/types";
import { getBook } from "@/data/library";
import { TopBar } from "@/components/TopBar";
import { ReadingCTA } from "@/components/ReadingCTA";

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

  const wordCount = bookWordCount(book);
  const chapterCount = book.chapters?.length ?? null;

  return (
    <>
      <TopBar
        back={`/${lang}/${category}`}
        backLabel={catMeta.label}
        title={book.title}
        subtitle={book.author}
      />
      <div className="max-w-md mx-auto px-5 pt-6 pb-8">
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
            ~{wordCount.toLocaleString()} words
            {chapterCount !== null && ` · ${chapterCount} chapters`}
          </div>
        </div>

        <ReadingCTA
          lang={lang as Lang}
          bookId={bookId}
          category={category}
          chapterCount={chapterCount}
          readHref={`/${lang}/${category}/${bookId}/read`}
          backHref={`/${lang}/${category}`}
          sourceUrl={book.sourceUrl}
          sourceLabel={book.sourceLabel}
        />
      </div>
    </>
  );
}
