'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-context';
import { ThemeToggle } from './theme-toggle';
import { APP_NAME } from '@/lib/constants';
import {
  Sparkles,
  LayoutDashboard,
  BookmarkCheck,
  ShieldAlert,
  FileText,
  LogIn,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

export function DesktopNavRail() {
  const pathname = usePathname();
  const { user, signIn, signOut, loading } = useAuth();

  const navItems = [
    { href: '/', label: 'Plan Creator', icon: Sparkles },
    { href: '/workspace', label: 'Workspace', icon: LayoutDashboard },
    { href: '/saved', label: 'Saved Plans', icon: BookmarkCheck },
    { href: '/privacy', label: 'Privacy', icon: ShieldAlert },
    { href: '/terms', label: 'Terms', icon: FileText },
  ];

  return (
    <aside
      aria-label="Desktop primary navigation rail"
      className="hidden md:flex flex-col justify-between w-64 shrink-0 border-r border-rule bg-paper-card/70 backdrop-blur-md h-full p-5 overflow-hidden select-none no-print"
    >
      <div className="flex flex-col min-h-0 overflow-y-auto">
        {/* Brand Header */}
        <div className="flex items-center gap-3 pb-6 border-b border-rule shrink-0">
          <div
            className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center text-accent-text font-serif font-black text-xl shadow-xs"
            aria-label="Aayojan Ace Brand Emblem"
          >
            A
          </div>
          <div>
            <span
              className="font-serif font-bold text-xl tracking-tight text-ink block leading-none"
              aria-label="Aayojan Ace"
            >
              Aayojan <span className="text-accent">Ace</span>
            </span>
            <span className="text-[11px] font-sans text-ink-muted tracking-wider uppercase mt-1 block">
              Planner&apos;s Notebook
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="mt-6 flex flex-col gap-1.5" aria-label="Main menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                  isActive
                    ? 'bg-accent-subtle text-accent font-semibold border-l-2 border-accent'
                    : 'text-ink-muted hover:text-ink hover:bg-paper-subtle'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls & User Status - Fixed direct visibility at left bottom */}
      <div className="pt-4 border-t border-rule flex flex-col gap-3 shrink-0">
        {/* User Card */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded-full bg-paper-subtle border border-rule flex items-center justify-center text-ink-muted shrink-0">
              <UserIcon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="truncate">
              {user ? (
                <>
                  <p className="text-xs font-medium text-ink truncate">
                    {user.displayName || 'Account'}
                  </p>
                  <p className="text-[10px] text-ink-faint truncate">{user.email}</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium text-ink">Guest Mode</p>
                  <span className="inline-block text-[10px] font-mono text-marigold bg-marigold-subtle px-1.5 py-0.5 rounded">
                    Local Session
                  </span>
                </>
              )}
            </div>
          </div>

          {!loading && (
            user ? (
              <button
                type="button"
                onClick={signOut}
                title="Sign out"
                aria-label="Sign out"
                className="p-1.5 rounded-md text-ink-muted hover:text-state-error hover:bg-paper-subtle transition-colors"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={signIn}
                title="Sign in with Google"
                aria-label="Sign in with Google"
                className="p-1.5 rounded-md text-ink-muted hover:text-accent hover:bg-accent-subtle transition-colors"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
              </button>
            )
          )}
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-medium text-ink-muted">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

export function MobileNavBar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Plan', icon: Sparkles },
    { href: '/workspace', label: 'Workspace', icon: LayoutDashboard },
    { href: '/saved', label: 'Saved', icon: BookmarkCheck },
    { href: '/privacy', label: 'Privacy', icon: ShieldAlert },
  ];

  return (
    <nav
      aria-label="Mobile bottom navigation bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-paper-card/95 backdrop-blur-md border-t border-rule pb-safe shadow-lg no-print"
    >
      <div className="grid grid-cols-4 h-16 items-center px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-h-[44px] py-1 text-[11px] font-medium transition-colors ${
                isActive
                  ? 'text-accent font-semibold'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Icon className="h-5 w-5 mb-1" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
