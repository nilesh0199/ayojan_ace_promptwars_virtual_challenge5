import { TimelineTask } from './schemas';

export const MAX_CALENDAR_EVENTS_SYNC = 60;
export const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export interface CalendarEventPayload {
  summary: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  reminders: {
    useDefault: boolean;
    overrides: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  extendedProperties: {
    private: {
      planId: string;
      taskId: string;
      source: string;
    };
  };
}

export interface SyncProgress {
  current: number;
  total: number;
  taskTitle: string;
}

/**
 * Builds standard 9:00 AM local start and 9:30 AM local end timestamps in RFC3339 format.
 */
export function buildEventTimes(dueDate: string): {
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
} {
  const timeZone =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
      : 'Asia/Kolkata';

  // Format: YYYY-MM-DDTHH:MM:SS
  const startDateTime = `${dueDate}T09:00:00`;
  const endDateTime = `${dueDate}T09:30:00`;

  return { startDateTime, endDateTime, timeZone };
}

/**
 * Constructs a compliant Google Calendar Event request body.
 */
export function buildGoogleCalendarEventBody(
  task: TimelineTask,
  planId: string,
  planTitle: string
): CalendarEventPayload {
  const { startDateTime, endDateTime, timeZone } = buildEventTimes(task.dueDate);

  const appOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://ayojan-ace.vercel.app';

  const descriptionLines = [
    task.description || 'Milestone event created by Aayojan Ace.',
    '',
    `• Phase: ${task.phase}`,
    `• Owner: ${task.owner || 'Unassigned'}`,
    task.estimatedCostLink ? `• Budget Link: ${task.estimatedCostLink}` : '',
    `• Plan: ${planTitle}`,
    `• Link to Workspace: ${appOrigin}/workspace`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    summary: `[${planTitle}] ${task.title}`.slice(0, 100),
    description: descriptionLines,
    start: {
      dateTime: new Date(startDateTime).toISOString(),
      timeZone,
    },
    end: {
      dateTime: new Date(endDateTime).toISOString(),
      timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 1440 }, // 1 day before
        { method: 'popup', minutes: 60 }, // 1 hour before
      ],
    },
    extendedProperties: {
      private: {
        planId,
        taskId: task.id,
        source: 'aayojan-ace',
      },
    },
  };
}

/**
 * Makes an authenticated request to Google Calendar REST API with retry backoff for rate limits.
 */
async function callCalendarApi(
  url: string,
  method: string,
  token: string,
  body?: unknown,
  retries = 2
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      throw new Error(
        'Google Calendar authorization expired. Please click "Connect Google Calendar" to re-authenticate.'
      );
    }

    if (res.status === 403) {
      throw new Error(
        'Google Calendar permission not granted. Please re-authenticate and grant calendar events permission.'
      );
    }

    if ((res.status === 429 || res.status === 503) && attempt < retries) {
      const delay = Math.pow(2, attempt) * 800;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    return res;
  }

  throw new Error('Google Calendar rate limit reached. Please wait a moment and try again.');
}

/**
 * Syncs selected timeline tasks to the user's primary Google Calendar.
 * Updates existing events if task.googleCalendarEventId is already set (idempotent),
 * otherwise creates new calendar events.
 */
export async function syncTasksToGoogleCalendar(options: {
  tasks: TimelineTask[];
  planId: string;
  planTitle: string;
  token: string;
  onProgress?: (progress: SyncProgress) => void;
}): Promise<{
  updatedTasks: TimelineTask[];
  syncedCount: number;
  errors: string[];
}> {
  const { tasks, planId, planTitle, token, onProgress } = options;

  if (tasks.length > MAX_CALENDAR_EVENTS_SYNC) {
    throw new Error(
      `Cannot sync more than ${MAX_CALENDAR_EVENTS_SYNC} events at once. Please select fewer tasks.`
    );
  }

  const updatedTasks: TimelineTask[] = [...tasks];
  let syncedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < updatedTasks.length; i++) {
    const task = updatedTasks[i];
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: updatedTasks.length,
        taskTitle: task.title,
      });
    }

    const payload = buildGoogleCalendarEventBody(task, planId, planTitle);

    try {
      if (task.googleCalendarEventId) {
        // Idempotent update of existing event
        const updateUrl = `${CALENDAR_API_BASE}/${encodeURIComponent(task.googleCalendarEventId)}`;
        const res = await callCalendarApi(updateUrl, 'PUT', token, payload);

        if (res.ok) {
          syncedCount++;
        } else if (res.status === 404 || res.status === 410) {
          // Event was removed from Calendar externally, recreate it
          const createRes = await callCalendarApi(CALENDAR_API_BASE, 'POST', token, payload);
          if (createRes.ok) {
            const data = await createRes.json();
            updatedTasks[i] = { ...task, googleCalendarEventId: data.id };
            syncedCount++;
          } else {
            errors.push(`Failed to recreate "${task.title}": HTTP ${createRes.status}`);
          }
        } else {
          errors.push(`Failed to update "${task.title}": HTTP ${res.status}`);
        }
      } else {
        // Create new event
        const res = await callCalendarApi(CALENDAR_API_BASE, 'POST', token, payload);
        if (res.ok) {
          const data = await res.json();
          updatedTasks[i] = { ...task, googleCalendarEventId: data.id };
          syncedCount++;
        } else {
          errors.push(`Failed to schedule "${task.title}": HTTP ${res.status}`);
        }
      }
    } catch (err) {
      errors.push(`Error on "${task.title}": ${err instanceof Error ? err.message : String(err)}`);
      // Abort early if unauthorized or missing scope
      if (
        err instanceof Error &&
        (err.message.includes('authorization expired') || err.message.includes('permission not granted'))
      ) {
        throw err;
      }
    }
  }

  return { updatedTasks, syncedCount, errors };
}

/**
 * Removes synced calendar events for tasks and resets googleCalendarEventId.
 */
export async function removeGoogleCalendarReminders(options: {
  tasks: TimelineTask[];
  token: string;
  onProgress?: (progress: { current: number; total: number }) => void;
}): Promise<{
  updatedTasks: TimelineTask[];
  removedCount: number;
}> {
  const { tasks, token, onProgress } = options;
  const tasksWithEvents = tasks.filter((t) => Boolean(t.googleCalendarEventId));
  const updatedTasks: TimelineTask[] = [...tasks];
  let removedCount = 0;

  for (let i = 0; i < tasksWithEvents.length; i++) {
    const task = tasksWithEvents[i];
    if (onProgress) {
      onProgress({ current: i + 1, total: tasksWithEvents.length });
    }

    if (task.googleCalendarEventId) {
      try {
        const deleteUrl = `${CALENDAR_API_BASE}/${encodeURIComponent(task.googleCalendarEventId)}`;
        await callCalendarApi(deleteUrl, 'DELETE', token);
      } catch {
        // If already deleted, continue
      }
    }

    const taskIndex = updatedTasks.findIndex((t) => t.id === task.id);
    if (taskIndex !== -1) {
      updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        googleCalendarEventId: undefined,
      };
      removedCount++;
    }
  }

  return { updatedTasks, removedCount };
}
