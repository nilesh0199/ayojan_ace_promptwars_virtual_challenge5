'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { useAuth } from '@/components/auth-context';
import { usePlan } from '@/components/plan-context';
import {
  listUserPlansPaginated,
  renameUserPlan,
  deleteUserPlan,
  duplicateUserPlan,
  listPlanVersions,
  restorePlanVersion,
  PlanVersionRecord,
} from '@/lib/firebase/firestore';
import { EventPlan } from '@/lib/schemas';
import { formatCurrency } from '@/lib/budget';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
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
  Copy,
  History,
  Search,
  Users,
  Check,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function SavedPlansPage() {
  const router = useRouter();
  const { user, signIn, loading: authLoading } = useAuth();
  const { setActivePlan, activePlan, loadSavedExample } = usePlan();

  const [savedPlans, setSavedPlans] = useState<EventPlan[]>([]);
  const [lastDocSnap, setLastDocSnap] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'date' | 'title' | 'budget'>('updated');

  // Interactive actions state
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [duplicatingPlanId, setDuplicatingPlanId] = useState<string | null>(null);
  const [deleteConfirmPlanId, setDeleteConfirmPlanId] = useState<string | null>(null);

  // Version Restore Modal state
  const [versionModalPlan, setVersionModalPlan] = useState<EventPlan | null>(null);
  const [versionsList, setVersionsList] = useState<PlanVersionRecord[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);

  const fetchInitialPlans = async () => {
    if (!user) return;
    setLoadingPlans(true);
    setActionError(null);
    try {
      const res = await listUserPlansPaginated(user.uid, 50, null);
      setSavedPlans(res.plans);
      setLastDocSnap(res.lastDoc);
      setHasMore(res.hasMore);
    } catch {
      setActionError('Unable to load saved plans. Please verify connection and try again.');
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleLoadMore = async () => {
    if (!user || !lastDocSnap || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await listUserPlansPaginated(user.uid, 50, lastDocSnap);
      setSavedPlans((prev) => [...prev, ...res.plans]);
      setLastDocSnap(res.lastDoc);
      setHasMore(res.hasMore);
    } catch {
      setActionError('Failed to load additional plans.');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchInitialPlans();
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
      setSavedPlans((prev) =>
        prev.map((p) =>
          p.id === planId ? { ...p, title: editTitle.trim(), updatedAt: new Date().toISOString() } : p
        )
      );
      setActionSuccess('Plan renamed successfully.');
    } catch {
      setActionError('Failed to rename plan. Please try again.');
    }
  };

  const handleDuplicate = async (plan: EventPlan) => {
    if (!user) return;
    setDuplicatingPlanId(plan.id);
    setActionError(null);
    try {
      const cloned = await duplicateUserPlan(user.uid, plan.id);
      setSavedPlans((prev) => [cloned, ...prev]);
      setActionSuccess(`Created copy of "${plan.title}".`);
    } catch {
      setActionError('Failed to duplicate plan.');
    } finally {
      setDuplicatingPlanId(null);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!user) return;
    try {
      await deleteUserPlan(user.uid, planId);
      setSavedPlans((prev) => prev.filter((p) => p.id !== planId));
      setDeleteConfirmPlanId(null);
      setActionSuccess('Plan deleted.');
    } catch {
      setActionError('Failed to delete plan.');
    }
  };

  const handleOpenVersionsModal = async (plan: EventPlan) => {
    if (!user) return;
    setVersionModalPlan(plan);
    setLoadingVersions(true);
    try {
      const versions = await listPlanVersions(user.uid, plan.id);
      setVersionsList(versions);
    } catch {
      setActionError('Failed to load version history.');
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleRestoreVersion = async (versionRecord: PlanVersionRecord) => {
    if (!user || !versionModalPlan) return;
    setRestoringVersionId(versionRecord.id);
    try {
      const restored = await restorePlanVersion(user.uid, versionModalPlan.id, versionRecord.id);
      setSavedPlans((prev) => prev.map((p) => (p.id === restored.id ? restored : p)));
      setActivePlan(restored);
      setVersionModalPlan(null);
      setActionSuccess(`Restored version ${versionRecord.versionNumber} of "${restored.title}".`);
    } catch {
      setActionError('Failed to restore selected plan version.');
    } finally {
      setRestoringVersionId(null);
    }
  };

  // Filtered and sorted plans list
  const filteredPlans = useMemo(() => {
    let list = [...savedPlans];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.eventType.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'updated') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === 'date') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'budget') {
        return b.totalBudget - a.totalBudget;
      }
      return 0;
    });

    return list;
  }, [savedPlans, searchQuery, sortBy]);

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
            Manage your saved celebration plans with automatic cloud sync, search, duplicate, version history, and presets.
          </p>
        </div>

        {/* Action Error / Success Banners */}
        {actionError && (
          <div
            role="alert"
            className="rounded-xl border border-state-error bg-state-error-subtle p-4 text-xs text-state-error flex items-center justify-between"
          >
            <span>{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="p-1 hover:bg-state-error/10 rounded"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div
            role="status"
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between"
          >
            <span>{actionSuccess}</span>
            <button
              onClick={() => setActionSuccess(null)}
              className="p-1 hover:bg-emerald-500/10 rounded"
              aria-label="Dismiss message"
            >
              <X className="h-4 w-4" />
            </button>
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
              You are currently browsing in <strong>Guest Mode</strong>. Sign in with Google to sync plans securely across devices, duplicate plans, and restore past versions.
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
                Currently Active Plan in Memory
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
                <Users className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                {activePlan.guestCount} guests
              </span>
              <span className="inline-flex items-center gap-1">
                <Coins className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                {formatCurrency(activePlan.totalBudget, activePlan.currency)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => router.push('/workspace')}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-accent text-accent-text text-xs font-semibold hover:bg-accent-hover transition-colors shadow-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Open in Workspace</span>
            </button>
          </div>
        )}

        {/* Firestore Saved Plans List */}
        {user && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-serif font-bold text-xl text-ink">
                  Your Saved Plans ({savedPlans.length})
                </h2>
                <p className="text-xs text-ink-muted">
                  Auto-saved to Firestore subcollections with version history capped at 20 snapshots.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchInitialPlans}
                disabled={loadingPlans}
                className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink min-h-[40px] px-3.5 py-1.5 rounded-xl border border-rule self-start sm:self-auto"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loadingPlans ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>Refresh</span>
              </button>
            </div>

            {/* Search and Sort Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search by title, city, or event type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-[44px] pl-9 pr-3 rounded-xl border border-rule bg-paper text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="sort-plans-select" className="text-xs text-ink-muted shrink-0">
                  Sort:
                </label>
                <select
                  id="sort-plans-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="min-h-[44px] rounded-xl border border-rule bg-paper px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                >
                  <option value="updated">Recently Updated</option>
                  <option value="date">Event Date (Soonest first)</option>
                  <option value="title">Title (A to Z)</option>
                  <option value="budget">Budget (High to Low)</option>
                </select>
              </div>
            </div>

            {/* Loading state */}
            {loadingPlans ? (
              <div
                role="status"
                aria-busy="true"
                className="text-center py-12 rounded-xl border border-rule bg-paper-card text-xs text-ink-muted space-y-3"
              >
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" aria-hidden="true" />
                <span>Loading your saved celebration plans...</span>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="rounded-xl border border-dashed border-rule bg-paper-card p-8 text-center text-xs text-ink-muted space-y-2">
                <p className="font-semibold text-ink text-sm">No saved plans match your query.</p>
                <p>Generate a new plan from the Plan Creator or choose a preset below.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredPlans.map((plan) => {
                  const isActive = activePlan?.id === plan.id;
                  const isDuplicating = duplicatingPlanId === plan.id;

                  return (
                    <div
                      key={plan.id}
                      className={`rounded-xl border p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                        isActive
                          ? 'border-accent bg-accent-subtle/20 ring-1 ring-accent/30'
                          : 'border-rule bg-paper-card'
                      }`}
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
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif font-bold text-lg text-ink truncate">
                              {plan.title}
                            </h3>
                            {isActive && (
                              <span className="text-[10px] font-mono text-accent bg-accent-subtle px-1.5 py-0.5 rounded font-semibold shrink-0">
                                Active
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-ink-muted bg-paper-subtle px-1.5 py-0.5 rounded border border-rule shrink-0">
                              v{plan.version}
                            </span>
                          </div>
                        )}

                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-ink-muted">
                          <span className="font-medium text-ink">{plan.eventType}</span>
                          <span>&bull;</span>
                          <span>{plan.city}</span>
                          <span>&bull;</span>
                          <span>{plan.date}</span>
                          <span>&bull;</span>
                          <span>{plan.guestCount} guests</span>
                          <span>&bull;</span>
                          <span>{formatCurrency(plan.totalBudget, plan.currency)}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenPlan(plan)}
                          className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-lg bg-accent text-accent-text text-xs font-semibold hover:bg-accent-hover transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Open</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicate(plan)}
                          disabled={isDuplicating}
                          title="Duplicate plan"
                          aria-label={`Duplicate ${plan.title}`}
                          className="min-h-[40px] p-2 rounded-lg border border-rule text-ink-muted hover:text-ink hover:bg-paper-subtle transition-colors disabled:opacity-50"
                        >
                          {isDuplicating ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Copy className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenVersionsModal(plan)}
                          title="Version history"
                          aria-label={`Version history for ${plan.title}`}
                          className="min-h-[40px] p-2 rounded-lg border border-rule text-ink-muted hover:text-ink hover:bg-paper-subtle transition-colors"
                        >
                          <History className="h-4 w-4" aria-hidden="true" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartRename(plan)}
                          title="Rename plan"
                          aria-label={`Rename ${plan.title}`}
                          className="min-h-[40px] p-2 rounded-lg border border-rule text-ink-muted hover:text-ink hover:bg-paper-subtle transition-colors"
                        >
                          <Edit2 className="h-4 w-4" aria-hidden="true" />
                        </button>

                        {deleteConfirmPlanId === plan.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDelete(plan.id)}
                              className="text-xs px-2.5 py-1.5 rounded bg-state-error text-white font-semibold min-h-[40px]"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmPlanId(null)}
                              className="text-xs px-2 py-1.5 rounded border border-rule text-ink-muted min-h-[40px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmPlanId(plan.id)}
                            title="Delete plan"
                            aria-label={`Delete ${plan.title}`}
                            className="min-h-[40px] p-2 rounded-lg border border-rule text-ink-muted hover:text-state-error hover:bg-state-error-subtle transition-colors"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Pagination Load More Button */}
                {hasMore && (
                  <div className="text-center pt-4">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="min-h-[44px] px-6 py-2 rounded-xl border border-rule bg-paper text-xs font-semibold text-ink hover:bg-paper-subtle transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {loadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                      <span>Load More Plans</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Version History Modal */}
        {versionModalPlan && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="versions-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs"
          >
            <div className="w-full max-w-lg rounded-2xl border border-rule bg-paper-card p-6 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-rule">
                <div>
                  <h3 id="versions-modal-title" className="font-serif font-bold text-lg text-ink">
                    Version History
                  </h3>
                  <p className="text-xs text-ink-muted">
                    {versionModalPlan.title} (Capped at latest 20 versions)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setVersionModalPlan(null)}
                  className="p-1 rounded-lg text-ink-muted hover:text-ink"
                  aria-label="Close version history"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2" data-lenis-prevent>
                {loadingVersions ? (
                  <div className="text-center py-8 text-xs text-ink-muted">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-accent mb-2" />
                    <span>Loading version snapshots...</span>
                  </div>
                ) : versionsList.length === 0 ? (
                  <div className="text-center py-8 text-xs text-ink-muted">
                    No past version snapshots recorded yet. Versions are created whenever plans are generated, replanned, or edited.
                  </div>
                ) : (
                  versionsList.map((ver) => (
                    <div
                      key={ver.id}
                      className="p-3 rounded-xl border border-rule bg-paper flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-ink flex items-center gap-1.5">
                          <span>Version {ver.versionNumber}</span>
                          <span className="text-[10px] text-ink-muted font-mono">
                            {new Date(ver.savedAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[11px] text-ink-muted mt-0.5">
                          Budget: {formatCurrency(ver.plan.totalBudget, ver.plan.currency)} · {ver.plan.timeline.length} tasks
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRestoreVersion(ver)}
                        disabled={restoringVersionId === ver.id}
                        className="min-h-[36px] px-3 py-1 rounded-lg bg-accent text-accent-text font-medium text-xs hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {restoringVersionId === ver.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <History className="h-3.5 w-3.5" />
                        )}
                        <span>Restore</span>
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-rule flex justify-end">
                <button
                  type="button"
                  onClick={() => setVersionModalPlan(null)}
                  className="px-4 py-2 rounded-xl border border-rule text-xs font-semibold text-ink hover:bg-paper-subtle"
                >
                  Close
                </button>
              </div>
            </div>
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
