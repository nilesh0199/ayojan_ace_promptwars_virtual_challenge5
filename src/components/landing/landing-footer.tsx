'use client';

import React from 'react';
import Link from 'next/link';
import { APP_NAME, AUTHOR_NAME, CONTACT_LINKS } from '@/lib/constants';
import { ExternalLink } from 'lucide-react';

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      aria-label="Site Footer"
      className="w-full border-t border-[#0F172A]/10 dark:border-[#F8FAFC]/10 bg-[#F4F1EA] dark:bg-[#0A1128] py-12 sm:py-16 transition-colors"
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4">
            <Link
              href="/"
              className="flex items-center gap-3 w-fit group"
              aria-label="Aayojan Ace Home"
            >
              <div
                className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#E11D48] via-[#D11138] to-[#9F1239] border-t border-white/30 flex items-center justify-center text-white font-serif font-black text-xl shadow-xs"
                aria-label="Aayojan Ace Brand Emblem"
              >
                A
              </div>
              <span className="font-serif font-bold text-xl sm:text-2xl tracking-tight text-[#0F172A] dark:text-[#F8FAFC] leading-[1.2] descender-safe">
                Aayojan <span className="text-[#E11D48] dark:text-[#FB7185]">Ace</span>
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-[#334155] dark:text-[#CBD5E1] max-w-sm leading-relaxed">
              Intelligent celebration and event planning companion tailored for Indian and multicultural festivities. Built for PromptWars Challenge 5.
            </p>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-4 space-y-3">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#E11D48] dark:text-[#FB7185] block">
              Application Navigation
            </span>
            <ul className="grid grid-cols-2 gap-2 text-xs sm:text-sm text-[#334155] dark:text-[#CBD5E1]">
              <li>
                <Link href="/" className="hover:text-[#E11D48] dark:hover:text-[#FB7185] transition-colors py-1 inline-block min-h-[36px] flex items-center">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/plan" className="hover:text-[#E11D48] dark:hover:text-[#FB7185] transition-colors py-1 inline-block min-h-[36px] flex items-center">
                  Plan Creator
                </Link>
              </li>
              <li>
                <Link href="/workspace" className="hover:text-[#E11D48] dark:hover:text-[#FB7185] transition-colors py-1 inline-block min-h-[36px] flex items-center">
                  Workspace
                </Link>
              </li>
              <li>
                <Link href="/saved" className="hover:text-[#E11D48] dark:hover:text-[#FB7185] transition-colors py-1 inline-block min-h-[36px] flex items-center">
                  Saved Plans
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#E11D48] dark:hover:text-[#FB7185] transition-colors py-1 inline-block min-h-[36px] flex items-center">
                  About
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#E11D48] dark:hover:text-[#FB7185] transition-colors py-1 inline-block min-h-[36px] flex items-center">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#E11D48] dark:hover:text-[#FB7185] transition-colors py-1 inline-block min-h-[36px] flex items-center">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Creator & Links */}
          <div className="md:col-span-3 space-y-3">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#E11D48] dark:text-[#FB7185] block">
              Creator &amp; Repository
            </span>
            <div className="space-y-2 text-xs sm:text-sm text-[#334155] dark:text-[#CBD5E1]">
              <p>Designed and built by <strong className="text-[#0F172A] dark:text-[#F8FAFC]">{AUTHOR_NAME}</strong>.</p>
              <div className="flex flex-col gap-2 pt-1">
                <a
                  href={CONTACT_LINKS.linkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Connect with ${AUTHOR_NAME} on LinkedIn (opens in a new tab)`}
                  className="inline-flex items-center gap-1.5 hover:text-[#E11D48] dark:hover:text-[#FB7185] transition-colors min-h-[36px]"
                >
                  <svg className="h-4 w-4 fill-current text-[#0A66C2] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
                  </svg>
                  <span>LinkedIn Profile</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
                <a
                  href={CONTACT_LINKS.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub Repository: View source repository on GitHub (opens in a new tab)"
                  className="inline-flex items-center gap-1.5 hover:text-[#E11D48] dark:hover:text-[#FB7185] transition-colors min-h-[36px]"
                >
                  <svg className="h-4 w-4 fill-current text-[#0F172A] dark:text-[#F8FAFC] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>GitHub Repository</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Line */}
        <div className="pt-6 border-t border-[#0F172A]/10 dark:border-[#F8FAFC]/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#334155]/80 dark:text-[#94A3B8]">
          <p>© {currentYear} {APP_NAME} · Crafted with pride by {AUTHOR_NAME} for PromptWars Challenge 5.</p>
          <p className="font-mono text-[11px]">Strict Math · Cultural Nuance · Multi-Tier AI</p>
        </div>
      </div>
    </footer>
  );
}
