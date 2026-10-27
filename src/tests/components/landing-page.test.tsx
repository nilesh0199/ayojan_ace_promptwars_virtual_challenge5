import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import HomePage from '@/app/page';
import { LandingScrollEffects } from '@/components/landing/landing-scroll-effects';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-context';
import { PlanProvider } from '@/components/plan-context';
import { AUTHOR_NAME, CONTACT_LINKS } from '@/lib/constants';

expect.extend(toHaveNoViolations);

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
}));

// Hoisted mocks for GSAP and Lenis
const {
  mockTickerAdd,
  mockTickerRemove,
  mockKill,
  mockRevert,
  mockGetAll,
  mockDestroy,
  mockRaf,
  mockStop,
  mockStart,
  mockLenisConstructor,
} = vi.hoisted(() => {
  const mockKill = vi.fn();
  const mockRevert = vi.fn();
  const mockGetAll = vi.fn().mockReturnValue([{ kill: mockKill }]);
  const mockTickerAdd = vi.fn();
  const mockTickerRemove = vi.fn();
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
  return {
    mockKill,
    mockRevert,
    mockGetAll,
    mockTickerAdd,
    mockTickerRemove,
    mockDestroy,
    mockRaf,
    mockStop,
    mockStart,
    mockLenisConstructor,
  };
});

vi.mock('gsap', () => {
  const gsapObj = {
    registerPlugin: vi.fn(),
    ticker: {
      add: mockTickerAdd,
      remove: mockTickerRemove,
      lagSmoothing: vi.fn(),
    },
    to: vi.fn().mockReturnValue({}),
    from: vi.fn().mockReturnValue({}),
    timeline: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
    }),
    matchMedia: vi.fn().mockReturnValue({
      add: vi.fn().mockImplementation((query, callback) => {
        callback({ add: vi.fn() });
      }),
      revert: mockRevert,
    }),
    utils: {
      toArray: vi.fn().mockReturnValue([]),
    },
  };
  return {
    default: gsapObj,
    ...gsapObj,
  };
});

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {
    update: vi.fn(),
    getAll: mockGetAll,
  },
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

vi.mock('@/lib/firebase/config', () => ({
  getMissingFirebaseConfigVars: vi.fn().mockReturnValue([]),
  getFirebaseAuth: vi.fn(),
  getGoogleAuthProvider: vi.fn(),
}));

// Mock Firebase Auth for testing sign-in and guest flows
let mockCurrentUser: any = null;
let mockSignInError: Error | null = null;
let authCallback: ((user: any) => void) | null = null;

vi.mock('@/lib/firebase/auth', () => ({
  signInWithGoogle: vi.fn().mockImplementation(async () => {
    if (mockSignInError) throw mockSignInError;
    const user = mockCurrentUser || {
      uid: 'test-google-user',
      email: 'planner@example.com',
      displayName: 'Test Planner',
      photoURL: 'https://example.com/avatar.jpg',
    };
    if (authCallback) authCallback(user);
    return user;
  }),
  signOutUser: vi.fn().mockImplementation(async () => {
    mockCurrentUser = null;
    if (authCallback) authCallback(null);
  }),
  subscribeToAuth: vi.fn().mockImplementation((cb) => {
    authCallback = cb;
    cb(mockCurrentUser);
    return () => {};
  }),
  handleRedirectAuthResult: vi.fn().mockResolvedValue(null),
}));

describe('Landing Page & GSAP/Lenis Motion Suite', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser = null;
    mockSignInError = null;

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
  });

  const renderLandingPage = (isDark = false) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    return render(
      <ThemeProvider>
        <AuthProvider>
          <PlanProvider>
            <HomePage />
          </PlanProvider>
        </AuthProvider>
      </ThemeProvider>
    );
  };

  describe('1. Structure, Landmarks and Visual Elements', () => {
    it('renders semantic landmarks: header, main, sections, footer, and skip target', () => {
      const { container } = renderLandingPage();

      expect(container.querySelector('header')).toBeInTheDocument();
      expect(container.querySelector('main#main-content')).toBeInTheDocument();
      expect(container.querySelector('footer')).toBeInTheDocument();

      // Heading h1
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveAttribute('aria-label', 'Aayojan Ace');
    });

    it('renders hero title, tagline, description, and glossy wordmark', () => {
      renderLandingPage();

      expect(screen.getAllByText(/Your celebration,/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/perfectly planned/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/PromptWars Challenge 5 · Intelligent Event Architecture/i)).toBeInTheDocument();
    });

    it('renders horizontal moving word band with all core planning aspects', () => {
      renderLandingPage();

      const track = document.getElementById('word-band-track');
      expect(track).toBeInTheDocument();
      expect(track?.textContent).toContain('Budgets');
      expect(track?.textContent).toContain('Timelines');
      expect(track?.textContent).toContain('Vendors');
      expect(track?.textContent).toContain('Ideas');
      expect(track?.textContent).toContain('Guests');
      expect(track?.textContent).toContain('Ceremony times');
      expect(track?.textContent).toContain('Reminders');
    });

    it('renders "How Aayojan Ace Works" with 4 steps from shared content module', () => {
      renderLandingPage();

      expect(screen.getByRole('heading', { name: /How Aayojan Ace Works/i })).toBeInTheDocument();
      expect(screen.getByText(/Step 01/i)).toBeInTheDocument();
      expect(screen.getByText(/Step 02/i)).toBeInTheDocument();
      expect(screen.getByText(/Step 03/i)).toBeInTheDocument();
      expect(screen.getByText(/Step 04/i)).toBeInTheDocument();
    });

    it('renders About section with Why the name cards and technology foundations', () => {
      renderLandingPage();

      expect(screen.getByRole('heading', { name: /About Aayojan Ace/i })).toBeInTheDocument();
      expect(screen.getByText(/Why the name Aayojan Ace\?/i)).toBeInTheDocument();
      expect(screen.getByText(/Aayojan \(आयोजन\) is a Hindi word/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Google Antigravity/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Google Gemini/i).length).toBeGreaterThanOrEqual(1);
    });

    it('renders Privacy and Terms sections in order with direct links', () => {
      renderLandingPage();

      expect(screen.getByRole('heading', { name: /Data Privacy & Governance/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Terms & Estimate Boundaries/i })).toBeInTheDocument();

      const privacyLink = screen.getByRole('link', { name: /Read Full Privacy Policy/i });
      expect(privacyLink).toHaveAttribute('href', '/privacy');

      const termsLink = screen.getByRole('link', { name: /Read Full Terms of Service/i });
      expect(termsLink).toHaveAttribute('href', '/terms');
    });

    it('renders semantic footer with author name, LinkedIn, and GitHub links', () => {
      renderLandingPage();

      expect(screen.getAllByText(new RegExp(AUTHOR_NAME, 'i')).length).toBeGreaterThan(0);

      const linkedIn = screen.getByRole('link', { name: new RegExp(`Connect with ${AUTHOR_NAME} on LinkedIn`, 'i') });
      expect(linkedIn).toHaveAttribute('href', CONTACT_LINKS.linkedIn);

      const github = screen.getByRole('link', { name: /GitHub Repository: View source repository on GitHub/i });
      expect(github).toHaveAttribute('href', CONTACT_LINKS.github);
    });
  });

  describe('2. Navigation, Routing & Auth Flows', () => {
    it('sticky header contains fixed "Start plan" button pointing to /plan', () => {
      renderLandingPage();

      const startButtons = screen.getAllByRole('link', { name: /Start plan/i });
      expect(startButtons.length).toBeGreaterThanOrEqual(1);
      expect(startButtons[0]).toHaveAttribute('href', '/plan');
    });

    it('sticky header wordmark links to root "/"', () => {
      renderLandingPage();

      const homeLinks = screen.getAllByRole('link', { name: 'Aayojan Ace Home' });
      expect(homeLinks.length).toBeGreaterThanOrEqual(1);
      expect(homeLinks[0]).toHaveAttribute('href', '/');
    });

    it('navigates to /plan when "Try as Guest" is clicked', () => {
      renderLandingPage();

      const guestButtons = screen.getAllByRole('button', { name: /Try as Guest/i });
      fireEvent.click(guestButtons[0]);

      expect(mockPush).toHaveBeenCalledWith('/plan');
    });

    it('signs in with Google and navigates to /plan when "Get started with Google" is clicked', async () => {
      renderLandingPage();

      const googleButtons = screen.getAllByRole('button', { name: /Get started with Google/i });
      await waitFor(() => {
        expect(googleButtons[0]).not.toBeDisabled();
      });

      fireEvent.click(googleButtons[0]);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/plan');
      });
    });

    it('displays inline error when Google sign-in fails', async () => {
      mockSignInError = new Error('Popup blocked by browser');
      renderLandingPage();

      const googleButtons = screen.getAllByRole('button', { name: /Get started with Google/i });
      await waitFor(() => {
        expect(googleButtons[0]).not.toBeDisabled();
      });

      fireEvent.click(googleButtons[0]);

      await waitFor(() => {
        expect(screen.getAllByText(/Popup blocked by browser/i).length).toBeGreaterThan(0);
      });
    });

    it('changes hero and CTA buttons to "Open planner" when user is signed in', () => {
      mockCurrentUser = {
        uid: 'user-123',
        displayName: 'Nilesh Thipe',
        email: 'nilesh@example.com',
        photoURL: null,
      };

      renderLandingPage();

      // Buttons change to "Open planner"
      const openPlannerLinks = screen.getAllByRole('link', { name: /Open planner/i });
      expect(openPlannerLinks.length).toBe(2);
      expect(openPlannerLinks[0]).toHaveAttribute('href', '/plan');
      expect(openPlannerLinks[1]).toHaveAttribute('href', '/plan');
    });
  });

  describe('3. GSAP & Lenis Scroll Integration & Guardrails', () => {
    it('initializes Lenis and wires ticker when loaded on desktop without reduced motion', () => {
      const view = render(<LandingScrollEffects />);

      expect(mockLenisConstructor).toHaveBeenCalledTimes(1);
      expect(mockTickerAdd).toHaveBeenCalledTimes(1);

      // Clean unmount
      view.unmount();
      expect(mockDestroy).toHaveBeenCalledTimes(1);
      expect(mockTickerRemove).toHaveBeenCalledTimes(1);
      expect(mockRevert).toHaveBeenCalledTimes(1);
      expect(mockKill).toHaveBeenCalled();
    });

    it('skips Lenis and GSAP animations when prefers-reduced-motion: reduce is requested', () => {
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

      const view = render(<LandingScrollEffects />);

      expect(mockLenisConstructor).not.toHaveBeenCalled();
      expect(mockTickerAdd).not.toHaveBeenCalled();
      view.unmount();
    });

    it('skips Lenis on touch devices', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 4,
        configurable: true,
      });

      const view = render(<LandingScrollEffects />);

      expect(mockLenisConstructor).not.toHaveBeenCalled();
      view.unmount();
    });
  });

  describe('4. Accessibility (jest-axe) Checks in Light and Dark themes', () => {
    it('has no accessibility violations in Light theme', async () => {
      const { container } = renderLandingPage(false);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations in Dark theme', async () => {
      const { container } = renderLandingPage(true);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
