import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CATEGORIES,
  LANGUAGES,
  type Category,
  type Lang,
} from "@/lib/types";
import { LIBRARY } from "@/data/library";
import { TopBar } from "@/components/TopBar";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ lang: string; category: string }>;
}) {
  const { lang, category } = await params;
  const langMeta = LANGUAGES.find((l) => l.code === lang);
  const catMeta = CATEGORIES.find((c) => c.code === category);
  if (!langMeta || !catMeta) notFound();

  const books = (LIBRARY[lang as Lang] ?? []).filter(
    (b) => b.category === (category as Category)
  );

  return (
    <>
      <TopBar
        back={`/${lang}`}
        backLabel={langMeta.native}
        title={catMeta.label}
        subtitle={langMeta.native}
      />
      <div className="max-w-md mx-auto px-5 pt-6 pb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{catMeta.label}</h1>
        <p className="text-neutral-400 text-sm mt-1">{catMeta.description}</p>

        <div className="mt-6 grid grid-cols-1 gap-3">
          {books.length === 0 && (
            <div className="text-sm text-neutral-500 py-8 text-center">
              No books in this category yet.
            </div>
          )}
          {books.map((book) => (
            <Link
              key={book.id}
              href={`/${lang}/${category}/${book.id}`}
              className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 active:bg-neutral-800 transition"
            >
              <div className="text-base font-medium">{book.title}</div>
              <div className="text-sm text-neutral-500 mt-0.5">{book.author}</div>
              <div className="text-sm text-neutral-400 mt-2">{book.blurb}</div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
