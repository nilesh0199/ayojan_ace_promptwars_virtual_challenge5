'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { usePlan } from '@/components/plan-context';
import { WorkspaceHeader } from '@/components/workspace/workspace-header';
import { ReplanModal } from '@/components/workspace/replan-modal';
import { TabOverview } from '@/components/workspace/tab-overview';
import { TabBudget } from '@/components/workspace/tab-budget';
import { TabTimeline } from '@/components/workspace/tab-timeline';
import { TabVendors } from '@/components/workspace/tab-vendors';
import { TabIdeas } from '@/components/workspace/tab-ideas';
import { TabRisks } from '@/components/workspace/tab-risks';
import { TabHistory } from '@/components/workspace/tab-history';
import {
  LayoutDashboard,
  Coins,
  Calendar,
  Compass,
  Sparkles,
  ShieldAlert,
  History,
  BookOpen,
  PlusCircle,
} from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'budget', label: 'Budget', icon: Coins },
  { id: 'timeline', label: 'Timeline', icon: Calendar },
  { id: 'vendors', label: 'Vendors', icon: Compass },
  { id: 'ideas', label: 'Ideas', icon: Sparkles },
  { id: 'risks', label: 'Risks', icon: ShieldAlert },
  { id: 'history', label: 'History', icon: History },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function WorkspacePage() {
  const { activePlan, loadSavedExample } = usePlan();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isReplanOpen, setIsReplanOpen] = useState(false);

  return (
    <AppShell>
      <div className="w-full max-w-7xl mx-auto">
        {!activePlan ? (
          /* Empty State */
          <div className="rounded-3xl border border-rule bg-paper-card p-12 text-center my-12 shadow-xs">
            <div className="h-14 w-14 rounded-2xl bg-accent-subtle text-accent mx-auto flex items-center justify-center mb-4">
              <LayoutDashboard className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-ink mb-2">
              No Active Plan Loaded
            </h1>
            <p className="text-sm text-ink-muted max-w-md mx-auto leading-relaxed mb-8">
              Begin by creating a new celebration plan with our Gemini-powered intake form, or load a pre-configured example instantly.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 min-h-[44px] px-6 py-2.5 rounded-xl bg-accent text-accent-text text-sm font-semibold hover:bg-accent-hover transition-colors shadow-xs"
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                <span>Start New Plan</span>
              </Link>
              <button
                type="button"
                onClick={() => loadSavedExample('wedding')}
                className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl border border-rule bg-paper text-ink text-sm font-semibold hover:bg-paper-subtle transition-colors"
              >
                <BookOpen className="h-4 w-4 text-accent" aria-hidden="true" />
                <span>Load Wedding Example</span>
              </button>
            </div>
          </div>
        ) : (
          /* Loaded Workspace */
          <div>
            {/* Header Banner */}
            <WorkspaceHeader onOpenReplan={() => setIsReplanOpen(true)} />

            {/* Navigation Tabs */}
            <div
              role="tablist"
              aria-label="Workspace plan sections"
              className="flex items-center gap-1 overflow-x-auto border-b border-rule pb-px mb-8 scrollbar-none no-print"
            >
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    role="tab"
                    type="button"
                    aria-selected={isSelected}
                    aria-controls={`panel-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium transition-all border-b-2 whitespace-nowrap min-h-[44px] rounded-t-lg ${
                      isSelected
                        ? 'border-accent text-accent font-bold bg-accent-subtle/50'
                        : 'border-transparent text-ink-muted hover:text-ink hover:bg-paper-subtle/70'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Panels */}
            <div
              id={`panel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`tab-${activeTab}`}
              tabIndex={0}
              className="focus:outline-hidden"
            >
              {activeTab === 'overview' && (
                <TabOverview onSelectTab={(t) => setActiveTab(t as TabId)} />
              )}
              {activeTab === 'budget' && (
                <TabBudget onOpenReplan={() => setIsReplanOpen(true)} />
              )}
              {activeTab === 'timeline' && <TabTimeline />}
              {activeTab === 'vendors' && <TabVendors />}
              {activeTab === 'ideas' && <TabIdeas />}
              {activeTab === 'risks' && <TabRisks />}
              {activeTab === 'history' && <TabHistory />}
            </div>

            {/* Modal for Replanning Hero feature */}
            <ReplanModal
              isOpen={isReplanOpen}
              onClose={() => setIsReplanOpen(false)}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
