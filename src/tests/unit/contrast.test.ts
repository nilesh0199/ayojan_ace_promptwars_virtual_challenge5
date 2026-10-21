import { describe, it, expect } from 'vitest';

/**
 * Calculates relative luminance from hex color string based on WCAG 2.2 specification.
 */
function getRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const rLinear = toLinear(r);
  const gLinear = toLinear(g);
  const bLinear = toLinear(b);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculates WCAG contrast ratio between two hex colors.
 */
function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('WCAG 2.2 AA Contrast Token Pairs Verification', () => {
  // Light theme token definitions from globals.css
  const lightTokens = {
    paper: '#FBF9F5',
    paperCard: '#FFFFFF',
    ink: '#191C1E',
    inkMuted: '#484E54',
    accent: '#0D5852',
    accentText: '#FFFFFF',
    ruleStrong: '#9A9388',
    error: '#B91C1C',
  };

  // Dark theme token definitions from globals.css
  const darkTokens = {
    paper: '#121417',
    paperCard: '#1A1D22',
    ink: '#F4F2ED',
    inkMuted: '#AEB5C0',
    accent: '#1EB8A6',
    accentText: '#08211E',
    ruleStrong: '#616B7B',
    error: '#EF4444',
  };

  describe('Light Theme Contrast', () => {
    it('primary text against paper background meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(lightTokens.ink, lightTokens.paper);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('primary text against card background meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(lightTokens.ink, lightTokens.paperCard);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('muted text against paper background meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(lightTokens.inkMuted, lightTokens.paper);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('accent button text against accent background meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(lightTokens.accentText, lightTokens.accent);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('error alerts against white card background meet WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(lightTokens.error, lightTokens.paperCard);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Dark Theme Contrast', () => {
    it('primary text against dark paper meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(darkTokens.ink, darkTokens.paper);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('primary text against dark card meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(darkTokens.ink, darkTokens.paperCard);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('muted text against dark paper meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(darkTokens.inkMuted, darkTokens.paper);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('accent button text against dark accent background meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(darkTokens.accentText, darkTokens.accent);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('error text against dark paper meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(darkTokens.error, darkTokens.paper);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });
});
