import { notFound } from "next/navigation";
import { LANGUAGES, type Lang } from "@/lib/types";
import { getBook } from "@/data/library";
import { Reader } from "@/components/Reader";
import { TopBar } from "@/components/TopBar";

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
    <>
      <TopBar
        back={`/${lang}/${category}/${bookId}`}
        backLabel={book.title}
        title={book.title}
        subtitle={`${book.author} · ${langMeta.native}`}
      />
      <div className="max-w-md mx-auto px-5 pt-5 pb-32">
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
    </>
  );
}
