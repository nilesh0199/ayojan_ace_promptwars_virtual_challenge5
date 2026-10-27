'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

export function LandingScrollEffects() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Reduced motion check: skip Lenis, scrubbing, parallax and animations
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    // 2. Touch device check: skip Lenis on touch devices
    const isTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);

    // 3. Print media check
    const isPrint = window.matchMedia('print').matches;

    // Register ScrollTrigger plugin
    gsap.registerPlugin(ScrollTrigger);

    let lenis: Lenis | null = null;
    let updateTicker: ((time: number) => void) | null = null;

    if (!isTouch && !isPrint) {
      lenis = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        touchMultiplier: 1,
        prevent: (node) => {
          return (
            node.hasAttribute('data-lenis-prevent') ||
            Boolean(node.closest && node.closest('[data-lenis-prevent]'))
          );
        },
      });

      if (typeof lenis.on === 'function') {
        lenis.on('scroll', ScrollTrigger.update);
      }

      updateTicker = (time: number) => {
        lenis?.raf(time * 1000);
      };

      gsap.ticker.add(updateTicker);
      gsap.ticker.lagSmoothing(0);
    }

    // Print event listeners
    const handleBeforePrint = () => {
      lenis?.stop();
    };
    const handleAfterPrint = () => {
      lenis?.start();
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    // Responsive GSAP animations with matchMedia
    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', (context) => {
      // Hero entrance reveal on load
      const heroTl = gsap.timeline({
        defaults: { ease: 'power3.out', duration: 0.8 },
      });

      heroTl
        .from('.hero-badge', { opacity: 0, y: -15, clearProps: 'transform,opacity' })
        .from('.hero-heading-text', { opacity: 0, y: 25, duration: 0.9, clearProps: 'transform,opacity' }, '-=0.5')
        .from('.hero-tagline', { opacity: 0, y: 20, clearProps: 'transform,opacity' }, '-=0.6')
        .from('.hero-desc', { opacity: 0, y: 15, clearProps: 'transform,opacity' }, '-=0.6')
        .from('.hero-content-right', { opacity: 0, x: 25, duration: 0.9, clearProps: 'transform,opacity' }, '-=0.7');

      // Hero parallax drift as scroll begins
      gsap.to('.hero-content-left', {
        yPercent: -8,
        opacity: 0.9,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero-content-left',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      // Horizontal moving word band
      gsap.to('#word-band-track', {
        xPercent: -20,
        ease: 'none',
        scrollTrigger: {
          trigger: '#word-band-track',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      });

      // Section titles sliding in from left
      gsap.utils.toArray<HTMLElement>('.section-title').forEach((title) => {
        gsap.from(title, {
          x: -35,
          opacity: 0,
          duration: 0.7,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
          scrollTrigger: {
            trigger: title,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });
      });

      // Section descriptions gentle stagger
      gsap.utils.toArray<HTMLElement>('.section-desc').forEach((desc) => {
        gsap.from(desc, {
          y: 20,
          opacity: 0,
          duration: 0.7,
          delay: 0.1,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
          scrollTrigger: {
            trigger: desc,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });
      });

      // CTA heading scale-in
      gsap.from('.cta-title', {
        scale: 0.94,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '#cta-section',
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      });

      gsap.from('.cta-buttons', {
        y: 20,
        opacity: 0,
        duration: 0.6,
        delay: 0.15,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '#cta-section',
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      });
    });

    // Desktop: How it works cards staggered sequence
    mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      gsap.from('.how-it-works-card', {
        y: 40,
        opacity: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '#how-it-works-container',
          start: 'top 75%',
          toggleActions: 'play none none none',
        },
      });
    });

    // Mobile: Simple reveals with no pinning
    mm.add('(max-width: 767px) and (prefers-reduced-motion: no-preference)', () => {
      gsap.from('.how-it-works-card', {
        y: 25,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '#how-it-works-container',
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      });
    });

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      if (updateTicker) {
        gsap.ticker.remove(updateTicker);
      }
      if (lenis) {
        lenis.destroy();
      }
      mm.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return null;
}
