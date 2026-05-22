import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, LANGUAGES, type Lang } from "@/lib/types";
import { LIBRARY } from "@/data/library";

export function generateStaticParams() {
  return LANGUAGES.map((l) => ({ lang: l.code }));
}

export default async function LanguagePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const meta = LANGUAGES.find((l) => l.code === lang);
  if (!meta) notFound();
  const books = LIBRARY[lang as Lang] ?? [];

  return (
    <div className="max-w-md mx-auto px-5 pt-6 pb-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 mb-4"
      >
        ← Library
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">{meta.native}</h1>
      <p className="text-neutral-400 text-sm mt-1">{meta.name}</p>

      <div className="mt-8 grid grid-cols-1 gap-3">
        {CATEGORIES.map((cat) => {
          const count = books.filter((b) => b.category === cat.code).length;
          return (
            <Link
              key={cat.code}
              href={`/${lang}/${cat.code}`}
              className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 active:bg-neutral-800 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-medium">{cat.label}</div>
                  <div className="text-sm text-neutral-500 mt-1">
                    {cat.description}
                  </div>
                </div>
                <div className="shrink-0 text-xs text-neutral-500 bg-neutral-800 px-2 py-1 rounded-full">
                  {count}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
