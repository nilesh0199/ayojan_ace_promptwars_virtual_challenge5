'use client';

import React, { useState } from 'react';
import { usePlan } from '../plan-context';
import { TIMELINE_PHASES, TimelinePhase } from '@/lib/constants';
import { triggerIcsDownload, generateTimelineIcs } from '@/lib/ics';
import {
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Circle,
  Clock,
  User,
  Tag,
  ArrowRight,
  Info,
} from 'lucide-react';

export function TabTimeline() {
  const {
    activePlan,
    toggleTaskCompletion,
    updateEventDate,
    dateReflowNotice,
  } = usePlan();

  const [newEventDateInput, setNewEventDateInput] = useState(activePlan?.date || '');

  if (!activePlan) return null;

  const handleDateShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventDateInput || newEventDateInput === activePlan.date) return;
    updateEventDate(newEventDateInput);
  };

  const handleExportIcs = () => {
    const icsContent = generateTimelineIcs(activePlan.title, activePlan.timeline);
    triggerIcsDownload(`${activePlan.title.toLowerCase().replace(/\s+/g, '-')}-timeline.ics`, icsContent);
  };

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
                          <h4
                            className={`text-sm font-semibold text-ink ${
                              task.completed ? 'line-through text-ink-muted' : ''
                            }`}
                          >
                            {task.title}
                          </h4>
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
