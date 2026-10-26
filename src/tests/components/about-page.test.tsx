import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-context';
import { PlanProvider } from '@/components/plan-context';
import AboutPage from '@/app/about/page';
import { AUTHOR_NAME, CONTACT_LINKS } from '@/lib/constants';

expect.extend(toHaveNoViolations);

// Mock navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/about',
}));

describe('About Page Component', () => {
  afterEach(() => {
    cleanup();
  });

  const renderAboutPage = (isDark = false) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    return render(
      <ThemeProvider>
        <AuthProvider>
          <PlanProvider>
            <AboutPage />
          </PlanProvider>
        </AuthProvider>
      </ThemeProvider>
    );
  };

  it('renders author name Nilesh Thipe and purpose for PromptWars Challenge 5', () => {
    renderAboutPage(false);

    // Creator verification
    expect(screen.getAllByText(new RegExp(AUTHOR_NAME, 'i')).length).toBeGreaterThan(0);

    // PromptWars Challenge 5 mention
    expect(screen.getByText(/PromptWars Challenge 5/i)).toBeInTheDocument();

    // Key headings
    expect(screen.getByRole('heading', { name: /Why the name Aayojan Ace\?/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /What Aayojan Ace Is/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Why It Was Made/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Who Made It/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /How It Works & Built With/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Responsible AI & Planning Estimates/i })).toBeInTheDocument();
  });

  it('renders "Why the name Aayojan Ace?" section with both cards and closing summary', () => {
    renderAboutPage(false);

    const heading = screen.getByRole('heading', { name: /Why the name Aayojan Ace\?/i });
    expect(heading).toBeInTheDocument();
    const section = heading.closest('section')!;

    // Check chips within the section
    expect(within(section).getByText('Aayojan')).toBeInTheDocument();
    expect(within(section).getByText('Ace')).toBeInTheDocument();

    // Check explanation content
    expect(
      within(section).getByText((_, el) =>
        el?.tagName.toLowerCase() === 'p' &&
        Boolean(el.textContent?.includes('Aayojan (आयोजन) is a Hindi word meaning the organizing and arranging of an event or function'))
      )
    ).toBeInTheDocument();
    expect(
      within(section).getByText((_, el) =>
        el?.tagName.toLowerCase() === 'p' &&
        Boolean(el.textContent?.includes('An ace is someone who is top-class and expert at what they do'))
      )
    ).toBeInTheDocument();

    // Check closing summary line
    expect(
      within(section).getByText((_, el) =>
        el?.tagName.toLowerCase() === 'p' &&
        Boolean(el.textContent?.includes('Together, Aayojan Ace means expert celebration planning: every event organized with care'))
      )
    ).toBeInTheDocument();
  });

  it('renders contact links with visible labels and secure new tab attributes', () => {
    renderAboutPage(false);

    // LinkedIn
    const linkedInLink = screen.getByRole('link', { name: /LinkedIn/i });
    expect(linkedInLink).toHaveAttribute('href', CONTACT_LINKS.linkedIn);
    expect(linkedInLink).toHaveAttribute('target', '_blank');
    expect(linkedInLink).toHaveAttribute('rel', 'noopener noreferrer');

    // GitHub
    const githubLink = screen.getByRole('link', { name: /GitHub Repository/i });
    expect(githubLink).toHaveAttribute('href', CONTACT_LINKS.github);
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders responsible AI note and links to Privacy and Terms', () => {
    renderAboutPage(false);

    expect(
      screen.getByText(/All financial ranges, vendor costs, and timeline estimates/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Privacy Policy/i })).toHaveAttribute(
      'href',
      '/privacy'
    );
    expect(screen.getByRole('link', { name: /Terms of Service/i })).toHaveAttribute(
      'href',
      '/terms'
    );
  });

  it('has no accessibility violations (jest-axe) in Light theme', async () => {
    const { container } = renderAboutPage(false);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations (jest-axe) in Dark theme', async () => {
    const { container } = renderAboutPage(true);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
