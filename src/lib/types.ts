export type Lang = "es" | "de" | "fr";

export type Category = "short-stories" | "originals" | "translated-classics";

export interface Book {
  id: string;
  title: string;
  author: string;
  category: Category;
  blurb: string;
  text: string;
  sourceUrl?: string;
  sourceLabel?: string;
}

export const LANGUAGES: { code: Lang; name: string; native: string; flag: string }[] = [
  { code: "es", name: "Spanish", native: "Español", flag: "ES" },
  { code: "de", name: "German", native: "Deutsch", flag: "DE" },
  { code: "fr", name: "French", native: "Français", flag: "FR" },
];

export const CATEGORIES: { code: Category; label: string; description: string }[] = [
  {
    code: "short-stories",
    label: "Short Stories",
    description: "Bite-sized public-domain tales for quick reads.",
  },
  {
    code: "originals",
    label: "Originals & Classics",
    description: "Foundational works written in this language.",
  },
  {
    code: "translated-classics",
    label: "Translated Classics",
    description: "Foreign classics rendered into this language.",
  },
];

export interface VocabEntry {
  word: string;
  normalized: string;
  translation: string;
  lang: Lang;
  context?: string;
  bookId?: string;
  addedAt: number;
  // SM-2 lite
  ease: number;
  intervalDays: number;
  dueAt: number;
  reps: number;
  lapses: number;
}

export type ReviewGrade = "forgot" | "hard" | "easy";
