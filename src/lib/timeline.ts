import { TimelineTask } from './schemas';
import { TimelinePhase } from './constants';

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
 * Pure helper to compute date string formatted YYYY-MM-DD from a Date object.
 */
export function formatDateISO(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Pure helper to parse YYYY-MM-DD into a UTC Date object.
 */
export function parseDateISO(isoString: string): Date {
  const [y, m, d] = isoString.split('-').map(Number);
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
  referenceDate: string = formatDateISO(new Date())
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

    const daysUntilTask = Math.round((updatedDueDate.getTime() - refDate.getTime()) / msPerDay);

    if (daysUntilTask < 0 && !task.completed) {
      overdueCount++;
    }

    if (daysDelta < 0) {
      shiftedEarlierCount++;
    } else if (daysDelta > 0) {
      shiftedLaterCount++;
    }

    const newPhase = assignPhaseForDueDate(daysUntilTask, daysBeforeEvent);

    return {
      ...task,
      dueDate: updatedDueDateStr,
      phase: newPhase,
      daysBeforeEvent,
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
