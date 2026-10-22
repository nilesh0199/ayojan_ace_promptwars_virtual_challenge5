'use client';

import React, { useState, useEffect } from 'react';
import { usePlan } from '../plan-context';
import { TIMELINE_PHASES } from '@/lib/constants';
import { triggerIcsDownload, generateTimelineIcs } from '@/lib/ics';
import {
  getCalendarAccessToken,
  requestGoogleCalendarAccess,
} from '@/lib/firebase/auth';
import {
  syncTasksToGoogleCalendar,
  removeGoogleCalendarReminders,
  MAX_CALENDAR_EVENTS_SYNC,
  SyncProgress,
} from '@/lib/google-calendar';
import {
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Circle,
  User,
  Tag,
  Info,
  Bell,
  Clock,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export function TabTimeline() {
  const {
    activePlan,
    toggleTaskCompletion,
    updateEventDate,
    updateTimelineTasks,
    dateReflowNotice,
  } = usePlan();

  const [newEventDateInput, setNewEventDateInput] = useState(activePlan?.date || '');

  // Google Calendar Reminders panel state
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [removeProgress, setRemoveProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const [remindersNotice, setRemindersNotice] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Initialize selected tasks and calendar connection status
  useEffect(() => {
    if (activePlan) {
      setSelectedTaskIds(activePlan.timeline.map((t) => t.id));
      setIsCalendarConnected(Boolean(getCalendarAccessToken()));
    }
  }, [activePlan]);

  if (!activePlan) return null;

  const handleDateShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventDateInput || newEventDateInput === activePlan.date) return;
    updateEventDate(newEventDateInput);
  };

  const handleExportIcs = () => {
    const icsContent = generateTimelineIcs(activePlan.title, activePlan.timeline);
    triggerIcsDownload(
      `${activePlan.title.toLowerCase().replace(/\s+/g, '-')}-timeline.ics`,
      icsContent
    );
  };

  const handleConnectCalendar = async () => {
    setIsConnecting(true);
    setRemindersNotice(null);
    try {
      await requestGoogleCalendarAccess();
      setIsCalendarConnected(true);
      setRemindersNotice({
        type: 'success',
        message: 'Connected to Google Calendar! You can now sync milestone reminders.',
      });
    } catch (err) {
      setRemindersNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to authorize Google Calendar.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedTaskIds.length === activePlan.timeline.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(activePlan.timeline.map((t) => t.id));
    }
  };

  const handleToggleTask = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSyncReminders = async () => {
    let token = getCalendarAccessToken();
    if (!token) {
      try {
        token = await requestGoogleCalendarAccess();
        setIsCalendarConnected(true);
      } catch (err) {
        setRemindersNotice({
          type: 'error',
          message:
            err instanceof Error ? err.message : 'Please connect Google Calendar to sync reminders.',
        });
        return;
      }
    }

    const tasksToSync = activePlan.timeline.filter((t) => selectedTaskIds.includes(t.id));
    if (tasksToSync.length === 0) {
      setRemindersNotice({
        type: 'info',
        message: 'Please select at least one task to sync reminders.',
      });
      return;
    }

    if (tasksToSync.length > MAX_CALENDAR_EVENTS_SYNC) {
      setRemindersNotice({
        type: 'error',
        message: `Maximum ${MAX_CALENDAR_EVENTS_SYNC} events per sync. Please deselect some tasks.`,
      });
      return;
    }

    setIsSyncing(true);
    setRemindersNotice(null);

    try {
      const result = await syncTasksToGoogleCalendar({
        tasks: tasksToSync,
        planId: activePlan.id,
        planTitle: activePlan.title,
        token,
        onProgress: (p) => setSyncProgress(p),
      });

      // Merge updated tasks back into active plan timeline
      const updatedMap = new Map(result.updatedTasks.map((t) => [t.id, t]));
      const mergedTimeline = activePlan.timeline.map((t) => updatedMap.get(t.id) || t);
      updateTimelineTasks(mergedTimeline);

      setRemindersNotice({
        type: 'success',
        message: `Synced ${result.syncedCount} reminder(s) to Google Calendar with 1-day email & 1-hour popup alert.${
          result.errors.length > 0 ? ` (${result.errors.length} failed)` : ''
        }`,
      });
    } catch (err) {
      setRemindersNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to sync to Google Calendar.',
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const handleRemoveReminders = async () => {
    let token = getCalendarAccessToken();
    if (!token) {
      try {
        token = await requestGoogleCalendarAccess();
        setIsCalendarConnected(true);
      } catch (err) {
        setRemindersNotice({
          type: 'error',
          message: 'Please connect Google Calendar to remove existing reminders.',
        });
        return;
      }
    }

    const tasksWithReminders = activePlan.timeline.filter((t) => Boolean(t.googleCalendarEventId));
    if (tasksWithReminders.length === 0) {
      setRemindersNotice({
        type: 'info',
        message: 'No synced Google Calendar reminders found to remove.',
      });
      return;
    }

    setIsRemoving(true);
    setRemindersNotice(null);

    try {
      const result = await removeGoogleCalendarReminders({
        tasks: activePlan.timeline,
        token,
        onProgress: (p) => setRemoveProgress(p),
      });

      updateTimelineTasks(result.updatedTasks);
      setRemindersNotice({
        type: 'success',
        message: `Successfully removed ${result.removedCount} event(s) from your Google Calendar.`,
      });
    } catch (err) {
      setRemindersNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to remove reminders.',
      });
    } finally {
      setIsRemoving(false);
      setRemoveProgress(null);
    }
  };

  const scheduledCount = activePlan.timeline.filter((t) => Boolean(t.googleCalendarEventId)).length;

  return (
    <div className="space-y-8">
      {/* Date Reflow Controls & Notice */}
      <div className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-rule">
          <div>
            <h2 className="font-serif font-bold text-xl text-ink">
              Timeline Milestones &amp; Date Reflow
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Moving the event date automatically recalculates task deadlines locally using deterministic code logic.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportIcs}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-rule bg-paper text-ink text-xs font-semibold hover:bg-paper-subtle transition-colors shrink-0"
          >
            <CalendarCheck className="h-4 w-4 text-accent" aria-hidden="true" />
            <span>Export to .ics Calendar</span>
          </button>
        </div>

        {/* Date Reflow Form */}
        <form onSubmit={handleDateShift} className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="new-event-date" className="text-xs font-medium text-ink">
            Current Celebration Date:
          </label>
          <input
            id="new-event-date"
            type="date"
            value={newEventDateInput}
            onChange={(e) => setNewEventDateInput(e.target.value)}
            className="min-h-[44px] rounded-lg border border-rule bg-paper px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-hidden"
          />
          <button
            type="submit"
            disabled={!newEventDateInput || newEventDateInput === activePlan.date}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-accent text-accent-text text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            Recalculate Deadlines
          </button>
        </form>

        {/* Reflow Diff Notice */}
        {dateReflowNotice && (
          <div className="mt-4 p-3 rounded-lg bg-accent-subtle/70 border border-accent/30 text-xs text-accent flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <strong>Date Reflow Outcome:</strong> {dateReflowNotice}
            </div>
          </div>
        )}
      </div>

      {/* Google Calendar Reminders Panel */}
      <section
        aria-labelledby="reminders-panel-title"
        className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rule">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="reminders-panel-title" className="font-serif font-bold text-lg text-ink">
                Google Calendar Reminders
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Automatically schedule 9:00 AM milestone events with 1-day email and 1-hour popup alerts.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!isCalendarConnected ? (
              <button
                type="button"
                onClick={handleConnectCalendar}
                disabled={isConnecting}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-accent text-accent-text text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                )}
                <span>Connect Google Calendar</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Calendar Connected</span>
              </span>
            )}

            {scheduledCount > 0 && (
              <button
                type="button"
                onClick={handleRemoveReminders}
                disabled={isRemoving || isSyncing}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border border-rule text-ink-muted hover:text-state-error hover:bg-state-error-subtle text-xs font-medium transition-colors disabled:opacity-50"
              >
                {isRemoving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                )}
                <span>Remove Reminders ({scheduledCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Status and Alerts */}
        <div aria-live="polite" aria-atomic="true">
          {remindersNotice && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                remindersNotice.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : remindersNotice.type === 'error'
                  ? 'bg-state-error-subtle border border-state-error text-state-error'
                  : 'bg-accent-subtle border border-accent/30 text-accent'
              }`}
            >
              {remindersNotice.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <span>{remindersNotice.message}</span>
            </div>
          )}

          {isSyncing && syncProgress && (
            <div className="p-3.5 rounded-xl bg-accent-subtle/80 border border-accent/30 text-xs text-accent space-y-2">
              <div className="flex items-center justify-between">
                <span>
                  Syncing task {syncProgress.current} of {syncProgress.total}: &ldquo;{syncProgress.taskTitle}&rdquo;
                </span>
                <span className="font-mono">
                  {Math.round((syncProgress.current / syncProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-paper rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-200"
                  style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {isRemoving && removeProgress && (
            <div className="p-3.5 rounded-xl bg-paper-subtle border border-rule text-xs text-ink-muted">
              Removing event {removeProgress.current} of {removeProgress.total} from Google Calendar...
            </div>
          )}
        </div>

        {/* Task Selection Area */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="font-medium text-accent hover:underline min-h-[32px] flex items-center"
              >
                {selectedTaskIds.length === activePlan.timeline.length
                  ? 'Deselect All Tasks'
                  : 'Select All Tasks'}
              </button>
              <span>·</span>
              <span>
                {selectedTaskIds.length} of {activePlan.timeline.length} tasks selected
              </span>
            </div>

            <button
              type="button"
              onClick={handleSyncReminders}
              disabled={isSyncing || selectedTaskIds.length === 0}
              className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-xl bg-accent text-accent-text text-xs font-semibold hover:bg-accent-hover transition-colors shadow-xs disabled:opacity-50"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Clock className="h-4 w-4" aria-hidden="true" />
              )}
              <span>Sync Reminders ({selectedTaskIds.length})</span>
            </button>
          </div>

          {/* Quick task checklist for selection */}
          <div className="max-h-60 overflow-y-auto rounded-xl border border-rule bg-paper p-3 divide-y divide-rule/60 text-xs">
            {activePlan.timeline.map((task) => {
              const isSelected = selectedTaskIds.includes(task.id);
              const isScheduled = Boolean(task.googleCalendarEventId);

              return (
                <label
                  key={task.id}
                  className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-paper-subtle/60 rounded cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleTask(task.id)}
                      className="rounded border-rule text-accent focus:ring-accent h-4 w-4"
                      aria-label={`Select ${task.title}`}
                    />
                    <span className={`truncate text-ink ${isSelected ? 'font-medium' : ''}`}>
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {isScheduled && (
                      <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        Scheduled
                      </span>
                    )}
                    <span className="font-mono text-ink-muted text-[11px]">{task.dueDate}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </section>

      {/* Phased Vertical Timeline Track */}
      <div className="space-y-8">
        {TIMELINE_PHASES.map((phase) => {
          const tasksInPhase = activePlan.timeline.filter((t) => t.phase === phase);
          if (tasksInPhase.length === 0) return null;

          return (
            <div key={phase} className="relative">
              {/* Phase Header */}
              <div className="sticky top-16 z-10 py-2 bg-paper/95 backdrop-blur-xs flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-accent ring-4 ring-accent-subtle" />
                <h3 className="font-serif font-bold text-lg text-ink">
                  {phase}
                </h3>
                <span className="text-xs font-mono text-ink-muted">
                  ({tasksInPhase.length} item{tasksInPhase.length === 1 ? '' : 's'})
                </span>
                <div className="flex-1 h-px bg-rule" />
              </div>

              {/* Task Items vertical track */}
              <div className="ml-1.5 pl-6 border-l-2 border-rule space-y-3 mt-3">
                {tasksInPhase.map((task) => (
                  <div
                    key={task.id}
                    className={`rounded-xl border p-4 transition-all ${
                      task.completed
                        ? 'border-rule/60 bg-paper-subtle/30 opacity-75'
                        : 'border-rule bg-paper-card shadow-xs hover:border-accent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Checkbox and Title */}
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleTaskCompletion(task.id)}
                          aria-label={`Mark task "${task.title}" as ${
                            task.completed ? 'incomplete' : 'complete'
                          }`}
                          className="mt-0.5 rounded-full p-1 text-accent hover:bg-accent-subtle transition-colors focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-state-success" aria-hidden="true" />
                          ) : (
                            <Circle className="h-5 w-5 text-ink-faint hover:text-accent" aria-hidden="true" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4
                              className={`text-sm font-semibold text-ink ${
                                task.completed ? 'line-through text-ink-muted' : ''
                              }`}
                            >
                              {task.title}
                            </h4>
                            {task.googleCalendarEventId && (
                              <span
                                title="Synced to Google Calendar"
                                className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20"
                              >
                                <Bell className="h-2.5 w-2.5" aria-hidden="true" />
                                <span>Reminder Active</span>
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-ink-muted leading-relaxed">
                            {task.description}
                          </p>
                        </div>
                      </div>

                      {/* Due Date & Owner */}
                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 text-xs font-mono font-medium text-ink">
                          <Calendar className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                          {task.dueDate}
                        </span>
                        {task.owner && (
                          <span className="mt-1 flex items-center justify-end gap-1 text-[11px] text-ink-muted">
                            <User className="h-3 w-3" aria-hidden="true" />
                            {task.owner}
                          </span>
                        )}
                        {task.estimatedCostLink && (
                          <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-ink-faint">
                            <Tag className="h-3 w-3" aria-hidden="true" />
                            {task.estimatedCostLink}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
