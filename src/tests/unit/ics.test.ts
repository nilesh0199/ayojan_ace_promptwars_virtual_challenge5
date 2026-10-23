import { describe, it, expect, vi } from 'vitest';
import { generateTimelineIcs, formatIcsDate, triggerIcsDownload } from '@/lib/ics';
import { TimelineTask } from '@/lib/schemas';

describe('ICS Calendar Export', () => {
  const sampleTasks: TimelineTask[] = [
    {
      id: 'task-1',
      phase: 'Now',
      title: 'Tasting & Menu Finalization, Jaipur',
      description: 'Review Jain catering menu; verify allergen separation.',
      dueDate: '2026-08-20',
      owner: 'Food Coordinator',
      estimatedCostLink: 'Catering',
      completed: false,
      daysBeforeEvent: 90,
    },
    {
      id: 'task-2',
      phase: 'Event day',
      title: 'Morning Pheras Ceremony',
      description: 'Holy fire rituals on main lawn',
      dueDate: '2026-11-20',
      owner: 'Host',
      completed: true,
      daysBeforeEvent: 0,
    },
  ];

  it('formats dates to standard ICS VALUE=DATE format', () => {
    expect(formatIcsDate('2026-11-20')).toBe('20261120');
  });

  it('generates an RFC 5545 compliant calendar string', () => {
    const ics = generateTimelineIcs('Royal Heritage Wedding', sampleTasks);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//Aayojan Ace//Celebration and Event Planner//EN');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:aayojan-ace-task-1@aayojanace.app');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260820');
    expect(ics).toContain('SUMMARY:[Aayojan Ace] Tasting & Menu Finalization\\, Jaipur');
    expect(ics).toContain('STATUS:CONFIRMED');
    expect(ics).toContain('STATUS:COMPLETED'); // task-2 completed
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('ACTION:DISPLAY');
    expect(ics).toContain('TRIGGER:-P1D');
    expect(ics).toContain('END:VALARM');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('triggers browser download link safely', () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    triggerIcsDownload('my-event.ics', 'BEGIN:VCALENDAR\nEND:VCALENDAR');

    expect(appendSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
  });
});
