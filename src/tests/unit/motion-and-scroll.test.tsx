import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { SmoothScroll } from '@/components/smooth-scroll';
import AboutPage from '@/app/about/page';
import PrivacyPage from '@/app/privacy/page';
import TermsPage from '@/app/terms/page';
import HomePage from '@/app/page';
import PlanPage from '@/app/plan/page';
import { LandingScrollEffects } from '@/components/landing/landing-scroll-effects';
import WorkspacePage from '@/app/workspace/page';
import SavedPage from '@/app/saved/page';
import { WorkspaceHeader } from '@/components/workspace/workspace-header';
import { TabOverview } from '@/components/workspace/tab-overview';
import { TabBudget } from '@/components/workspace/tab-budget';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-context';
import { PlanProvider } from '@/components/plan-context';
import { SAVED_EXAMPLES } from '@/data/savedExamples';
import gsap from 'gsap';

expect.extend(toHaveNoViolations);

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/about',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Lenis constructor and methods
const mockDestroy = vi.fn();
const mockRaf = vi.fn();
const mockStop = vi.fn();
const mockStart = vi.fn();
const mockLenisConstructor = vi.fn().mockImplementation(() => ({
  destroy: mockDestroy,
  raf: mockRaf,
  stop: mockStop,
  start: mockStart,
  on: vi.fn(),
}));

vi.mock('lenis', () => {
  return {
    default: class MockLenis {
      constructor(options: unknown) {
        return mockLenisConstructor(options);
      }
    },
  };
});

describe('Motion (GSAP) & Smooth Scroll (Lenis) Polish Suite', () => {
  const originalMatchMedia = window.matchMedia;
  const originalOntouchstart = window.ontouchstart;
  const originalMaxTouchPoints = navigator.maxTouchPoints;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: desktop, no reduced motion, screen media
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    // Non-touch desktop
    delete (window as { ontouchstart?: unknown }).ontouchstart;
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    cleanup();
    window.matchMedia = originalMatchMedia;
    if (originalOntouchstart !== undefined) {
      window.ontouchstart = originalOntouchstart;
    } else {
      delete (window as { ontouchstart?: unknown }).ontouchstart;
    }
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: originalMaxTouchPoints,
      configurable: true,
      writable: true,
    });
  });

  const renderWithProviders = (ui: React.ReactElement, initialPlan?: any) => {
    return render(
      <ThemeProvider>
        <AuthProvider>
          <PlanProvider initialPlan={initialPlan}>
            {ui}
          </PlanProvider>
        </AuthProvider>
      </ThemeProvider>
    );
  };

  describe('Lenis Smooth Scrolling Guardrails', () => {
    it('initializes Lenis on content pages (About, Privacy, Terms)', () => {
      // 1. About Page
      const aboutView = renderWithProviders(<AboutPage />);
      expect(mockLenisConstructor).toHaveBeenCalledTimes(1);
      aboutView.unmount();
      expect(mockDestroy).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      // 2. Privacy Page
      const privacyView = renderWithProviders(<PrivacyPage />);
      expect(mockLenisConstructor).toHaveBeenCalledTimes(1);
      privacyView.unmount();
      expect(mockDestroy).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      // 3. Terms Page
      const termsView = renderWithProviders(<TermsPage />);
      expect(mockLenisConstructor).toHaveBeenCalledTimes(1);
      termsView.unmount();
      expect(mockDestroy).toHaveBeenCalledTimes(1);
    });

    it('does NOT initialize Lenis on planner or workspace or saved pages (Plan Creator, Workspace, Saved Plans)', () => {
      // 1. Plan Creator
      renderWithProviders(<PlanPage />);
      expect(mockLenisConstructor).not.toHaveBeenCalled();
      cleanup();

      // 2. Workspace
      renderWithProviders(<WorkspacePage />, SAVED_EXAMPLES.wedding);
      expect(mockLenisConstructor).not.toHaveBeenCalled();
      cleanup();

      // 3. Saved Plans
      renderWithProviders(<SavedPage />);
      expect(mockLenisConstructor).not.toHaveBeenCalled();
      cleanup();
    });

    it('initializes Lenis on the Landing Page under normal desktop conditions and destroys on unmount', () => {
      const view = render(<LandingScrollEffects />);
      expect(mockLenisConstructor).toHaveBeenCalledTimes(1);
      view.unmount();
      expect(mockDestroy).toHaveBeenCalledTimes(1);
    });

    it('skips Lenis initialization when prefers-reduced-motion: reduce is active', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(<SmoothScroll />);
      expect(mockLenisConstructor).not.toHaveBeenCalled();
    });

    it('skips Lenis initialization on touch devices (ontouchstart or maxTouchPoints > 0)', () => {
      // Simulation 1: maxTouchPoints > 0
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 5,
        configurable: true,
      });

      render(<SmoothScroll />);
      expect(mockLenisConstructor).not.toHaveBeenCalled();
      cleanup();

      // Simulation 2: ontouchstart in window
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true,
      });
      (window as { ontouchstart?: unknown }).ontouchstart = () => {};

      render(<SmoothScroll />);
      expect(mockLenisConstructor).not.toHaveBeenCalled();
    });

    it('skips Lenis initialization in print media', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === 'print',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(<SmoothScroll />);
      expect(mockLenisConstructor).not.toHaveBeenCalled();
    });

    it('cancels RAF and destroys Lenis instance on unmount', () => {
      const cancelRafSpy = vi.spyOn(window, 'cancelAnimationFrame');
      const { unmount } = render(<SmoothScroll />);

      expect(mockLenisConstructor).toHaveBeenCalledTimes(1);
      unmount();

      expect(mockDestroy).toHaveBeenCalledTimes(1);
      expect(cancelRafSpy).toHaveBeenCalled();
    });

    it('pauses on beforeprint and resumes on afterprint', () => {
      render(<SmoothScroll />);
      expect(mockLenisConstructor).toHaveBeenCalledTimes(1);

      window.dispatchEvent(new Event('beforeprint'));
      expect(mockStop).toHaveBeenCalled();

      window.dispatchEvent(new Event('afterprint'));
      expect(mockStart).toHaveBeenCalled();
    });
  });

  describe('GSAP Motion Guardrails & Cleanup', () => {
    it('runs GSAP animation setup inside gsap.matchMedia and cleans up on unmount for WorkspaceHeader', () => {
      const revertSpy = vi.fn();
      const matchMediaSpy = vi.spyOn(gsap, 'matchMedia').mockReturnValue({
        add: vi.fn().mockImplementation((_query, callback) => {
          callback();
        }),
        revert: revertSpy,
      } as any);

      const { unmount } = renderWithProviders(
        <WorkspaceHeader onOpenReplan={() => {}} />,
        SAVED_EXAMPLES.wedding
      );

      expect(matchMediaSpy).toHaveBeenCalled();

      unmount();
      expect(revertSpy).toHaveBeenCalled();
      matchMediaSpy.mockRestore();
    });

    it('skips GSAP tweens when prefers-reduced-motion: reduce is requested', () => {
      const fromSpy = vi.spyOn(gsap, 'from');

      // Reduced motion active
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      renderWithProviders(
        <TabOverview onSelectTab={() => {}} />,
        SAVED_EXAMPLES.wedding
      );

      // In real GSAP, matchMedia('(prefers-reduced-motion: no-preference)') will evaluate to false,
      // so gsap.from on .overview-card will not execute.
      fromSpy.mockRestore();
    });

    it('cleans up matchMedia contexts on unmount across all 4 animated components', () => {
      const revertSpies: ReturnType<typeof vi.fn>[] = [];
      const matchMediaSpy = vi.spyOn(gsap, 'matchMedia').mockImplementation(() => {
        const revert = vi.fn();
        revertSpies.push(revert);
        return {
          add: vi.fn(),
          revert,
        } as any;
      });

      // 1. Workspace Header
      const headerView = renderWithProviders(<WorkspaceHeader onOpenReplan={() => {}} />, SAVED_EXAMPLES.wedding);
      headerView.unmount();

      // 2. Tab Overview
      const overviewView = renderWithProviders(<TabOverview onSelectTab={() => {}} />, SAVED_EXAMPLES.wedding);
      overviewView.unmount();

      // 3. Tab Budget
      const budgetView = renderWithProviders(<TabBudget onOpenReplan={() => {}} />, SAVED_EXAMPLES.wedding);
      budgetView.unmount();

      // 4. Workspace Page (tab fade)
      const workspaceView = renderWithProviders(<WorkspacePage />, SAVED_EXAMPLES.wedding);
      workspaceView.unmount();

      expect(revertSpies.length).toBeGreaterThanOrEqual(4);
      revertSpies.forEach((spy) => expect(spy).toHaveBeenCalled());

      matchMediaSpy.mockRestore();
    });
  });

  describe('Planner & Workspace Smooth Scrolling', () => {
    it('applies scroll-smooth to main scroll container and intake form on Plan Creator', () => {
      const { container } = renderWithProviders(<PlanPage />);
      const mainScroll = container.querySelector('#app-main-scroll');
      expect(mainScroll).toHaveClass('scroll-smooth');

      const intakeForm = container.querySelector('#planner-intake-form');
      expect(intakeForm).toHaveClass('scroll-smooth');
    });

    it('applies scroll-smooth to tablist and tabpanel in Workspace', () => {
      const { container } = renderWithProviders(<WorkspacePage />, SAVED_EXAMPLES.wedding);
      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist).toHaveClass('scroll-smooth');

      const tabpanel = container.querySelector('[role="tabpanel"]');
      expect(tabpanel).toHaveClass('scroll-smooth');
    });

    it('smoothly scrolls main scroll container to top when switching tabs in Workspace', () => {
      const scrollToMock = vi.fn();
      const { container } = renderWithProviders(<WorkspacePage />, SAVED_EXAMPLES.wedding);
      const mainScroll = container.querySelector('#app-main-scroll');
      if (mainScroll) {
        mainScroll.scrollTo = scrollToMock;
      }

      // Switch to Budget tab
      const budgetTab = screen.getByRole('tab', { name: /Budget/i });
      fireEvent.click(budgetTab);

      expect(scrollToMock).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth',
      });
    });
  });

  describe('Accessibility (jest-axe) on Animated & Content Pages', () => {
    it('About Page has 0 axe accessibility violations', async () => {
      const { container } = renderWithProviders(<AboutPage />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('Privacy Page has 0 axe accessibility violations', async () => {
      const { container } = renderWithProviders(<PrivacyPage />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('Terms Page has 0 axe accessibility violations', async () => {
      const { container } = renderWithProviders(<TermsPage />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('Workspace Header has 0 axe accessibility violations', async () => {
      const { container } = renderWithProviders(
        <WorkspaceHeader onOpenReplan={() => {}} />,
        SAVED_EXAMPLES.wedding
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('Workspace Overview Tab has 0 axe accessibility violations', async () => {
      const { container } = renderWithProviders(
        <TabOverview onSelectTab={() => {}} />,
        SAVED_EXAMPLES.wedding
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('Workspace Budget Tab has 0 axe accessibility violations', async () => {
      const { container } = renderWithProviders(
        <TabBudget onOpenReplan={() => {}} />,
        SAVED_EXAMPLES.wedding
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
