'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { useAuth } from '@/components/auth-context';
import { usePlan } from '@/components/plan-context';
import { listUserPlans, renameUserPlan, deleteUserPlan } from '@/lib/firebase/firestore';
import { EventPlan } from '@/lib/schemas';
import { formatCurrency } from '@/lib/budget';
import {
  BookmarkCheck,
  LogIn,
  ExternalLink,
  Edit2,
  Trash2,
  Calendar,
  MapPin,
  Coins,
  RefreshCw,
  BookOpen,
} from 'lucide-react';

export default function SavedPlansPage() {
  const router = useRouter();
  const { user, signIn, loading: authLoading } = useAuth();
  const { setActivePlan, activePlan, loadSavedExample } = usePlan();

  const [savedPlans, setSavedPlans] = useState<EventPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchPlans = async () => {
    if (!user) return;
    setLoadingPlans(true);
    try {
      const plans = await listUserPlans(user.uid);
      setSavedPlans(plans);
      setActionError(null);
    } catch {
      setActionError('Unable to load saved plans. Please verify connection and try again.');
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPlans();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleOpenPlan = (plan: EventPlan) => {
    setActivePlan(plan);
    router.push('/workspace');
  };

  const handleStartRename = (plan: EventPlan) => {
    setEditingPlanId(plan.id);
    setEditTitle(plan.title);
  };

  const handleSaveRename = async (planId: string) => {
    if (!user || !editTitle.trim()) return;
    try {
      await renameUserPlan(user.uid, planId, editTitle.trim());
      setEditingPlanId(null);
      setActionError(null);
      await fetchPlans();
    } catch {
      setActionError('Failed to rename plan. Please try again.');
    }
  };

  const handleDelete = async (planId: string) => {
    if (!user) return;
    if (window.confirm('Are you sure you want to delete this saved plan?')) {
      try {
        await deleteUserPlan(user.uid, planId);
        setActionError(null);
        await fetchPlans();
      } catch {
        setActionError('Failed to delete plan. Please try again.');
      }
    }
  };

  return (
    <AppShell>
      <div className="w-full max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-rule pb-6">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase text-accent mb-2">
            <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
            <span>Cloud &amp; Local Persistence</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight">
            Saved Celebration Plans
          </h1>
          <p className="mt-2 text-sm text-ink-muted leading-relaxed">
            Manage your saved plans in Firestore cloud persistence or test instant static presets.
          </p>
        </div>

        {/* Action Error Banner */}
        {actionError && (
          <div
            role="alert"
            className="rounded-xl border border-state-error bg-state-error-subtle p-4 text-xs text-state-error"
          >
            {actionError}
          </div>
        )}

        {/* Not Logged In State */}
        {!authLoading && !user && (
          <div className="rounded-2xl border border-rule bg-paper-card p-8 shadow-xs text-center space-y-4">
            <div className="h-12 w-12 rounded-xl bg-accent-subtle text-accent mx-auto flex items-center justify-center">
              <LogIn className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="font-serif font-bold text-xl text-ink">
              Sign In to Access Cloud Plans
            </h2>
            <p className="text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
              You are currently browsing in <strong>Guest Mode</strong>. Sign in with Google to sync plans securely across devices, rename, or restore previous versions.
            </p>
            <button
              type="button"
              onClick={signIn}
              className="inline-flex items-center gap-2 min-h-[44px] px-6 py-2.5 rounded-xl bg-accent text-accent-text text-sm font-semibold hover:bg-accent-hover transition-colors shadow-xs"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span>Sign in with Google</span>
            </button>
          </div>
        )}

        {/* Active Session Plan (if any) */}
        {activePlan && (
          <div className="rounded-2xl border-2 border-accent bg-paper-card p-6 shadow-xs">
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
                Currently Active In-Memory Plan
              </span>
              <span className="text-xs text-ink-muted font-mono">
                Version {activePlan.version}
              </span>
            </div>
            <h2 className="font-serif font-bold text-xl text-ink">
              {activePlan.title}
            </h2>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-muted mb-4">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                {activePlan.city}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                {activePlan.date}
              </span>
              <span className="inline-flex items-center gap-1">
                <Coins className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                {formatCurrency(activePlan.totalBudget, activePlan.currency)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => router.push('/workspace')}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-accent text-accent-text text-xs font-semibold hover:bg-accent-hover transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Open in Workspace</span>
            </button>
          </div>
        )}

        {/* Firestore Saved Plans List */}
        {user && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-xl text-ink">
                Your Firestore Cloud Plans
              </h2>
              <button
                type="button"
                onClick={fetchPlans}
                disabled={loadingPlans}
                className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink min-h-[36px] px-3 py-1.5 rounded-lg border border-rule"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loadingPlans ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>Refresh</span>
              </button>
            </div>

            {loadingPlans ? (
              <div className="text-center py-8 text-sm text-ink-muted">
                Loading saved plans...
              </div>
            ) : savedPlans.length === 0 ? (
              <div className="rounded-xl border border-dashed border-rule bg-paper-card p-8 text-center text-xs text-ink-muted">
                No cloud plans saved under this account yet. Click &ldquo;Save to Cloud&rdquo; on any plan in the Workspace.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {savedPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-xl border border-rule bg-paper-card p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      {editingPlanId === plan.id ? (
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="min-h-[36px] rounded-md border border-rule px-2 py-1 text-sm text-ink font-serif"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(plan.id)}
                            className="text-xs px-2.5 py-1.5 rounded bg-accent text-accent-text font-medium"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPlanId(null)}
                            className="text-xs px-2.5 py-1.5 rounded border border-rule text-ink-muted"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <h3 className="font-serif font-bold text-lg text-ink truncate">
                          {plan.title}
                        </h3>
                      )}
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-ink-muted">
                        <span>{plan.eventType}</span>
                        <span>&bull;</span>
                        <span>{plan.city}</span>
                        <span>&bull;</span>
                        <span>{plan.date}</span>
                        <span>&bull;</span>
                        <span>{formatCurrency(plan.totalBudget, plan.currency)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenPlan(plan)}
                        className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-lg bg-accent text-accent-text text-xs font-semibold hover:bg-accent-hover transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Reopen</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartRename(plan)}
                        title="Rename plan"
                        className="min-h-[40px] p-2 rounded-lg border border-rule text-ink-muted hover:text-ink hover:bg-paper-subtle transition-colors"
                      >
                        <Edit2 className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Rename {plan.title}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(plan.id)}
                        title="Delete plan"
                        className="min-h-[40px] p-2 rounded-lg border border-rule text-ink-muted hover:text-state-error hover:bg-state-error-subtle transition-colors"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Delete {plan.title}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Static Saved Examples Section */}
        <div className="pt-6 border-t border-rule space-y-4">
          <div>
            <h2 className="font-serif font-bold text-xl text-ink">
              Curated Example Plans (Zero-Latency Static JSON)
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Instantly test and experiment with realistic plans without waiting for Gemini.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-rule bg-paper-card p-5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono text-accent uppercase font-bold block mb-1">
                  Wedding Preset
                </span>
                <h3 className="font-serif font-bold text-base text-ink mb-1">
                  Royal Rajasthani Heritage Wedding
                </h3>
                <p className="text-xs text-ink-muted mb-4">
                  300 guests · Jaipur · ₹25 Lakhs budget with Jain catering &amp; Shehnai.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  loadSavedExample('wedding');
                  router.push('/workspace');
                }}
                className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-rule bg-paper hover:bg-paper-subtle text-xs font-semibold text-ink flex items-center justify-center gap-1.5 transition-colors"
              >
                <BookOpen className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                <span>Load Wedding</span>
              </button>
            </div>

            <div className="rounded-xl border border-rule bg-paper-card p-5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono text-accent uppercase font-bold block mb-1">
                  Birthday Preset
                </span>
                <h3 className="font-serif font-bold text-base text-ink mb-1">
                  Artisan Garden 30th Birthday
                </h3>
                <p className="text-xs text-ink-muted mb-4">
                  50 guests · Bengaluru · ₹1.8 Lakhs budget with woodfired pizza &amp; indie acoustic.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  loadSavedExample('birthday');
                  router.push('/workspace');
                }}
                className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-rule bg-paper hover:bg-paper-subtle text-xs font-semibold text-ink flex items-center justify-center gap-1.5 transition-colors"
              >
                <BookOpen className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                <span>Load Birthday</span>
              </button>
            </div>

            <div className="rounded-xl border border-rule bg-paper-card p-5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono text-accent uppercase font-bold block mb-1">
                  Community Preset
                </span>
                <h3 className="font-serif font-bold text-base text-ink mb-1">
                  Diwali Grand Community Mela
                </h3>
                <p className="text-xs text-ink-muted mb-4">
                  200 guests · Mumbai · ₹3.5 Lakhs budget with eco-diyas &amp; regional stalls.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  loadSavedExample('community');
                  router.push('/workspace');
                }}
                className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-rule bg-paper hover:bg-paper-subtle text-xs font-semibold text-ink flex items-center justify-center gap-1.5 transition-colors"
              >
                <BookOpen className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                <span>Load Community</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
