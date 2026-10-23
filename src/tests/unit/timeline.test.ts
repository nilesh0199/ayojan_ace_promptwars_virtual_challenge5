import { describe, it, expect } from 'vitest';
import {
  reflowTimelineDates,
  assignPhaseForDueDate,
  formatDateISO,
  parseDateISO,
  injectGuestMilestones,
  normalizeTaskTitle,
} from '@/lib/timeline';
import { TimelineTask } from '@/lib/schemas';

describe('reflowTimelineDates pure logic', () => {
  const sampleTasks: TimelineTask[] = [
    {
      id: 'task-1',
      phase: 'Now',
      title: 'Book primary venue',
      description: 'Check kitchen capacity',
      dueDate: '2026-08-01',
      owner: 'Host',
      completed: false,
      daysBeforeEvent: 90,
    },
    {
      id: 'task-2',
      phase: 'Next 30 days',
      title: 'Order wedding invitations',
      description: 'Review calligraphy',
      dueDate: '2026-09-01',
      owner: 'Couple',
      completed: false,
      daysBeforeEvent: 60,
    },
    {
      id: 'task-3',
      phase: 'Event week',
      title: 'Soundcheck & generator check',
      description: 'Test decibel levels',
      dueDate: '2026-10-25',
      owner: 'Coordinator',
      completed: false,
      daysBeforeEvent: 6,
    },
    {
      id: 'task-4',
      phase: 'Event day',
      title: 'Coordinate arrival of guests',
      description: 'Welcome drinks setup',
      dueDate: '2026-11-01',
      owner: 'Host',
      completed: false,
      daysBeforeEvent: 0,
    },
  ];

  it('shifts all due dates earlier when event date is pulled forward', () => {
    // Original event date: 2026-11-01
    // New event date: 2026-10-01 (moved 31 days earlier)
    // Reference date: 2026-08-15
    const result = reflowTimelineDates(sampleTasks, '2026-11-01', '2026-10-01', '2026-08-15');

    expect(result.stats.daysDelta).toBe(-31);
    expect(result.stats.shiftedEarlierCount).toBe(4);
    expect(result.summaryText).toContain('31 days earlier');

    // Task 1: 90 days before 2026-10-01 = 2026-07-03
    // Since 2026-07-03 is before reference date 2026-08-15, it becomes overdue!
    expect(result.updatedTasks[0].dueDate).toBe('2026-07-03');
    expect(result.stats.overdueCount).toBeGreaterThanOrEqual(1);
    expect(result.summaryText).toContain('overdue');
  });

  it('shifts all due dates later when event date is postponed', () => {
    // New event date: 2026-12-01 (30 days later)
    const result = reflowTimelineDates(sampleTasks, '2026-11-01', '2026-12-01', '2026-08-01');

    expect(result.stats.daysDelta).toBe(30);
    expect(result.stats.shiftedLaterCount).toBe(4);
    expect(result.summaryText).toContain('30 days later');
    expect(result.updatedTasks[3].dueDate).toBe('2026-12-01');
  });

  it('assigns correct phases dynamically', () => {
    expect(assignPhaseForDueDate(0, 0)).toBe('Event day');
    expect(assignPhaseForDueDate(3, 3)).toBe('Event week');
    expect(assignPhaseForDueDate(-2, 45)).toBe('Now');
    expect(assignPhaseForDueDate(4, 45)).toBe('Next 7 days');
    expect(assignPhaseForDueDate(20, 60)).toBe('Next 30 days');
  });

  it('handles unchanged event date correctly', () => {
    const result = reflowTimelineDates(sampleTasks, '2026-11-01', '2026-11-01', '2026-08-01');
    expect(result.stats.daysDelta).toBe(0);
    expect(result.summaryText).toContain('Event date unchanged');
  });

  it('formats and parses ISO dates consistently, including full ISO timestamps', () => {
    const parsed = parseDateISO('2026-11-15');
    expect(parsed.getUTCFullYear()).toBe(2026);
    expect(parsed.getUTCMonth()).toBe(10); // 0-indexed November
    expect(parsed.getUTCDate()).toBe(15);

    const fullIso = parseDateISO('2026-11-15T14:30:00.000Z');
    expect(fullIso.getUTCFullYear()).toBe(2026);
    expect(fullIso.getUTCDate()).toBe(15);

    expect(formatDateISO(parsed)).toBe('2026-11-15');
  });

  describe('injectGuestMilestones (Deterministic Guest Communications)', () => {
    it('injects all 4 guest milestones for weddings (save-the-date, invitations, rsvp, headcount)', () => {
      const emptyTasks: TimelineTask[] = [];
      const eventDate = '2026-11-20';
      const refDate = '2026-05-01';

      const result = injectGuestMilestones(emptyTasks, eventDate, 'Wedding', refDate);
      expect(result.length).toBe(4);

      const titles = result.map((t) => t.title.toLowerCase());
      expect(titles.some((t) => t.includes('save-the-date'))).toBe(true);
      expect(titles.some((t) => t.includes('invitations'))).toBe(true);
      expect(titles.some((t) => t.includes('rsvp'))).toBe(true);
      expect(titles.some((t) => t.includes('headcount'))).toBe(true);
    });

    it('injects 3 guest milestones for non-weddings (omits save-the-date)', () => {
      const emptyTasks: TimelineTask[] = [];
      const result = injectGuestMilestones(emptyTasks, '2026-11-20', 'Birthday', '2026-05-01');
      expect(result.length).toBe(3);

      const titles = result.map((t) => t.title.toLowerCase());
      expect(titles.some((t) => t.includes('save-the-date'))).toBe(false);
      expect(titles.some((t) => t.includes('invitations'))).toBe(true);
      expect(titles.some((t) => t.includes('rsvp'))).toBe(true);
      expect(titles.some((t) => t.includes('headcount'))).toBe(true);
    });

    it('avoids creating duplicate tasks if a similar milestone already exists by normalized title', () => {
      const existingTasks: TimelineTask[] = [
        {
          id: 'pre-existing-invite',
          phase: 'Next 30 days',
          title: 'Distribute Digital & Print Invitations to Guests',
          description: 'Custom cards',
          dueDate: '2026-10-30',
          owner: 'Host',
          completed: false,
          daysBeforeEvent: 21,
        },
      ];

      const result = injectGuestMilestones(existingTasks, '2026-11-20', 'Birthday', '2026-05-01');
      // Should mark the existing task as guest milestone rather than adding a duplicate
      expect(result.length).toBe(3); // 1 existing + 2 newly injected
      const matching = result.find((t) => t.id === 'pre-existing-invite');
      expect(matching?.isGuestMilestone).toBe(true);
    });

    it('sets due date to earliest practical date (tomorrow) and marks Time-sensitive when event is closer than offset allows', () => {
      const refDate = '2026-11-15';
      const closeEventDate = '2026-11-18'; // only 3 days away! Offset for invitations is 21 days

      const result = injectGuestMilestones([], closeEventDate, 'Birthday', refDate);
      const inviteTask = result.find((t) => t.title.toLowerCase().includes('invitations'));

      expect(inviteTask).toBeDefined();
      expect(inviteTask!.isTimeSensitive).toBe(true);
      // Deadline set to tomorrow: 2026-11-16
      expect(inviteTask!.dueDate).toBe('2026-11-16');
    });

    it('normalizes task titles for matching', () => {
      expect(normalizeTaskTitle('  Send Invitations (To Guests)!  ')).toBe('send invitations to guests');
    });
  });
});
