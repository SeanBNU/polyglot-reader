"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Library", icon: "📚" },
  { href: "/vocab", label: "Vocab", icon: "📖" },
  { href: "/review", label: "Review", icon: "🎯" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur">
      <ul className="flex max-w-md mx-auto">
        {TABS.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/" || /^\/(es|de|fr)/.test(pathname)
              : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-1 py-3 text-xs ${
                  active ? "text-white" : "text-neutral-500"
                }`}
              >
                <span className="text-xl leading-none">{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
