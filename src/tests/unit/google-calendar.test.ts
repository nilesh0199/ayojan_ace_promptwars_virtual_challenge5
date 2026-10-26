import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildEventTimes,
  buildGoogleCalendarEventBody,
  buildGoogleCalendarTemplateUrl,
  syncTasksToGoogleCalendar,
  removeGoogleCalendarReminders,
  MAX_CALENDAR_EVENTS_SYNC,
} from '@/lib/google-calendar';
import { TimelineTask } from '@/lib/schemas';

describe('Google Calendar Integration Utilities', () => {
  const mockTask: TimelineTask = {
    id: 'task-1',
    phase: 'Now',
    title: 'Book Venue Hall',
    description: 'Inspect wedding hall and lock down dates.',
    dueDate: '2026-11-20',
    owner: 'Planner',
    completed: false,
    daysBeforeEvent: 30,
    estimatedCostLink: 'Venue & Staging',
  };

  it('buildEventTimes creates 9:00 AM start and 9:30 AM end on due date', () => {
    const times = buildEventTimes('2026-11-20');
    expect(times.startDateTime).toBe('2026-11-20T09:00:00');
    expect(times.endDateTime).toBe('2026-11-20T09:30:00');
    expect(times.timeZone).toBeTruthy();
  });

  it('buildGoogleCalendarEventBody configures 1-day email and 1-hour popup reminders with private properties', () => {
    const body = buildGoogleCalendarEventBody(mockTask, 'plan-xyz', 'Grand Wedding');

    expect(body.summary).toBe('[Grand Wedding] Book Venue Hall');
    expect(body.description).toContain('Inspect wedding hall');
    expect(body.description).toContain('Phase: Now');
    expect(body.description).toContain('Grand Wedding');

    // Reminders check: 1 day (1440 min) email, 1 hour (60 min) popup
    expect(body.reminders.useDefault).toBe(false);
    expect(body.reminders.overrides).toEqual([
      { method: 'email', minutes: 1440 },
      { method: 'popup', minutes: 60 },
    ]);

    // Extended private properties for idempotency and linkage
    expect(body.extendedProperties.private).toEqual({
      planId: 'plan-xyz',
      taskId: 'task-1',
      source: 'aayojan-ace',
    });
  });

  describe('syncTasksToGoogleCalendar', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      vi.resetAllMocks();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('creates a new event via POST when task has no googleCalendarEventId', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'gcal-event-999' }),
      });

      const onProgress = vi.fn();
      const res = await syncTasksToGoogleCalendar({
        tasks: [mockTask],
        planId: 'plan-1',
        planTitle: 'Test Event',
        token: 'mock-oauth-token',
        onProgress,
      });

      expect(res.syncedCount).toBe(1);
      expect(res.updatedTasks[0].googleCalendarEventId).toBe('gcal-event-999');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/primary/events'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-oauth-token',
          }),
        })
      );
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, total: 1, taskTitle: 'Book Venue Hall' })
      );
    });

    it('recreates event when updating existing event returns 404 (deleted remotely)', async () => {
      const existingTask: TimelineTask = {
        ...mockTask,
        googleCalendarEventId: 'deleted-remotely-123',
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: 'new-recreated-id-456' }),
        });

      const res = await syncTasksToGoogleCalendar({
        tasks: [existingTask],
        planId: 'plan-1',
        planTitle: 'Test Event',
        token: 'mock-oauth-token',
      });

      expect(res.syncedCount).toBe(1);
      expect(res.updatedTasks[0].googleCalendarEventId).toBe('new-recreated-id-456');
    });

    it('retries transient 429/503 errors with backoff before succeeding', async () => {
      vi.useFakeTimers();

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 429 })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: 'retried-id-789' }),
        });

      const syncPromise = syncTasksToGoogleCalendar({
        tasks: [mockTask],
        planId: 'plan-1',
        planTitle: 'Test Event',
        token: 'mock-oauth-token',
      });

      await vi.runAllTimersAsync();
      const res = await syncPromise;

      expect(res.syncedCount).toBe(1);
      expect(res.updatedTasks[0].googleCalendarEventId).toBe('retried-id-789');

      vi.useRealTimers();
    });

    it('throws error prompting reconnection on 401 Unauthorized', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(
        syncTasksToGoogleCalendar({
          tasks: [mockTask],
          planId: 'plan-1',
          planTitle: 'Test Event',
          token: 'expired-token',
        })
      ).rejects.toThrow('Google Calendar authorization expired');
    });

    it('throws error regarding scope permissions on 403 Forbidden', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });

      await expect(
        syncTasksToGoogleCalendar({
          tasks: [mockTask],
          planId: 'plan-1',
          planTitle: 'Test Event',
          token: 'token-without-scope',
        })
      ).rejects.toThrow('Google Calendar permission not granted');
    });

    it('enforces maximum hard cap of 60 events per sync', async () => {
      const excessTasks: TimelineTask[] = Array.from({ length: 65 }, (_, i) => ({
        ...mockTask,
        id: `task-${i}`,
      }));

      await expect(
        syncTasksToGoogleCalendar({
          tasks: excessTasks,
          planId: 'plan-1',
          planTitle: 'Test Event',
          token: 'token',
        })
      ).rejects.toThrow(`Cannot sync more than ${MAX_CALENDAR_EVENTS_SYNC} events at once`);
    });
  });

  describe('buildGoogleCalendarTemplateUrl (Warning-Free Direct Path)', () => {
    it('constructs a valid, properly encoded Google Calendar TEMPLATE URL', () => {
      const urlString = buildGoogleCalendarTemplateUrl({
        taskTitle: 'Send invitations to guests',
        planTitle: 'Royal Rajasthani Wedding',
        dueDate: '2026-11-05',
        timeZone: 'Asia/Kolkata',
        appUrl: 'https://ayojan-ace.vercel.app',
      });

      expect(urlString).toContain('https://calendar.google.com/calendar/render?');
      expect(urlString).toContain('action=TEMPLATE');
      expect(urlString).toContain('text=%5BRoyal+Rajasthani+Wedding%5D+Send+invitations+to+guests');
      expect(urlString).toContain('dates=20261105T090000%2F20261105T093000');
      expect(urlString).toContain('ctz=Asia%2FKolkata');
      expect(urlString).toContain('https%3A%2F%2Fayojan-ace.vercel.app%2Fworkspace');
    });

    it('caps overly long titles cleanly to prevent URL length limits', () => {
      const longTitle = 'A'.repeat(150);
      const urlString = buildGoogleCalendarTemplateUrl({
        taskTitle: longTitle,
        planTitle: 'Plan',
        dueDate: '2026-11-05',
      });

      const parsedUrl = new URL(urlString);
      const textParam = parsedUrl.searchParams.get('text');
      expect(textParam).toBeDefined();
      expect(textParam!.length).toBeLessThanOrEqual(100);
    });

    it('uses startTime when provided to schedule ritual at specified muhurat timing', () => {
      const urlString = buildGoogleCalendarTemplateUrl({
        taskTitle: 'Auspicious Pheras Ritual',
        planTitle: 'Royal Rajasthani Wedding',
        dueDate: '2026-11-20',
        startTime: '11:30',
      });

      expect(urlString).toContain('dates=20261120T113000%2F20261120T123000');
      expect(urlString).toContain('Scheduled+Auspicious+Time%3A+11%3A30+AM');
    });
  });

  describe('removeGoogleCalendarReminders', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      vi.resetAllMocks();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('deletes calendar event and clears googleCalendarEventId from task with progress reporting', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      const taskWithEvent: TimelineTask = {
        ...mockTask,
        googleCalendarEventId: 'event-to-delete-555',
      };

      const onProgress = vi.fn();
      const res = await removeGoogleCalendarReminders({
        tasks: [taskWithEvent],
        token: 'token',
        onProgress,
      });

      expect(res.removedCount).toBe(1);
      expect(res.updatedTasks[0].googleCalendarEventId).toBeUndefined();
      expect(onProgress).toHaveBeenCalledWith({ current: 1, total: 1 });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/event-to-delete-555'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
