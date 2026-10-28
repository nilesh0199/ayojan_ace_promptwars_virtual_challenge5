'use client';

import React, { useState, useEffect } from 'react';
import { usePlan } from '../plan-context';
import { useAuth } from '../auth-context';
import { TIMELINE_PHASES } from '@/lib/constants';
import { triggerIcsDownload, generateTimelineIcs } from '@/lib/ics';
import {
  getCalendarAccessToken,
  requestGoogleCalendarAccess,
} from '@/lib/firebase/auth';
import {
  syncTasksToGoogleCalendar,
  removeGoogleCalendarReminders,
  buildGoogleCalendarTemplateUrl,
  MAX_CALENDAR_EVENTS_SYNC,
  SyncProgress,
} from '@/lib/google-calendar';
import { DraftInviteModal } from './draft-invite-modal';
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
  ChevronDown,
  ChevronUp,
  Share2,
  AlertTriangle,
  Download,
} from 'lucide-react';

export function TabTimeline() {
  const {
    activePlan,
    toggleTaskCompletion,
    updateTaskAssignee,
    updateEventDate,
    updateTimelineTasks,
    dateReflowNotice,
  } = usePlan();
  const { user } = useAuth();

  const [newEventDateInput, setNewEventDateInput] = useState(activePlan?.date || '');

  // Google Calendar Reminders panel state
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [showAdvancedSync, setShowAdvancedSync] = useState(false);
  const [draftInviteTask, setDraftInviteTask] = useState<any>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlan?.id, activePlan?.timeline.length]);

  if (!activePlan) return null;

  const handleDateShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventDateInput || newEventDateInput === activePlan.date) return;
    updateEventDate(newEventDateInput);
  };

  const handleExportIcs = () => {
    const icsContent = generateTimelineIcs(
      activePlan.title,
      activePlan.timeline,
      activePlan.muhuratTime,
      activePlan.muhuratLabel
    );
    triggerIcsDownload(
      `${activePlan.title.toLowerCase().replace(/\s+/g, '-')}-timeline.ics`,
      icsContent
    );
  };

  const handleConnectCalendar = async () => {
    setIsConnecting(true);
    setRemindersNotice(null);
    try {
      await requestGoogleCalendarAccess(user?.email || undefined);
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
        token = await requestGoogleCalendarAccess(user?.email || undefined);
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
        token = await requestGoogleCalendarAccess(user?.email || undefined);
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
            <Download className="h-4 w-4 text-accent" aria-hidden="true" />
            <span>Download All as .ics</span>
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

      {/* Google Calendar Reminders Panel - Warning-Free Default Path */}
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
                Calendar Reminders &amp; Direct Schedule
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Add milestones directly to Google Calendar or export all events to an .ics file with 1-day reminders. No sign-in or permissions required.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportIcs}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-accent text-accent-text text-xs font-semibold hover:bg-accent-hover transition-colors shadow-xs"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Download All as .ics</span>
            </button>
          </div>
        </div>

        {/* Primary Explanation: Warning-Free Options */}
        <div className="p-3.5 rounded-xl bg-paper-subtle/70 border border-rule text-xs text-ink-muted space-y-1.5">
          <p className="font-medium text-ink">
            <strong>Warning-Free Default Path:</strong>
          </p>
          <p>
            Each timeline task below includes an <strong>&ldquo;Add to Google Calendar&rdquo;</strong> direct link. Clicking it opens a pre-filled event template in a new tab without requesting OAuth scopes or showing unverified app screens. Reminders follow your own personal calendar preferences.
          </p>
        </div>

        {/* Advanced: Collapsible OAuth Auto-Sync Section */}
        <div className="pt-2 border-t border-rule/60">
          <button
            type="button"
            onClick={() => setShowAdvancedSync(!showAdvancedSync)}
            className="flex items-center justify-between w-full text-left py-2 text-xs font-semibold text-accent hover:underline min-h-[36px]"
          >
            <span>Advanced: Auto-sync all selected tasks with email &amp; popup reminders</span>
            {showAdvancedSync ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          {showAdvancedSync && (
            <div className="mt-4 p-4 rounded-xl border border-rule bg-paper space-y-4">
              {/* Calm reassurance note regarding Google Unverified App screen */}
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <div className="leading-relaxed">
                  <strong>Verification Notice:</strong> Because Aayojan Ace is an independent community planner, Google may show a &ldquo;Google hasn&apos;t verified this app&rdquo; screen. To continue, click <strong>Advanced</strong>, then <strong>Go to Aayojan Ace</strong>. This application strictly creates the calendar events you explicitly choose and never reads or modifies your personal calendar.
                </div>
              </div>

              {/* OAuth Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {!isCalendarConnected ? (
                    <button
                      type="button"
                      onClick={handleConnectCalendar}
                      disabled={isConnecting}
                      className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-xl bg-accent text-accent-text text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
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
                      className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl border border-rule text-ink-muted hover:text-state-error hover:bg-state-error-subtle text-xs font-medium transition-colors disabled:opacity-50"
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
                  <span>Sync Selected ({selectedTaskIds.length})</span>
                </button>
              </div>

              {/* Task Checklist for OAuth Sync */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="font-medium text-accent hover:underline min-h-[28px] flex items-center"
                  >
                    {selectedTaskIds.length === activePlan.timeline.length
                      ? 'Deselect All Tasks'
                      : 'Select All Tasks'}
                  </button>
                  <span>
                    {selectedTaskIds.length} of {activePlan.timeline.length} selected
                  </span>
                </div>

                <div data-lenis-prevent className="max-h-52 overflow-y-auto rounded-xl border border-rule bg-paper p-2.5 divide-y divide-rule/60 text-xs scroll-smooth">
                  {activePlan.timeline.map((task) => {
                    const isSelected = selectedTaskIds.includes(task.id);
                    const isScheduled = Boolean(task.googleCalendarEventId);

                    return (
                      <label
                        key={task.id}
                        className="py-2 px-2 flex items-center justify-between gap-3 hover:bg-paper-subtle rounded cursor-pointer transition-colors"
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

                        <div className="flex items-center gap-2 shrink-0">
                          {isScheduled && (
                            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              Synced
                            </span>
                          )}
                          <span className="font-mono text-ink-muted text-[11px]">{task.dueDate}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
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
                {tasksInPhase.map((task) => {
                  const isEventDayTask = phase === 'Event day';
                  const googleCalUrl = buildGoogleCalendarTemplateUrl({
                    taskTitle: task.title,
                    planTitle: activePlan.title,
                    dueDate: task.dueDate,
                    startTime: isEventDayTask ? activePlan.muhuratTime : undefined,
                  });

                  return (
                    <div
                      key={task.id}
                      className={`rounded-xl border p-4 transition-all ${
                        task.completed
                          ? 'border-rule/60 bg-paper-subtle/30 opacity-75'
                          : 'border-rule bg-paper-card shadow-xs hover:border-accent'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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
                            <div className="flex flex-wrap items-center gap-2">
                              <h4
                                className={`text-sm font-semibold text-ink ${
                                  task.completed ? 'line-through text-ink-muted' : ''
                                }`}
                              >
                                {task.title}
                              </h4>

                              {/* Time-sensitive indicator */}
                              {task.isTimeSensitive && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
                                  <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                                  <span>Time-sensitive</span>
                                </span>
                              )}

                              {/* Guest milestone badge */}
                              {task.isGuestMilestone && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-800 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                                  <span>Guest Communication</span>
                                </span>
                              )}

                              {task.googleCalendarEventId && (
                                <span
                                  title="Synced to Google Calendar"
                                  className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20"
                                >
                                  <Bell className="h-2.5 w-2.5" aria-hidden="true" />
                                  <span>Reminder Active</span>
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-ink-muted leading-relaxed">
                              {task.description}
                            </p>

                            {/* Action links row */}
                            <div className="mt-2.5 flex flex-wrap items-center gap-3">
                              {/* Warning-free direct Google Calendar URL */}
                              <a
                                href={googleCalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                                aria-label={`Add "${task.title}" to Google Calendar in a new tab`}
                              >
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                <span>Add to Google Calendar</span>
                              </a>

                              {/* Draft invite button on invitation tasks */}
                              {task.isGuestMilestone && (
                                <button
                                  type="button"
                                  onClick={() => setDraftInviteTask(task)}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:bg-accent-subtle/80 bg-accent-subtle px-2 py-0.5 rounded-md transition-colors"
                                >
                                  <Share2 className="h-3 w-3" aria-hidden="true" />
                                  <span>Draft invite</span>
                                </button>
                              )}
                            </div>

                            {/* Assignee / Who is handling this? */}
                            <div className="mt-3 pt-2.5 border-t border-rule/50 flex flex-wrap items-center gap-2">
                              <label
                                htmlFor={`assignee-${task.id}`}
                                className="text-xs font-medium text-ink-muted flex items-center gap-1.5 shrink-0"
                              >
                                <User className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                                <span>Assignee:</span>
                              </label>
                              <div className="relative flex-1 min-w-[200px] max-w-sm">
                                <input
                                  id={`assignee-${task.id}`}
                                  type="text"
                                  maxLength={60}
                                  value={task.assignee ?? task.owner ?? ''}
                                  onChange={(e) => updateTaskAssignee(task.id, e.target.value)}
                                  placeholder="Who is handling this?"
                                  className="w-full h-8 px-2.5 py-1 text-xs rounded-lg border border-rule bg-paper text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Due Date & Owner */}
                        <div className="sm:text-right shrink-0 pl-9 sm:pl-0">
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-medium text-ink">
                            <Calendar className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                            {task.dueDate}
                          </span>
                          {task.owner && (
                            <span className="mt-1 flex items-center sm:justify-end gap-1 text-[11px] text-ink-muted">
                              <User className="h-3 w-3" aria-hidden="true" />
                              {task.owner}
                            </span>
                          )}
                          {task.estimatedCostLink && (
                            <span className="mt-1 flex items-center sm:justify-end gap-1 text-[10px] text-ink-faint">
                              <Tag className="h-3 w-3" aria-hidden="true" />
                              {task.estimatedCostLink}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Accessible Draft Invite Modal */}
      {draftInviteTask && (
        <DraftInviteModal
          isOpen={Boolean(draftInviteTask)}
          onClose={() => setDraftInviteTask(null)}
          plan={activePlan}
          task={draftInviteTask}
        />
      )}
    </div>
  );
}
