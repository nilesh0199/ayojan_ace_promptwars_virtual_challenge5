'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { usePlan } from '../plan-context';
import { useAuth } from '../auth-context';
import { formatCurrency } from '@/lib/budget';
import { triggerIcsDownload, generateTimelineIcs } from '@/lib/ics';
import { PrintModal } from './print-modal';
import { IntakeFormData } from '@/lib/schemas';
import { deleteUserPlan, listUserPlans } from '@/lib/firebase/firestore';
import { getTemplatePlanReason } from '@/lib/gemini';
import { formatTime12h } from '@/lib/time';
import {
  Calendar,
  MapPin,
  Users,
  Coins,
  Printer,
  CalendarCheck,
  CloudUpload,
  SlidersHorizontal,
  BookmarkCheck,
  History,
  CheckCircle,
  X,
  Cpu,
  FileText,
  Sparkles,
  Info,
  Pencil,
  Trash2,
  FolderSync,
  AlertTriangle,
  Check,
  Loader2,
  Clock,
} from 'lucide-react';

interface WorkspaceHeaderProps {
  onOpenReplan: () => void;
  activeTabName?: string;
}

export function WorkspaceHeader({ onOpenReplan, activeTabName = 'Overview' }: WorkspaceHeaderProps) {
  const router = useRouter();
  const { user, signIn } = useAuth();
  const {
    activePlan,
    planHistory,
    undoReplan,
    saveToCloud,
    saveSuccessNotice,
    clearSaveSuccessNotice,
    startPlanGeneration,
    setActivePlan,
    isLoading,
  } = usePlan();

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isNoticeDismissed, setIsNoticeDismissed] = useState(false);

  // Inline Title / Event Name Editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Suggest Names Modal
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [suggestedNames, setSuggestedNames] = useState<string[]>([]);
  const [isFetchingNames, setIsFetchingNames] = useState(false);

  // Subtle Header Reveal Animation with GSAP
  const headerContainerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!headerContainerRef.current) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(headerContainerRef.current, {
        opacity: 0,
        y: -8,
        duration: 0.4,
        ease: 'power2.out',
      });
    });
    return () => mm.revert();
  }, { scope: headerContainerRef });

  // Delete Confirmation Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Change Plan Unsaved Changes Dialog
  const [isChangePlanDialogOpen, setIsChangePlanDialogOpen] = useState(false);

  useEffect(() => {
    if (activePlan) {
      setNameInput(activePlan.eventName || activePlan.title);
    }
  }, [activePlan]);

  useEffect(() => {
    if (isEditingName && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditingName]);

  if (!activePlan) return null;

  const handleExportIcs = () => {
    const icsContent = generateTimelineIcs(
      activePlan.title,
      activePlan.timeline,
      activePlan.muhuratTime,
      activePlan.muhuratLabel
    );
    triggerIcsDownload(`${activePlan.title.toLowerCase().replace(/\s+/g, '-')}-timeline.ics`, icsContent);
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  const handleSave = async () => {
    const success = await saveToCloud();
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleRetryWithAi = async () => {
    if (!activePlan) return;
    const intakeData: IntakeFormData = {
      eventType: activePlan.eventType,
      city: activePlan.city,
      date: activePlan.date,
      guestCount: activePlan.guestCount,
      totalBudget: activePlan.totalBudget,
      currency: activePlan.currency,
      styleCulture: activePlan.styleCulture,
      nonNegotiables: activePlan.nonNegotiables,
      eventName: activePlan.eventName,
      muhuratTime: activePlan.muhuratTime,
      muhuratLabel: activePlan.muhuratLabel,
    };
    await startPlanGeneration(intakeData);
  };

  // Inline Title Save
  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== activePlan.title) {
      const updated = {
        ...activePlan,
        title: trimmed,
        eventName: trimmed,
        updatedAt: new Date().toISOString(),
      };
      setActivePlan(updated);
    }
    setIsEditingName(false);
  };

  const handleKeyDownName = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveName();
    } else if (e.key === 'Escape') {
      setNameInput(activePlan.eventName || activePlan.title);
      setIsEditingName(false);
    }
  };

  // Fetch AI Name Suggestions
  const handleOpenSuggestModal = async () => {
    setIsSuggestModalOpen(true);
    setIsFetchingNames(true);
    setSuggestedNames([]);

    try {
      const res = await fetch('/api/plan/names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: activePlan.eventType,
          city: activePlan.city,
          styleCulture: activePlan.styleCulture,
          guestCount: activePlan.guestCount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuggestedNames(data.suggestions || []);
      }
    } catch {
      // Ignore
    } finally {
      setIsFetchingNames(false);
    }
  };

  const handleApplyNameSuggestion = (suggestion: string) => {
    setNameInput(suggestion);
    const updated = {
      ...activePlan,
      title: suggestion,
      eventName: suggestion,
      updatedAt: new Date().toISOString(),
    };
    setActivePlan(updated);
    setIsSuggestModalOpen(false);
  };

  // Delete Plan Logic
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (user && !activePlan.isSavedExample) {
        await deleteUserPlan(user.uid, activePlan.id).catch(() => {});
      }
      setActivePlan(null);

      // Check if user has other saved plans
      if (user) {
        const remaining = await listUserPlans(user.uid).catch(() => []);
        if (remaining.length > 0) {
          router.push('/saved');
          return;
        }
      }
      router.push('/plan');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  // Change Plan Handler
  const handleChangePlanClick = () => {
    if (!activePlan.isSavedExample && (!user || planHistory.length > 0)) {
      setIsChangePlanDialogOpen(true);
    } else {
      router.push('/saved');
    }
  };

  const displayName = activePlan.eventName || activePlan.title;

  return (
    <div ref={headerContainerRef} className="border-b border-rule bg-paper-card p-6 sm:p-8 rounded-2xl shadow-xs mb-8">
      {/* Top Meta Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-rule/60">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-subtle text-accent text-xs font-semibold">
            {activePlan.eventType}
          </span>
          {activePlan.isSavedExample && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-marigold-subtle text-marigold-text text-xs font-semibold">
              <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Saved Example
            </span>
          )}
          {activePlan.generationSource === 'backup' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-xs font-medium border border-blue-200 dark:border-blue-800">
              <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
              Backup AI
            </span>
          )}
          {activePlan.generationSource === 'template' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-medium border border-amber-200 dark:border-amber-800">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Built-in Template
            </span>
          )}
          <span className="text-xs font-mono text-ink-muted">
            Version {activePlan.version}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo Replanning if history exists */}
          {planHistory.length > 0 && (
            <button
              type="button"
              onClick={undoReplan}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover bg-accent-subtle px-3 py-1.5 rounded-lg transition-colors min-h-[36px]"
            >
              <History className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Undo to Version {planHistory[planHistory.length - 1].version}</span>
            </button>
          )}

          {/* Change Plan Button */}
          <button
            type="button"
            onClick={handleChangePlanClick}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink border border-rule px-3 py-1.5 rounded-lg transition-colors min-h-[36px]"
            title="Pick a different celebration plan or create a new one"
          >
            <FolderSync className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            <span>Change Plan</span>
          </button>

          {/* Delete Plan Destructive Button */}
          <button
            type="button"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-state-error hover:bg-state-error-subtle border border-transparent hover:border-state-error/30 px-3 py-1.5 rounded-lg transition-colors min-h-[36px]"
            title="Delete this celebration plan"
            aria-label="Delete celebration plan"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Delete plan</span>
          </button>
        </div>
      </div>

      {/* Calm, dismissible, accessible notice when backup or main provider is inactive/expired */}
      {!isNoticeDismissed && activePlan.providerNotice && (
        <div
          role="status"
          aria-live="polite"
          data-testid="provider-notice"
          className="mt-4 flex items-start justify-between gap-3 p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 text-sm shadow-xs"
        >
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" aria-hidden="true" />
            <div className="space-y-0.5">
              <p className="font-bold text-sm">
                Provider Availability Notice
              </p>
              <p className="text-xs sm:text-sm leading-relaxed opacity-95">
                {activePlan.providerNotice}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsNoticeDismissed(true)}
            className="p-1.5 rounded-lg text-amber-800 dark:text-amber-300 hover:bg-amber-200/60 dark:hover:bg-amber-900/60 transition-colors shrink-0"
            aria-label="Dismiss provider notice"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Non-Primary AI Generation Alert Banner with "Try again with AI" action */}
      {activePlan.generationSource && activePlan.generationSource !== 'primary' && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border text-xs ${
            activePlan.generationSource === 'backup'
              ? 'border-blue-300 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200'
              : 'border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200'
          }`}
        >
          <div className="flex items-start sm:items-center gap-2.5">
            {activePlan.generationSource === 'backup' ? (
              <Cpu className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5 sm:mt-0" aria-hidden="true" />
            ) : (
              <FileText className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-0" aria-hidden="true" />
            )}
            <div>
              <p className="font-bold text-sm">
                {activePlan.generationSource === 'backup'
                  ? 'Generated by a backup AI provider'
                  : getTemplatePlanReason(activePlan.generationErrorCode).title}
              </p>
              <p className="opacity-90 mt-0.5">
                {activePlan.generationSource === 'backup'
                  ? 'Primary AI experienced high traffic; this draft was generated via our backup AI provider.'
                  : getTemplatePlanReason(activePlan.generationErrorCode).description}
              </p>
              {activePlan.generationErrorCode && (
                <p className="text-[10px] font-mono opacity-75 mt-1 tracking-wide" data-testid="error-reference">
                  Reference: {activePlan.generationErrorCode}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetryWithAi}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-text font-medium hover:bg-accent-hover transition-colors shadow-xs min-h-[36px]"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isLoading ? 'Connecting to AI...' : 'Try again with AI'}</span>
          </button>
        </div>
      )}

      {/* Main Title & Action Bar */}
      <div className="mt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          {/* Editable Plan Title / Event Name */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!isEditingName ? (
              <>
                <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-ink tracking-tight">
                  {displayName}
                </h1>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-paper-subtle transition-colors"
                    title="Edit event name"
                    aria-label="Edit event name"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenSuggestModal}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-accent bg-accent-subtle hover:bg-accent-subtle/80 transition-colors"
                    title="Suggest creative celebration names"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Suggest names</span>
                  </button>
                </div>
              </>
            ) : (
              /* Inline Edit Input */
              <div className="flex items-center gap-2 w-full max-w-xl">
                <label htmlFor="workspace-name-input" className="sr-only">
                  Edit celebration name
                </label>
                <input
                  ref={editInputRef}
                  id="workspace-name-input"
                  type="text"
                  maxLength={80}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={handleKeyDownName}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-accent bg-paper text-ink font-serif text-xl sm:text-2xl font-bold focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  aria-label="Save celebration name"
                  className="p-2 rounded-lg bg-accent text-accent-text hover:bg-accent-hover transition-colors"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(displayName);
                    setIsEditingName(false);
                  }}
                  aria-label="Cancel editing celebration name"
                  className="p-2 rounded-lg border border-rule text-ink-muted hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
              {activePlan.city}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-accent" aria-hidden="true" />
              {activePlan.date}
            </span>
            {activePlan.muhuratTime && (
              <span className="inline-flex items-center gap-1.5 text-amber-900 dark:text-amber-300 font-medium">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                Muhurat: {formatTime12h(activePlan.muhuratTime)}
                {activePlan.muhuratLabel ? ` (${activePlan.muhuratLabel})` : ''}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-accent" aria-hidden="true" />
              {activePlan.guestCount} Guests
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
              <Coins className="h-4 w-4 text-accent" aria-hidden="true" />
              Budget: {formatCurrency(activePlan.totalBudget, activePlan.currency)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 no-print">
          <button
            type="button"
            onClick={onOpenReplan}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-accent text-accent-text font-medium text-sm hover:bg-accent-hover transition-colors shadow-xs"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            <span>Replan &amp; Adjust</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border border-rule bg-paper text-ink font-medium text-sm hover:bg-paper-subtle transition-colors"
          >
            {saveSuccess ? (
              <>
                <CheckCircle className="h-4 w-4 text-state-success" aria-hidden="true" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <CloudUpload className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                <span>Save to Cloud</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportIcs}
            title="Download .ics calendar file"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border border-rule bg-paper text-ink font-medium text-sm hover:bg-paper-subtle transition-colors"
          >
            <CalendarCheck className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            <span className="hidden sm:inline">Export .ics</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            title="Print or Save as PDF"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border border-rule bg-paper text-ink font-medium text-sm hover:bg-paper-subtle transition-colors"
          >
            <Printer className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Save to Cloud Success Alert */}
      {saveSuccessNotice && (
        <div
          role="region"
          aria-label="Cloud Save Confirmation"
          className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <span>{saveSuccessNotice.message}</span>
            {saveSuccessNotice.link && (
              <Link
                href={saveSuccessNotice.link}
                className="font-semibold underline hover:text-emerald-950 dark:hover:text-emerald-100 ml-1.5"
              >
                View Saved Plans
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={clearSaveSuccessNotice}
            className="p-1 rounded hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
            aria-label="Dismiss save confirmation alert"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Accessible Print & PDF Scope Dialog */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        activeTabName={activeTabName}
      />

      {/* Suggest Names Modal */}
      {isSuggestModalOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setIsSuggestModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="suggest-dialog-title"
            className="relative w-full max-w-md rounded-2xl border border-rule bg-paper-card p-6 shadow-xl text-ink space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <div className="flex items-center gap-2 text-accent">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
                <h2 id="suggest-dialog-title" className="font-serif font-bold text-lg text-ink">
                  Suggested Celebration Names
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSuggestModalOpen(false)}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink"
                aria-label="Close suggestions dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-ink-muted">
              Culturally evocative celebration names based on {activePlan.city} and {activePlan.styleCulture}. Click any to use it:
            </p>

            {isFetchingNames ? (
              <div className="py-8 text-center space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-accent mx-auto" aria-hidden="true" />
                <p className="text-xs text-ink-muted">Generating tailored celebration names...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto" data-lenis-prevent>
                {suggestedNames.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyNameSuggestion(suggestion)}
                    className="w-full text-left p-3 rounded-xl border border-rule bg-paper hover:bg-paper-subtle hover:border-accent text-sm font-medium text-ink transition-colors flex items-center justify-between group"
                  >
                    <span>{suggestion}</span>
                    <Check className="h-4 w-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-rule flex justify-end">
              <button
                type="button"
                onClick={() => setIsSuggestModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-rule hover:bg-paper"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => !isDeleting && setIsDeleteDialogOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-desc"
            className="relative w-full max-w-md rounded-2xl border border-state-error/40 bg-paper-card p-6 shadow-xl text-ink space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-rule pb-3">
              <div className="h-10 w-10 rounded-xl bg-state-error-subtle text-state-error flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 id="delete-dialog-title" className="font-serif font-bold text-lg text-ink">
                  Delete Celebration Plan
                </h2>
                <p className="text-xs text-ink-muted">This action is permanent.</p>
              </div>
            </div>

            <div id="delete-dialog-desc" className="text-sm text-ink-muted leading-relaxed space-y-2">
              {user && !activePlan.isSavedExample ? (
                <p>
                  This will permanently delete <strong>{displayName}</strong> from your account and Cloud Firestore. Any synchronized milestones or versions will be removed.
                </p>
              ) : (
                <p>
                  You are currently in guest mode. Deleting will immediately clear this celebration plan from your browser memory.
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-rule flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-rule hover:bg-paper min-h-[44px]"
              >
                Cancel
              </button>

              {!user && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    setIsDeleteDialogOpen(false);
                    signIn();
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-accent text-accent hover:bg-accent-subtle min-h-[44px]"
                >
                  Sign in to save
                </button>
              )}

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-state-error text-white hover:opacity-90 transition-opacity min-h-[44px]"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>{isDeleting ? 'Deleting...' : 'Delete permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Plan Dialog (Unsaved changes check) */}
      {isChangePlanDialogOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setIsChangePlanDialogOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-dialog-title"
            aria-describedby="change-dialog-desc"
            className="relative w-full max-w-md rounded-2xl border border-rule bg-paper-card p-6 shadow-xl text-ink space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-rule pb-3">
              <div className="h-10 w-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
                <FolderSync className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 id="change-dialog-title" className="font-serif font-bold text-lg text-ink">
                Switch Celebration Plan?
              </h2>
            </div>

            <p id="change-dialog-desc" className="text-sm text-ink-muted leading-relaxed">
              You have unsaved changes in this plan. Pick another plan anyway?
            </p>

            <div className="pt-4 border-t border-rule flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsChangePlanDialogOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-rule hover:bg-paper min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsChangePlanDialogOpen(false);
                  router.push('/saved');
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-accent text-accent-text hover:bg-accent-hover min-h-[44px]"
              >
                Continue to Saved Plans
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
