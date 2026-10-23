'use client';

import React from 'react';

interface GoogleSignInButtonProps {
  onClick: () => unknown;
  disabled?: boolean;
  className?: string;
  label?: string;
}

/**
 * Official Google-branded sign-in button built strictly to Google's Identity Branding Guidelines:
 * - Official multicolor 'G' logo rendered as an inline vector SVG (100% CSP compliant, zero external image requests)
 * - Required "Sign in with Google" standard label
 * - Light variant for light theme, dark variant for dark theme
 * - Accessible name, keyboard navigation support, and min-height 44px
 */
export function GoogleSignInButton({
  onClick,
  disabled = false,
  className = '',
  label = 'Sign in with Google',
}: GoogleSignInButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`group relative flex min-h-[44px] w-full items-center justify-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all shadow-xs border focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed bg-white text-[#1F1F1F] border-[#747775]/40 hover:bg-[#F8F9FA] hover:border-[#747775] dark:bg-[#131314] dark:text-[#E3E3E3] dark:border-[#8E918F]/50 dark:hover:bg-[#202124] dark:hover:border-[#8E918F] ${className}`}
    >
      {/* Official Multicolor Google G Icon (Inline SVG) */}
      <svg
        className="h-5 w-5 shrink-0"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="#4285F4"
          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        />
      </svg>

      <span className="truncate">{label}</span>
    </button>
  );
}
