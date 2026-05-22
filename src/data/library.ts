import type { Book, Lang } from "@/lib/types";
import { es } from "./texts/es";
import { de } from "./texts/de";
import { fr } from "./texts/fr";

export const LIBRARY: Record<Lang, Book[]> = { es, de, fr };

export function getBook(lang: Lang, id: string): Book | undefined {
  return LIBRARY[lang]?.find((b) => b.id === id);
}
