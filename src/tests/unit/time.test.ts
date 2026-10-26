import { describe, it, expect } from 'vitest';
import {
  parse24hTo12h,
  format12hTo24h,
  formatTime12h,
} from '@/lib/time';

describe('12-hour / 24-hour Time Conversion Utilities', () => {
  describe('parse24hTo12h', () => {
    it('returns null for empty, undefined and null inputs', () => {
      expect(parse24hTo12h('')).toBeNull();
      expect(parse24hTo12h(undefined)).toBeNull();
      expect(parse24hTo12h(null)).toBeNull();
    });

    it('returns null for malformed strings', () => {
      expect(parse24hTo12h('abc')).toBeNull();
      expect(parse24hTo12h('25:00')).toBeNull();
      expect(parse24hTo12h('12:60')).toBeNull();
      expect(parse24hTo12h('1:30')).toBeNull(); // needs leading zero
      expect(parse24hTo12h('12')).toBeNull();
    });

    it('converts 00:00 (midnight) to 12 AM', () => {
      const parts = parse24hTo12h('00:00');
      expect(parts).toEqual({ hour: '12', minute: '00', period: 'AM' });
    });

    it('converts 00:30 to 12:30 AM', () => {
      const parts = parse24hTo12h('00:30');
      expect(parts).toEqual({ hour: '12', minute: '30', period: 'AM' });
    });

    it('converts 01:00 to 1 AM', () => {
      const parts = parse24hTo12h('01:00');
      expect(parts).toEqual({ hour: '1', minute: '00', period: 'AM' });
    });

    it('converts 11:59 to 11:59 AM', () => {
      const parts = parse24hTo12h('11:59');
      expect(parts).toEqual({ hour: '11', minute: '59', period: 'AM' });
    });

    it('converts 12:00 (noon) to 12 PM', () => {
      const parts = parse24hTo12h('12:00');
      expect(parts).toEqual({ hour: '12', minute: '00', period: 'PM' });
    });

    it('converts 13:15 to 1:15 PM', () => {
      const parts = parse24hTo12h('13:15');
      expect(parts).toEqual({ hour: '1', minute: '15', period: 'PM' });
    });

    it('converts 23:45 to 11:45 PM', () => {
      const parts = parse24hTo12h('23:45');
      expect(parts).toEqual({ hour: '11', minute: '45', period: 'PM' });
    });

    it('trims whitespace from input', () => {
      const parts = parse24hTo12h('  10:30  ');
      expect(parts).toEqual({ hour: '10', minute: '30', period: 'AM' });
    });
  });

  describe('format12hTo24h', () => {
    it('converts 12 AM to "00:xx"', () => {
      expect(format12hTo24h('12', '00', 'AM')).toBe('00:00');
      expect(format12hTo24h('12', '30', 'AM')).toBe('00:30');
    });

    it('converts 12 PM to "12:xx"', () => {
      expect(format12hTo24h('12', '00', 'PM')).toBe('12:00');
      expect(format12hTo24h('12', '45', 'PM')).toBe('12:45');
    });

    it('converts 1 AM to "01:xx"', () => {
      expect(format12hTo24h('1', '00', 'AM')).toBe('01:00');
      expect(format12hTo24h(1, 5, 'AM')).toBe('01:05');
    });

    it('converts 11 PM to "23:xx"', () => {
      expect(format12hTo24h('11', '59', 'PM')).toBe('23:59');
    });

    it('converts 6 PM to "18:00"', () => {
      expect(format12hTo24h('6', '00', 'PM')).toBe('18:00');
    });

    it('returns empty string for invalid hour', () => {
      expect(format12hTo24h('0', '00', 'AM')).toBe('');
      expect(format12hTo24h('13', '00', 'AM')).toBe('');
      expect(format12hTo24h('', '00', 'AM')).toBe('');
    });

    it('accepts numeric arguments', () => {
      expect(format12hTo24h(10, 30, 'AM')).toBe('10:30');
      expect(format12hTo24h(2, 15, 'PM')).toBe('14:15');
    });

    it('defaults invalid minute to 00', () => {
      expect(format12hTo24h('5', '-1', 'AM')).toBe('05:00');
      expect(format12hTo24h('5', '60', 'AM')).toBe('05:00');
    });
  });

  describe('formatTime12h', () => {
    it('returns empty string for empty, undefined and null', () => {
      expect(formatTime12h('')).toBe('');
      expect(formatTime12h(undefined)).toBe('');
      expect(formatTime12h(null)).toBe('');
    });

    it('formats "00:00" as "12:00 AM"', () => {
      expect(formatTime12h('00:00')).toBe('12:00 AM');
    });

    it('formats "01:30" as "1:30 AM"', () => {
      expect(formatTime12h('01:30')).toBe('1:30 AM');
    });

    it('formats "10:30" as "10:30 AM"', () => {
      expect(formatTime12h('10:30')).toBe('10:30 AM');
    });

    it('formats "12:00" as "12:00 PM"', () => {
      expect(formatTime12h('12:00')).toBe('12:00 PM');
    });

    it('formats "14:15" as "2:15 PM"', () => {
      expect(formatTime12h('14:15')).toBe('2:15 PM');
    });

    it('formats "23:45" as "11:45 PM"', () => {
      expect(formatTime12h('23:45')).toBe('11:45 PM');
    });

    it('returns raw string for unrecognized formats', () => {
      expect(formatTime12h('not-a-time')).toBe('not-a-time');
    });

    it('handles already-formatted 12h strings gracefully', () => {
      expect(formatTime12h('10:30 AM')).toBe('10:30 AM');
      expect(formatTime12h('2:15 pm')).toBe('2:15 PM');
    });
  });

  describe('roundtrip: format12hTo24h -> parse24hTo12h', () => {
    const cases: Array<[string, string, 'AM' | 'PM']> = [
      ['12', '00', 'AM'],
      ['12', '00', 'PM'],
      ['1', '00', 'AM'],
      ['1', '00', 'PM'],
      ['11', '59', 'PM'],
      ['6', '30', 'AM'],
      ['6', '30', 'PM'],
    ];

    it.each(cases)('roundtrips %s:%s %s', (hour, minute, period) => {
      const h24 = format12hTo24h(hour, minute, period);
      const parts = parse24hTo12h(h24);
      expect(parts).not.toBeNull();
      expect(parts!.hour).toBe(hour);
      expect(parts!.minute).toBe(minute);
      expect(parts!.period).toBe(period);
    });
  });
});
