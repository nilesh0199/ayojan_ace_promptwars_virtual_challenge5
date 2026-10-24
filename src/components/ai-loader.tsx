'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, X, Clock } from 'lucide-react';

export interface AiLoaderProps {
  title?: string;
  messages?: string[];
  onCancel?: () => void;
  className?: string;
  cancelLabel?: string;
}

const DEFAULT_MESSAGES = [
  'Gathering cultural nuances...',
  'Balancing budget categories...',
  'Sequencing your timeline milestones...',
  'Curating vendor interview questions...',
  'Polishing your personalized celebration plan...',
];

export function AiLoader({
  title = 'Crafting Your Celebration Plan',
  messages = DEFAULT_MESSAGES,
  onCancel,
  className = '',
  cancelLabel = 'Cancel generation',
}: AiLoaderProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showPatienceNotice, setShowPatienceNotice] = useState(false);

  // Cycle messages every 2.5 seconds
  useEffect(() => {
    if (!messages || messages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % messages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [messages]);

  // Show extended notice after 10 seconds of processing
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPatienceNotice(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const activeMessage = messages[currentIdx] || messages[0] || 'Planning your celebration...';

  return (
    <div
      className={`rounded-2xl border border-accent/30 bg-paper-card p-8 text-center space-y-6 shadow-sm transition-all ${className}`}
      data-testid="ai-loader"
    >
      {/* Stable Screen Reader Announcement - announced once to avoid spamming screen readers */}
      <div role="status" className="sr-only">
        {title}. Working on your request, please wait.
      </div>

      {/* Visual Spinner with Celebration Sparkle */}
      <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
        {/* Outer rotating decorative ring - disabled on prefers-reduced-motion */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-4 border-accent/20 border-t-accent animate-spin motion-reduce:animate-none motion-reduce:border-accent"
        />
        {/* Inner pulsing glow ring */}
        <div
          aria-hidden="true"
          className="absolute inset-1.5 rounded-full border border-marigold/40 animate-pulse motion-reduce:animate-none"
        />
        {/* Central Icon */}
        <div
          aria-hidden="true"
          className="relative text-accent flex items-center justify-center"
        >
          <Sparkles className="h-7 w-7 transition-transform motion-reduce:scale-100" />
        </div>
      </div>

      {/* Main Title */}
      <div className="space-y-1">
        <h3 className="font-serif font-bold text-lg sm:text-xl text-ink tracking-tight">
          {title}
        </h3>
        {/* Cycling Status Message - hidden from screen readers to prevent voiceover interruptions */}
        <p
          aria-hidden="true"
          className="text-sm font-medium text-accent h-6 transition-all duration-300 ease-in-out"
        >
          {activeMessage}
        </p>
      </div>

      {/* 10-Second Calming Reassurance */}
      {showPatienceNotice && (
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-paper-subtle border border-rule text-xs text-ink-muted animate-fadeIn"
          data-testid="patience-notice"
        >
          <Clock className="h-3.5 w-3.5 text-accent shrink-0" aria-hidden="true" />
          <span>Crafting a comprehensive plan can take a moment. Thank you for your patience!</span>
        </div>
      )}

      {/* Optional User Abort / Cancel Button */}
      {onCancel && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onCancel}
            aria-label={cancelLabel}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-rule bg-paper hover:bg-paper-subtle text-xs font-medium text-ink-muted hover:text-ink transition-colors min-h-[44px]"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Cancel</span>
          </button>
        </div>
      )}
    </div>
  );
}
