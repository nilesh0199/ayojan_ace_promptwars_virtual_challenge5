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

  describe('Landing Page Editorial Palette Contrast (Light & Dark)', () => {
    // Scoped landing page palette tokens (editorial cream/purple/crimson & dark aubergine)
    const landingLightTokens = {
      bgCream: '#FAF1E0',
      cardSurface: '#FFF9EE',
      sectionBand: '#F3E4CB',
      purpleHeading: '#4A1D7A',
      aubergineBody: '#2A1A3A',
      vividPurpleAccent: '#6D28D9',
      crimsonEmphasis: '#B91C3C',
      crimsonLargeText: '#D6203F',
      goldDecorative: '#C28A1A',
      buttonCreamText: '#FFF9EE',
    };

    const landingDarkTokens = {
      bgAubergine: '#1B0F26',
      cardSurface: '#261636',
      sectionBand: '#20122E',
      creamText: '#F8EEDC',
      mutedText: '#DAC7E8',
      lighterPurpleAccent: '#C4A5F5',
      softerRedEmphasis: '#FF6B81',
      crimsonButtonBg: '#B91C3C',
      crimsonButtonText: '#FFF9EE',
    };

    describe('Light Theme Scoped Pairs', () => {
      it('deep royal purple headings against warm cream background meet WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingLightTokens.purpleHeading, landingLightTokens.bgCream);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('deep royal purple headings against card surface meet WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingLightTokens.purpleHeading, landingLightTokens.cardSurface);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('deep royal purple headings against section band meet WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingLightTokens.purpleHeading, landingLightTokens.sectionBand);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('dark aubergine body text against warm cream background meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingLightTokens.aubergineBody, landingLightTokens.bgCream);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('dark aubergine body text against card surface meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingLightTokens.aubergineBody, landingLightTokens.cardSurface);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('dark aubergine body text against section band meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingLightTokens.aubergineBody, landingLightTokens.sectionBand);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('vivid purple accent and links against warm cream background meet WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingLightTokens.vividPurpleAccent, landingLightTokens.bgCream);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('vivid purple accent against card surface meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingLightTokens.vividPurpleAccent, landingLightTokens.cardSurface);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('vivid purple accent against section band meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingLightTokens.vividPurpleAccent, landingLightTokens.sectionBand);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('crimson emphasis against warm cream background meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingLightTokens.crimsonEmphasis, landingLightTokens.bgCream);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('crimson emphasis against card surface meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingLightTokens.crimsonEmphasis, landingLightTokens.cardSurface);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('crimson emphasis against section band meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingLightTokens.crimsonEmphasis, landingLightTokens.sectionBand);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('crimson large display heading against warm cream meets WCAG AA Large (>= 3.0:1)', () => {
        const ratio = getContrastRatio(landingLightTokens.crimsonLargeText, landingLightTokens.bgCream);
        expect(ratio).toBeGreaterThanOrEqual(3.0);
      });

      it('crimson large display heading against card surface meets WCAG AA Large (>= 3.0:1)', () => {
        const ratio = getContrastRatio(landingLightTokens.crimsonLargeText, landingLightTokens.cardSurface);
        expect(ratio).toBeGreaterThanOrEqual(3.0);
      });

      it('cream button text against crimson primary button meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingLightTokens.buttonCreamText, landingLightTokens.crimsonEmphasis);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('cream button text against vivid purple active theme toggle button meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingLightTokens.buttonCreamText, landingLightTokens.vividPurpleAccent);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('vivid purple UI focus ring against warm cream background meets WCAG AA UI (>= 3.0:1)', () => {
        const ratio = getContrastRatio(landingLightTokens.vividPurpleAccent, landingLightTokens.bgCream);
        expect(ratio).toBeGreaterThanOrEqual(3.0);
      });
    });

    describe('Dark Theme Scoped Pairs', () => {
      it('cream text against deep aubergine background meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingDarkTokens.creamText, landingDarkTokens.bgAubergine);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('cream text against card surface meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingDarkTokens.creamText, landingDarkTokens.cardSurface);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('cream text against section band meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingDarkTokens.creamText, landingDarkTokens.sectionBand);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('muted text against deep aubergine background meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingDarkTokens.mutedText, landingDarkTokens.bgAubergine);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('muted text against card surface meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingDarkTokens.mutedText, landingDarkTokens.cardSurface);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('lighter purple accent against deep aubergine background meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingDarkTokens.lighterPurpleAccent, landingDarkTokens.bgAubergine);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('lighter purple accent against card surface meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingDarkTokens.lighterPurpleAccent, landingDarkTokens.cardSurface);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('softer red highlight against deep aubergine background meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingDarkTokens.softerRedEmphasis, landingDarkTokens.bgAubergine);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('softer red highlight against card surface meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingDarkTokens.softerRedEmphasis, landingDarkTokens.cardSurface);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('cream button text against crimson button background meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingDarkTokens.crimsonButtonText, landingDarkTokens.crimsonButtonBg);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('cream button text against vivid purple active theme toggle button meets WCAG AA (>= 4.5:1)', () => {
        const ratio = getContrastRatio(landingDarkTokens.crimsonButtonText, landingLightTokens.vividPurpleAccent);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('lighter purple UI focus ring against deep aubergine background meets WCAG AA UI (>= 3.0:1)', () => {
        const ratio = getContrastRatio(landingDarkTokens.lighterPurpleAccent, landingDarkTokens.bgAubergine);
        expect(ratio).toBeGreaterThanOrEqual(3.0);
      });
    });

    describe('Glossy Highlight Animation Extremes Contrast (Light & Dark)', () => {
      // Helper to calculate alpha-blended RGB color over base
      const blendHex = (baseHex: string, overlayHex: string, alpha: number): string => {
        const parse = (h: string) => {
          const c = h.replace('#', '');
          return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
        };
        const [r1, g1, b1] = parse(baseHex);
        const [r2, g2, b2] = parse(overlayHex);
        const r = Math.round((1 - alpha) * r1 + alpha * r2);
        const g = Math.round((1 - alpha) * g1 + alpha * g2);
        const b = Math.round((1 - alpha) * b1 + alpha * b2);
        const toHex = (n: number) => n.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      };

      it('Light: base gradient extremes without highlight meet large text WCAG AA (>= 3.0:1)', () => {
        expect(getContrastRatio(landingLightTokens.purpleHeading, landingLightTokens.bgCream)).toBeGreaterThanOrEqual(3.0);
        expect(getContrastRatio(landingLightTokens.vividPurpleAccent, landingLightTokens.bgCream)).toBeGreaterThanOrEqual(3.0);
        expect(getContrastRatio(landingLightTokens.crimsonLargeText, landingLightTokens.bgCream)).toBeGreaterThanOrEqual(3.0);
      });

      it('Light: peak highlight (28% white) over all base gradient stops meets large text WCAG AA (>= 3.0:1)', () => {
        const highlightWhite = '#FFFFFF';
        const peakAlpha = 0.28;

        const peakDeepPurple = blendHex(landingLightTokens.purpleHeading, highlightWhite, peakAlpha);
        const peakVividPurple = blendHex(landingLightTokens.vividPurpleAccent, highlightWhite, peakAlpha);
        const peakCrimson = blendHex(landingLightTokens.crimsonLargeText, highlightWhite, peakAlpha);

        expect(getContrastRatio(peakDeepPurple, landingLightTokens.bgCream)).toBeGreaterThanOrEqual(3.0);
        expect(getContrastRatio(peakVividPurple, landingLightTokens.bgCream)).toBeGreaterThanOrEqual(3.0);
        expect(getContrastRatio(peakCrimson, landingLightTokens.bgCream)).toBeGreaterThanOrEqual(3.0);
      });

      it('Dark: base gradient extremes without highlight meet large text WCAG AA (>= 3.0:1)', () => {
        expect(getContrastRatio(landingDarkTokens.creamText, landingDarkTokens.bgAubergine)).toBeGreaterThanOrEqual(3.0);
        expect(getContrastRatio(landingDarkTokens.lighterPurpleAccent, landingDarkTokens.bgAubergine)).toBeGreaterThanOrEqual(3.0);
        expect(getContrastRatio(landingDarkTokens.softerRedEmphasis, landingDarkTokens.bgAubergine)).toBeGreaterThanOrEqual(3.0);
      });

      it('Dark: peak highlight (30% warm cream) over all base gradient stops meets large text WCAG AA (>= 3.0:1)', () => {
        const highlightWarmCream = landingDarkTokens.creamText;
        const peakAlpha = 0.30;

        const peakSoftRed = blendHex(landingDarkTokens.softerRedEmphasis, highlightWarmCream, peakAlpha);
        const peakLighterPurple = blendHex(landingDarkTokens.lighterPurpleAccent, highlightWarmCream, peakAlpha);
        const peakCream = blendHex(landingDarkTokens.creamText, highlightWarmCream, peakAlpha);

        expect(getContrastRatio(peakSoftRed, landingDarkTokens.bgAubergine)).toBeGreaterThanOrEqual(3.0);
        expect(getContrastRatio(peakLighterPurple, landingDarkTokens.bgAubergine)).toBeGreaterThanOrEqual(3.0);
        expect(getContrastRatio(peakCream, landingDarkTokens.bgAubergine)).toBeGreaterThanOrEqual(3.0);
      });
    });
  });
});
