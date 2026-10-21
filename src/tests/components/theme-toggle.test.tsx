import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '@/components/theme-toggle';
import { ThemeProvider } from '@/components/theme-provider';

describe('ThemeToggle Component', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('renders theme buttons with accessible aria labels and pressed state', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const lightBtn = screen.getByRole('button', { name: /Switch to Light theme/i });
    const darkBtn = screen.getByRole('button', { name: /Switch to Dark theme/i });
    const systemBtn = screen.getByRole('button', { name: /Switch to System theme/i });

    expect(lightBtn).toBeInTheDocument();
    expect(darkBtn).toBeInTheDocument();
    expect(systemBtn).toBeInTheDocument();

    // Click dark button
    fireEvent.click(darkBtn);
    expect(darkBtn).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('aayojan_ace_theme')).toBe('dark');

    // Click light button
    fireEvent.click(lightBtn);
    expect(lightBtn).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('aayojan_ace_theme')).toBe('light');
  });
});
