import Link from "next/link";
import type { ReactNode } from "react";

interface TopBarProps {
  back?: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
  right?: ReactNode;
}

export function TopBar({ back, backLabel, title, subtitle, right }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-neutral-950/85 backdrop-blur border-b border-neutral-900">
      <div className="max-w-md mx-auto px-3 h-14 flex items-center gap-2">
        {back ? (
          <Link
            href={back}
            aria-label={backLabel ? `Back to ${backLabel}` : "Back"}
            className="flex items-center justify-center w-11 h-11 rounded-full text-neutral-200 active:bg-neutral-800 transition shrink-0"
          >
            <ChevronLeft />
          </Link>
        ) : (
          <div className="w-11 h-11 shrink-0" aria-hidden="true" />
        )}

        <div className="flex-1 min-w-0">
          {title && (
            <div className="text-sm font-semibold truncate leading-tight">
              {title}
            </div>
          )}
          {subtitle && (
            <div className="text-xs text-neutral-500 truncate leading-tight mt-0.5">
              {subtitle}
            </div>
          )}
        </div>

        {right ? (
          <div className="shrink-0">{right}</div>
        ) : (
          <div className="w-11 h-11 shrink-0" aria-hidden="true" />
        )}
      </div>
    </header>
  );
}

function ChevronLeft() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
