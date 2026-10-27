import { TimelineTask } from './schemas';
import { TimelinePhase, GUEST_MILESTONE_OFFSETS } from './constants';

export interface DateReflowResult {
  updatedTasks: TimelineTask[];
  summaryText: string;
  stats: {
    overdueCount: number;
    shiftedEarlierCount: number;
    shiftedLaterCount: number;
    daysDelta: number;
  };
}

/**
 * Normalizes a task title for robust duplicate comparison.
 */
export function normalizeTaskTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface GuestMilestoneDef {
  key: string;
  title: string;
  description: string;
  offsetDays: number;
  weddingOnly?: boolean;
  matchTerms: string[];
}

export const GUEST_MILESTONE_DEFS: GuestMilestoneDef[] = [
  {
    key: 'save-the-date',
    title: 'Send save-the-date announcements',
    description: 'Share celebration date with out-of-town guests and key families.',
    offsetDays: GUEST_MILESTONE_OFFSETS.SAVE_THE_DATE_DAYS,
    weddingOnly: true,
    matchTerms: ['save the date', 'save-the-date'],
  },
  {
    key: 'invitations',
    title: 'Send invitations to guests',
    description: 'Distribute physical or digital invitations with venue and RSVP instructions.',
    offsetDays: GUEST_MILESTONE_OFFSETS.INVITATIONS_DAYS,
    matchTerms: ['invitation', 'invite guest', 'send invite', 'send invitations'],
  },
  {
    key: 'rsvp-followup',
    title: 'Follow up on RSVPs',
    description: 'Contact pending guests to confirm attendance and dietary preferences.',
    offsetDays: GUEST_MILESTONE_OFFSETS.RSVP_FOLLOWUP_DAYS,
    matchTerms: ['follow up on rsvp', 'rsvp follow', 'confirm rsvp', 'track rsvp', 'rsvp'],
  },
  {
    key: 'headcount-caterer',
    title: 'Share final headcount with caterer and venue',
    description: 'Lock in final attendee numbers with hospitality and catering teams.',
    offsetDays: GUEST_MILESTONE_OFFSETS.FINAL_HEADCOUNT_DAYS,
    matchTerms: ['headcount', 'final count', 'caterer count', 'venue headcount'],
  },
];

/**
 * Injects deterministic guest communication milestones into every plan.
 * Avoids duplicate tasks if a similar task already exists.
 * If event is closer than an offset allows, sets deadline to tomorrow and marks as Time-sensitive.
 */
export function injectGuestMilestones(
  tasks: TimelineTask[],
  eventDate: string,
  eventType: string,
  referenceDate: string = formatDateISO(new Date())
): TimelineTask[] {
  const eventDateTime = parseDateISO(eventDate).getTime();
  const refDateTime = parseDateISO(referenceDate).getTime();
  const msPerDay = 1000 * 60 * 60 * 24;
  const tomorrowTime = refDateTime + msPerDay;

  const resultTasks = [...tasks];

  for (const def of GUEST_MILESTONE_DEFS) {
    if (def.weddingOnly && eventType !== 'Wedding') {
      continue;
    }

    // Check if tasks already have a matching task
    const existingIndex = resultTasks.findIndex((t) => {
      const norm = normalizeTaskTitle(t.title);
      return def.matchTerms.some((term) => norm.includes(term));
    });

    if (existingIndex !== -1) {
      resultTasks[existingIndex] = {
        ...resultTasks[existingIndex],
        isGuestMilestone: true,
      };
      continue;
    }

    // Calculate due date
    const idealDueTime = eventDateTime - def.offsetDays * msPerDay;
    const isTooClose = idealDueTime <= refDateTime;
    const effectiveDueTime = isTooClose
      ? Math.min(tomorrowTime, eventDateTime)
      : idealDueTime;
    const effectiveDueDate = new Date(effectiveDueTime);
    const dueDateStr = formatDateISO(effectiveDueDate);

    const daysUntilTask = Math.round((effectiveDueTime - refDateTime) / msPerDay);
    const daysBeforeEvent = Math.max(
      0,
      Math.round((eventDateTime - effectiveDueTime) / msPerDay)
    );
    const phase = assignPhaseForDueDate(daysUntilTask, daysBeforeEvent);

    const newTask: TimelineTask = {
      id: `milestone-${def.key}`,
      phase,
      title: def.title,
      description: def.description,
      dueDate: dueDateStr,
      owner: 'Host / Host Family',
      completed: false,
      daysBeforeEvent,
      isGuestMilestone: true,
      isTimeSensitive: isTooClose,
    };

    resultTasks.push(newTask);
  }

  return resultTasks.sort((a, b) => {
    if (a.dueDate !== b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    return b.daysBeforeEvent - a.daysBeforeEvent;
  });
}

/**
 * Pure helper to compute date string formatted YYYY-MM-DD from a Date object.
 */
export function formatDateISO(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Pure helper to parse YYYY-MM-DD (or ISO 8601 string) into a UTC Date object.
 */
export function parseDateISO(isoString: string): Date {
  const datePart = isoString.includes('T') ? isoString.split('T')[0] : isoString;
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

/**
 * Dynamically assigns a task to an intuitive timeline phase based on its updated deadline.
 */
export function assignPhaseForDueDate(
  daysUntilTask: number,
  daysBeforeEvent: number
): TimelinePhase {
  if (daysBeforeEvent === 0) {
    return 'Event day';
  }
  if (daysBeforeEvent <= 7 && daysBeforeEvent > 0) {
    return 'Event week';
  }
  if (daysUntilTask <= 0) {
    return 'Now';
  }
  if (daysUntilTask <= 7) {
    return 'Next 7 days';
  }
  return 'Next 30 days';
}

/**
 * Pure function that recalculates timeline task deadlines when an event date shifts.
 * Computes deterministic diffs and overdue warnings without calling any AI.
 *
 * @param tasks - The existing list of timeline tasks
 * @param oldEventDate - Previous event date (YYYY-MM-DD)
 * @param newEventDate - New event date (YYYY-MM-DD)
 * @param referenceDate - Current reference date for overdue calculation (defaults to today UTC)
 */
export function reflowTimelineDates(
  tasks: TimelineTask[],
  oldEventDate: string,
  newEventDate: string,
  referenceDate: string = formatDateISO(new Date()),
  options?: { clampPastDates?: boolean }
): DateReflowResult {
  const oldDate = parseDateISO(oldEventDate);
  const newDate = parseDateISO(newEventDate);
  const refDate = parseDateISO(referenceDate);

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDelta = Math.round((newDate.getTime() - oldDate.getTime()) / msPerDay);

  let overdueCount = 0;
  let shiftedEarlierCount = 0;
  let shiftedLaterCount = 0;

  const updatedTasks: TimelineTask[] = tasks.map((task) => {
    // Retain or calculate daysBeforeEvent
    const daysBeforeEvent =
      typeof task.daysBeforeEvent === 'number'
        ? task.daysBeforeEvent
        : Math.round((oldDate.getTime() - parseDateISO(task.dueDate).getTime()) / msPerDay);

    // New deadline = newEventDate - daysBeforeEvent
    const updatedDueTime = newDate.getTime() - daysBeforeEvent * msPerDay;
    const updatedDueDate = new Date(updatedDueTime);
    const updatedDueDateStr = formatDateISO(updatedDueDate);

    let daysUntilTask = Math.round((updatedDueDate.getTime() - refDate.getTime()) / msPerDay);
    let finalDueDateStr = updatedDueDateStr;

    if (daysUntilTask < 0 && !task.completed) {
      overdueCount++;
    }

    let isTimeSensitive = Boolean(
      task.isTimeSensitive || (task.isGuestMilestone && daysUntilTask <= 2 && daysBeforeEvent > 0)
    );

    if (options?.clampPastDates && daysUntilTask < 0) {
      isTimeSensitive = true;
      finalDueDateStr = referenceDate;
      daysUntilTask = 0;
    }

    if (daysDelta < 0) {
      shiftedEarlierCount++;
    } else if (daysDelta > 0) {
      shiftedLaterCount++;
    }

    const newPhase = assignPhaseForDueDate(daysUntilTask, daysBeforeEvent);

    return {
      ...task,
      dueDate: finalDueDateStr,
      phase: newPhase,
      daysBeforeEvent,
      isTimeSensitive,
    };
  });

  const phrases: string[] = [];
  if (daysDelta < 0) {
    phrases.push(`Event moved ${Math.abs(daysDelta)} days earlier`);
  } else if (daysDelta > 0) {
    phrases.push(`Event moved ${daysDelta} days later`);
  } else {
    phrases.push('Event date unchanged');
  }

  if (overdueCount > 0) {
    phrases.push(`${overdueCount} task${overdueCount === 1 ? '' : 's'} became overdue`);
  }
  if (shiftedEarlierCount > 0) {
    phrases.push(`${shiftedEarlierCount} deadline${shiftedEarlierCount === 1 ? '' : 's'} moved earlier`);
  } else if (shiftedLaterCount > 0) {
    phrases.push(`${shiftedLaterCount} deadline${shiftedLaterCount === 1 ? '' : 's'} moved later`);
  }

  return {
    updatedTasks,
    summaryText: phrases.join('; '),
    stats: {
      overdueCount,
      shiftedEarlierCount,
      shiftedLaterCount,
      daysDelta,
    },
  };
}
