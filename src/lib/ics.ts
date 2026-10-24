import { TimelineTask } from './schemas';

/**
 * Escapes characters for iCalendar text format according to RFC 5545.
 */
function escapeIcsText(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Formats a YYYY-MM-DD date string into ICS VALUE=DATE format (YYYYMMDD).
 */
export function formatIcsDate(isoDate: string): string {
  return isoDate.replace(/-/g, '');
}

/**
 * Generates an RFC 5545 compliant .ics calendar string for event timeline tasks.
 * Pure function with zero external libraries.
 *
 * @param eventTitle - Name of the celebration/event
 * @param tasks - List of timeline tasks with deadlines
 * @param muhuratTime - Optional auspicious ritual start time ("HH:mm") for event day tasks
 * @param muhuratLabel - Optional label for the muhurat ritual (e.g. "Pheras", "Pooja")
 */
export function generateTimelineIcs(
  eventTitle: string,
  tasks: TimelineTask[],
  muhuratTime?: string,
  muhuratLabel?: string
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Aayojan Ace//Celebration and Event Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(eventTitle)} Milestones`,
  ];

  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  for (const task of tasks) {
    const dtDate = formatIcsDate(task.dueDate);
    const isEventDay = task.phase === 'Event day';

    let dtStartLine = `DTSTART;VALUE=DATE:${dtDate}`;
    let dtEndLine = `DTEND;VALUE=DATE:${dtDate}`;

    if (isEventDay && muhuratTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(muhuratTime)) {
      const cleanTime = muhuratTime.replace(':', '');
      const [h, m] = muhuratTime.split(':').map(Number);
      const endH = (h + 1) % 24;
      const endClean = `${String(endH).padStart(2, '0')}${String(m).padStart(2, '0')}`;
      dtStartLine = `DTSTART:${dtDate}T${cleanTime}00`;
      dtEndLine = `DTEND:${dtDate}T${endClean}00`;
    }

    const descriptionText = [
      task.description,
      task.owner ? `Owner: ${task.owner}` : '',
      `Phase: ${task.phase}`,
      isEventDay && muhuratTime
        ? `Auspicious Muhurat Timing: ${muhuratTime}${muhuratLabel ? ` (${muhuratLabel})` : ''}`
        : '',
      task.estimatedCostLink ? `Estimated Cost Reference: ${task.estimatedCostLink}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    lines.push(
      'BEGIN:VEVENT',
      `UID:aayojan-ace-${task.id}@aayojanace.app`,
      `DTSTAMP:${nowStamp}`,
      dtStartLine,
      dtEndLine,
      `SUMMARY:${escapeIcsText(`[Aayojan Ace] ${task.title}`)}`,
      `DESCRIPTION:${escapeIcsText(descriptionText)}`,
      `STATUS:${task.completed ? 'COMPLETED' : 'CONFIRMED'}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcsText(`Reminder: ${task.title}`)}`,
      'TRIGGER:-P1D',
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers a browser download of the generated .ics file.
 */
export function triggerIcsDownload(fileName: string, icsContent: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.setAttribute('download', fileName.endsWith('.ics') ? fileName : `${fileName}.ics`);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
