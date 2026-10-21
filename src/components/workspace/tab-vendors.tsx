'use client';

import React from 'react';
import { usePlan } from '../plan-context';
import { VENDOR_STATUSES, VendorStatus } from '@/lib/constants';
import {
  ShieldAlert,
  HelpCircle,
  Building,
  Info,
} from 'lucide-react';

export function TabVendors() {
  const { activePlan, updateVendorStatus } = usePlan();

  if (!activePlan) return null;

  return (
    <div className="space-y-6">
      {/* Strict Ethical Guardrail Banner */}
      <div className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h2 className="font-serif font-bold text-lg text-ink">
              Vendor Screening &amp; Verification Protocol
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-ink-muted leading-relaxed">
              Aayojan Ace suggests professional <strong>Vendor Types</strong> and mission-critical <strong>screening questions</strong> to protect your interests. To protect user privacy and accuracy, Aayojan Ace <em>never</em> invents fictional business names, phone numbers, or fixed prices, and does not claim to book or call third-party services.
            </p>
          </div>
        </div>
      </div>

      {/* Vendor Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activePlan.vendors.map((vendor) => (
          <div
            key={vendor.id}
            className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs flex flex-col justify-between"
          >
            <div>
              {/* Category Name & Verification Badge */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-accent" aria-hidden="true" />
                  <h3 className="font-serif font-bold text-base text-ink">
                    {vendor.categoryName}
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shrink-0">
                  <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                  {vendor.verifyWithVendorNotice || 'Verify with the vendor'}
                </span>
              </div>

              {/* Vendor Type Description */}
              <p className="text-xs text-ink-muted leading-relaxed mb-4">
                {vendor.vendorTypeDescription}
              </p>

              {/* Discovery Questions */}
              <div className="p-3.5 rounded-xl border border-rule bg-paper-subtle/50 mb-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-ink mb-2">
                  <HelpCircle className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                  <span>Key Questions to Ask Candidates:</span>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-ink-muted leading-relaxed">
                  {vendor.questionsToAsk.map((q, idx) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              </div>

              {vendor.notes && (
                <p className="text-xs text-ink-faint italic mb-4">
                  Note: {vendor.notes}
                </p>
              )}
            </div>

            {/* Status Selector Footer */}
            <div className="pt-4 border-t border-rule flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-ink-muted">Contract Status:</span>
              <select
                value={vendor.status}
                onChange={(e) =>
                  updateVendorStatus(vendor.id, e.target.value as VendorStatus)
                }
                aria-label={`Update status for ${vendor.categoryName}`}
                className="min-h-[44px] rounded-lg border border-rule bg-paper px-3 py-1.5 text-xs font-medium text-ink focus:border-accent focus:outline-hidden"
              >
                {VENDOR_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
