'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Client component that initializes Lenis smooth scrolling exclusively for content pages
 * (/about, /privacy, /terms).
 *
 * Strict Guardrails:
 * - Never runs in planner, workspace, saved plans, dialogs, or inner scroll areas.
 * - Skips initialization when prefers-reduced-motion: reduce is requested.
 * - Skips initialization on touch devices ('ontouchstart' in window or maxTouchPoints > 0).
 * - Skips initialization in print media (window.matchMedia('print')).
 * - Pauses during window beforeprint/afterprint.
 * - Driven strictly by a single requestAnimationFrame loop.
 * - Fully destroys instance and cancels RAF on unmount.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Skip under prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    // 2. Skip on touch devices
    const isTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    if (isTouch) {
      return;
    }

    // 3. Skip in print media
    const isPrint = window.matchMedia('print').matches;
    if (isPrint) {
      return;
    }

    // Detect if desktop layout uses the inner container for scrolling
    const scrollContainer = document.getElementById('app-main-scroll');
    const isCustomWrapper =
      scrollContainer &&
      typeof window.getComputedStyle === 'function' &&
      window.getComputedStyle(scrollContainer).overflowY === 'auto';

    const lenis = new Lenis({
      wrapper: isCustomWrapper ? scrollContainer : window,
      content: isCustomWrapper
        ? (document.getElementById('main-content') ?? scrollContainer)
        : document.documentElement,
      eventsTarget: isCustomWrapper ? scrollContainer : window,
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      anchors: true,
      wheelMultiplier: 1,
      touchMultiplier: 1,
      prevent: (node) => {
        // Prevent smoothing if node or any ancestor has data-lenis-prevent
        return (
          node.hasAttribute('data-lenis-prevent') ||
          Boolean(node.closest && node.closest('[data-lenis-prevent]'))
        );
      },
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Pause Lenis when print dialog is invoked
    const handleBeforePrint = () => {
      lenis.stop();
    };
    const handleAfterPrint = () => {
      lenis.start();
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}
