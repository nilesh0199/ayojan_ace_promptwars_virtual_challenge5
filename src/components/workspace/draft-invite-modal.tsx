'use client';

import React, { useState, useEffect, useRef } from 'react';
import { EventPlan, TimelineTask } from '@/lib/schemas';
import { X, Copy, Check, MessageSquare, Mail, Share2 } from 'lucide-react';

interface DraftInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: EventPlan;
  task: TimelineTask;
}

export function DraftInviteModal({
  isOpen,
  onClose,
  plan,
  task,
}: DraftInviteModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const [eventName, setEventName] = useState(plan.title);
  const [eventDate, setEventDate] = useState(plan.date);
  const [venueCity, setVenueCity] = useState(plan.city);
  const [rsvpDate, setRsvpDate] = useState(task.dueDate);
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);

  // Generate initial invitation message from fields
  useEffect(() => {
    if (isOpen) {
      setEventName(plan.title);
      setEventDate(plan.date);
      setVenueCity(plan.city);
      setRsvpDate(task.dueDate);

      const generated = [
        `You are warmly invited to ${plan.title}!`,
        '',
        `📅 Date: ${plan.date}`,
        `📍 Venue / City: ${plan.city}`,
        `⏳ Kindly RSVP by: ${task.dueDate}`,
        '',
        'We would love to celebrate together with you!',
      ].join('\n');

      setMessageText(generated);
      setCopied(false);
    }
  }, [isOpen, plan, task]);

  // Accessible focus trap and Escape handler
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      const firstInput = dialogRef.current?.querySelector('input, textarea, button') as HTMLElement | null;
      firstInput?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (previouslyFocusedElement.current) {
          previouslyFocusedElement.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Regenerate message when form fields update
  const handleFieldChange = (
    field: 'name' | 'date' | 'venue' | 'rsvp',
    val: string
  ) => {
    let nextName = eventName;
    let nextDate = eventDate;
    let nextVenue = venueCity;
    let nextRsvp = rsvpDate;

    if (field === 'name') {
      nextName = val;
      setEventName(val);
    } else if (field === 'date') {
      nextDate = val;
      setEventDate(val);
    } else if (field === 'venue') {
      nextVenue = val;
      setVenueCity(val);
    } else if (field === 'rsvp') {
      nextRsvp = val;
      setRsvpDate(val);
    }

    setMessageText(
      [
        `You are warmly invited to ${nextName}!`,
        '',
        `📅 Date: ${nextDate}`,
        `📍 Venue / City: ${nextVenue}`,
        `⏳ Kindly RSVP by: ${nextRsvp}`,
        '',
        'We would love to celebrate together with you!',
      ].join('\n')
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(messageText)}`;
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(`Invitation: ${eventName}`)}&body=${encodeURIComponent(messageText)}`;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity overflow-y-auto"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="draft-invite-title"
        aria-describedby="draft-invite-description"
        className="relative w-full max-w-xl rounded-2xl border border-rule bg-paper-card p-6 shadow-xl my-8 text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-ink-muted hover:bg-paper-subtle hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Close invitation draft dialog"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3 pb-4 border-b border-rule">
          <div className="h-10 w-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
            <Share2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="draft-invite-title" className="font-serif text-xl font-bold text-ink">
              Draft Guest Invitation
            </h2>
            <p id="draft-invite-description" className="text-xs text-ink-muted">
              Built locally from your celebration template. Edit details and share directly via WhatsApp or email.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label htmlFor="invite-event-name" className="block font-medium text-ink mb-1">
                Event Name
              </label>
              <input
                id="invite-event-name"
                type="text"
                value={eventName}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="w-full min-h-[40px] rounded-lg border border-rule bg-paper px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
              />
            </div>

            <div>
              <label htmlFor="invite-event-date" className="block font-medium text-ink mb-1">
                Event Date
              </label>
              <input
                id="invite-event-date"
                type="date"
                value={eventDate}
                onChange={(e) => handleFieldChange('date', e.target.value)}
                className="w-full min-h-[40px] rounded-lg border border-rule bg-paper px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
              />
            </div>

            <div>
              <label htmlFor="invite-venue-city" className="block font-medium text-ink mb-1">
                Venue or City
              </label>
              <input
                id="invite-venue-city"
                type="text"
                value={venueCity}
                onChange={(e) => handleFieldChange('venue', e.target.value)}
                className="w-full min-h-[40px] rounded-lg border border-rule bg-paper px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
              />
            </div>

            <div>
              <label htmlFor="invite-rsvp-date" className="block font-medium text-ink mb-1">
                RSVP-by Date
              </label>
              <input
                id="invite-rsvp-date"
                type="date"
                value={rsvpDate}
                onChange={(e) => handleFieldChange('rsvp', e.target.value)}
                className="w-full min-h-[40px] rounded-lg border border-rule bg-paper px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
              />
            </div>
          </div>

          {/* Editable Invitation Preview */}
          <div>
            <label htmlFor="invite-message-preview" className="block text-xs font-medium text-ink mb-1">
              Invitation Message (Editable)
            </label>
            <textarea
              id="invite-message-preview"
              rows={6}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full rounded-xl border border-rule bg-paper p-3 text-xs text-ink leading-relaxed font-sans focus:border-accent focus:outline-hidden"
            />
          </div>

          {/* Live feedback for screen readers */}
          <div aria-live="polite" className="sr-only">
            {copied ? 'Invitation text copied to clipboard' : ''}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rule">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-accent text-accent-text text-xs font-semibold hover:bg-accent-hover transition-colors shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  <span>Copy to Clipboard</span>
                </>
              )}
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl border border-rule bg-paper text-ink text-xs font-semibold hover:bg-paper-subtle transition-colors"
            >
              <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Share via WhatsApp</span>
            </a>

            <a
              href={mailtoUrl}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl border border-rule bg-paper text-ink text-xs font-semibold hover:bg-paper-subtle transition-colors"
            >
              <Mail className="h-4 w-4 text-accent" aria-hidden="true" />
              <span>Share via Email</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="ml-auto min-h-[44px] px-4 py-2 rounded-xl border border-rule text-xs font-medium text-ink-muted hover:bg-paper-subtle hover:text-ink transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
