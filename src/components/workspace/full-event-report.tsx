'use client';

import React from 'react';
import { EventPlan, RiskRegister } from '@/lib/schemas';
import { formatCurrency, calculateBudgetTotals } from '@/lib/budget';
import { formatTime12h } from '@/lib/time';
import { APP_NAME, APP_TAGLINE, PLANNER_DISCLAIMER } from '@/lib/constants';

interface FullEventReportProps {
  plan: EventPlan;
  risks?: RiskRegister | null;
}

export function FullEventReport({ plan, risks }: FullEventReportProps) {
  const totals = calculateBudgetTotals(
    plan.budget.categories,
    plan.budget.contingencyPercent,
    plan.budget.taxServiceChargePercent,
    plan.totalBudget
  );

  const generatedDateFormatted = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <article
      aria-label="Complete Celebration Event Report"
      className="dedicated-print-report font-sans text-black bg-white p-6 space-y-8"
    >
      {/* 1. Official Header */}
      <header className="border-b-2 border-black pb-5 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-black">
              {APP_NAME} — Celebration &amp; Event Master Report
            </h1>
            <p className="text-xs text-neutral-700 italic">{APP_TAGLINE}</p>
          </div>
          <div className="text-right text-xs text-neutral-800">
            <p><strong>Generated on:</strong> {generatedDateFormatted}</p>
            <p><strong>Plan Version:</strong> v{plan.version}</p>
          </div>
        </div>

        {/* Executive Summary Fact Sheet */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-100 p-3 rounded-lg border border-neutral-300 text-xs">
          <div>
            <span className="font-semibold text-neutral-600 block uppercase tracking-wider text-[10px]">
              Celebration Title
            </span>
            <span className="font-bold text-black text-sm">{plan.title}</span>
          </div>
          <div>
            <span className="font-semibold text-neutral-600 block uppercase tracking-wider text-[10px]">
              Type &amp; Destination
            </span>
            <span className="font-medium text-black">{plan.eventType} · {plan.city}</span>
          </div>
          <div>
            <span className="font-semibold text-neutral-600 block uppercase tracking-wider text-[10px]">
              Celebration Date
            </span>
            <span className="font-bold text-black">{plan.date}</span>
          </div>
          <div>
            <span className="font-semibold text-neutral-600 block uppercase tracking-wider text-[10px]">
              Total Budget &amp; Guests
            </span>
            <span className="font-bold text-black">
              {formatCurrency(plan.totalBudget, plan.currency)} · {plan.guestCount} Guests
            </span>
          </div>
        </div>

        {plan.muhuratTime && (
          <div className="mt-3 p-2.5 rounded-lg border border-amber-300 bg-amber-50 text-xs text-neutral-900 flex items-center justify-between">
            <div>
              <span className="font-bold text-amber-900 block uppercase tracking-wider text-[10px]">
                Ceremony / Muhurat Time (as advised by your priest, pandit, imam or pastor)
              </span>
              <span className="font-bold text-black text-sm">
                {formatTime12h(plan.muhuratTime)}
                {plan.muhuratLabel ? ` (${plan.muhuratLabel})` : ''}
              </span>
            </div>
            <span className="text-[11px] text-amber-800 italic">
              Ritual scheduled for event day
            </span>
          </div>
        )}

        {plan.styleCulture && (
          <p className="text-xs text-neutral-800 pt-1">
            <strong>Theme &amp; Cultural Accents:</strong> {plan.styleCulture}
          </p>
        )}
        {plan.nonNegotiables && (
          <p className="text-xs text-neutral-800">
            <strong>Core Non-Negotiables:</strong> {plan.nonNegotiables}
          </p>
        )}
      </header>

      {/* 2. Budget Section & Comprehensive Ledger */}
      <section className="space-y-4 print-card">
        <h2 className="text-lg font-bold border-b border-neutral-400 pb-1 text-black">
          1. Comprehensive Budget &amp; Financial Ledger
        </h2>

        <table className="w-full text-left text-xs border border-neutral-400 border-collapse">
          <thead>
            <tr className="bg-neutral-200 border-b border-neutral-400 font-bold text-neutral-900">
              <th className="p-2 border-r border-neutral-400">Category</th>
              <th className="p-2 border-r border-neutral-400 text-right">Min Est.</th>
              <th className="p-2 border-r border-neutral-400 text-right">Max Est.</th>
              <th className="p-2 border-r border-neutral-400 text-right">Target Est.</th>
              <th className="p-2">Assumptions &amp; Notes</th>
            </tr>
          </thead>
          <tbody>
            {plan.budget.categories.map((cat, idx) => (
              <tr
                key={cat.id || idx}
                className={`border-b border-neutral-300 ${idx % 2 === 1 ? 'bg-neutral-50' : 'bg-white'}`}
              >
                <td className="p-2 font-semibold border-r border-neutral-300">{cat.name}</td>
                <td className="p-2 text-right border-r border-neutral-300 font-mono">
                  {formatCurrency(cat.minEstimate, plan.currency)}
                </td>
                <td className="p-2 text-right border-r border-neutral-300 font-mono">
                  {formatCurrency(cat.maxEstimate, plan.currency)}
                </td>
                <td className="p-2 text-right border-r border-neutral-300 font-mono font-bold">
                  {formatCurrency(cat.targetEstimate, plan.currency)}
                </td>
                <td className="p-2 text-neutral-700 leading-tight">{cat.notes}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-neutral-500 bg-neutral-100 font-bold">
              <td colSpan={3} className="p-2 text-right border-r border-neutral-400">
                Categories Target Subtotal:
              </td>
              <td className="p-2 text-right font-mono border-r border-neutral-400">
                {formatCurrency(totals.categoriesSum, plan.currency)}
              </td>
              <td className="p-2 text-neutral-600 font-normal">
                {totals.varianceRatio.toFixed(1)}% of total target
              </td>
            </tr>
            <tr className="bg-neutral-100">
              <td colSpan={3} className="p-2 text-right border-r border-neutral-400">
                Contingency Reserve ({plan.budget.contingencyPercent}%):
              </td>
              <td className="p-2 text-right font-mono border-r border-neutral-400">
                {formatCurrency(totals.contingencyAmount, plan.currency)}
              </td>
              <td className="p-2 text-neutral-600 font-normal">Buffer for scope changes and seasonal surcharges</td>
            </tr>
            <tr className="bg-neutral-100">
              <td colSpan={3} className="p-2 text-right border-r border-neutral-400">
                Taxes &amp; Service Charges ({plan.budget.taxServiceChargePercent}%):
              </td>
              <td className="p-2 text-right font-mono border-r border-neutral-400">
                {formatCurrency(totals.taxAmount, plan.currency)}
              </td>
              <td className="p-2 text-neutral-600 font-normal">Statutory GST/VAT and venue hospitality charges</td>
            </tr>
            <tr className="bg-neutral-200 border-t-2 border-black font-black text-sm">
              <td colSpan={3} className="p-2 text-right border-r border-neutral-400">
                Total Planned Budget:
              </td>
              <td className="p-2 text-right font-mono border-r border-neutral-400">
                {formatCurrency(totals.totalAllocated, plan.currency)}
              </td>
              <td className="p-2">
                Target Cap: {formatCurrency(plan.totalBudget, plan.currency)}
              </td>
            </tr>
          </tfoot>
        </table>

        {plan.budget.statedAssumptions && plan.budget.statedAssumptions.length > 0 && (
          <div className="text-xs border border-neutral-300 p-2.5 rounded bg-neutral-50 space-y-1">
            <span className="font-bold text-neutral-800 block">Stated Budget Assumptions:</span>
            <ul className="list-disc pl-5 space-y-0.5 text-neutral-700">
              {plan.budget.statedAssumptions.map((assumption, i) => (
                <li key={i}>{assumption}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 3. Full Timeline & Milestones */}
      <section className="space-y-4 print-card">
        <h2 className="text-lg font-bold border-b border-neutral-400 pb-1 text-black">
          2. Master Action Timeline &amp; Guest Communication Milestones
        </h2>

        <table className="w-full text-left text-xs border border-neutral-400 border-collapse">
          <thead>
            <tr className="bg-neutral-200 border-b border-neutral-400 font-bold text-neutral-900">
              <th className="p-2 border-r border-neutral-400 w-24">Due Date</th>
              <th className="p-2 border-r border-neutral-400 w-24">Offset</th>
              <th className="p-2 border-r border-neutral-400">Task Milestone</th>
              <th className="p-2 border-r border-neutral-400 w-28">Owner</th>
              <th className="p-2 w-28">Status &amp; Flags</th>
            </tr>
          </thead>
          <tbody>
            {plan.timeline.map((task, idx) => (
              <tr
                key={task.id || idx}
                className={`border-b border-neutral-300 ${idx % 2 === 1 ? 'bg-neutral-50' : 'bg-white'}`}
              >
                <td className="p-2 font-mono font-bold border-r border-neutral-300">
                  {task.dueDate}
                </td>
                <td className="p-2 text-neutral-600 border-r border-neutral-300">
                  {task.daysBeforeEvent === 0 ? 'Day of event' : `${task.daysBeforeEvent}d before`}
                </td>
                <td className="p-2 border-r border-neutral-300">
                  <div className="font-semibold text-black">{task.title}</div>
                  {task.phase === 'Event day' && plan.muhuratTime && (
                    <div className="text-[11px] font-bold text-amber-900 mt-0.5">
                      ★ Ceremony / Muhurat Time (as advised by your priest, pandit, imam or pastor): {formatTime12h(plan.muhuratTime)}
                      {plan.muhuratLabel ? ` (${plan.muhuratLabel})` : ''}
                    </div>
                  )}
                  <div className="text-[11px] text-neutral-700 mt-0.5 leading-snug">
                    {task.description}
                  </div>
                </td>
                <td className="p-2 border-r border-neutral-300 text-neutral-800">
                  {task.owner || 'Lead Coordinator'}
                </td>
                <td className="p-2 space-y-1">
                  <div>
                    {task.completed ? (
                      <span className="font-bold text-neutral-900">[Completed]</span>
                    ) : (
                      <span className="text-neutral-600">[Pending]</span>
                    )}
                  </div>
                  {task.isGuestMilestone && (
                    <div className="font-semibold text-neutral-900 text-[10px]">
                      [Guest Milestone]
                    </div>
                  )}
                  {task.isTimeSensitive && (
                    <div className="font-bold text-black text-[10px]">
                      [Time-Sensitive]
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 4. Vendor Checklist */}
      <section className="space-y-4 print-card">
        <h2 className="text-lg font-bold border-b border-neutral-400 pb-1 text-black">
          3. Verified Vendor Category Checklist &amp; Interview Questions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {plan.vendors.map((vendor, idx) => (
            <div
              key={vendor.id || idx}
              className="border border-neutral-400 p-3 rounded-lg bg-neutral-50 space-y-1.5 print-card"
            >
              <div className="flex items-center justify-between border-b border-neutral-300 pb-1">
                <span className="font-bold text-black text-sm">{vendor.categoryName}</span>
                <span className="font-mono text-neutral-800 font-semibold">[{vendor.status}]</span>
              </div>
              <p className="text-neutral-800 italic leading-snug">
                Type: {vendor.vendorTypeDescription}
              </p>
              <div>
                <span className="font-semibold text-neutral-800 block text-[11px]">
                  Screening Questions to Ask:
                </span>
                <ul className="list-disc pl-4 space-y-0.5 text-neutral-700 text-[11px]">
                  {vendor.questionsToAsk.map((q, qIdx) => (
                    <li key={qIdx}>{q}</li>
                  ))}
                </ul>
              </div>
              <div className="text-[10px] text-neutral-600 pt-1 border-t border-neutral-200">
                Notice: {vendor.verifyWithVendorNotice || 'Verify directly with licensed vendor'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Personalized Ideas */}
      <section className="space-y-3 print-card">
        <h2 className="text-lg font-bold border-b border-neutral-400 pb-1 text-black">
          4. Personalized Creative Ideas &amp; Cultural Notes
        </h2>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="border border-neutral-300 p-2.5 rounded bg-neutral-50">
            <span className="font-bold text-neutral-900 block mb-1">Themes &amp; Ambiance:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-neutral-700">
              {plan.ideas.themes.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="border border-neutral-300 p-2.5 rounded bg-neutral-50">
            <span className="font-bold text-neutral-900 block mb-1">Culinary &amp; Dietary Notes:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-neutral-700">
              {plan.ideas.dietaryNotes.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
          <div className="border border-neutral-300 p-2.5 rounded bg-neutral-50">
            <span className="font-bold text-neutral-900 block mb-1">Guest Activities &amp; Rituals:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-neutral-700">
              {plan.ideas.activities.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
          <div className="border border-neutral-300 p-2.5 rounded bg-neutral-50">
            <span className="font-bold text-neutral-900 block mb-1">Decor Accents &amp; Floral:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-neutral-700">
              {plan.ideas.decor.map((dec, i) => (
                <li key={i}>{dec}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 6. Operational Risk Register (if loaded) */}
      {risks && risks.risks && risks.risks.length > 0 && (
        <section className="space-y-3 print-card">
          <h2 className="text-lg font-bold border-b border-neutral-400 pb-1 text-black">
            5. Operational Safeguards &amp; Risk Register
          </h2>
          <table className="w-full text-left text-xs border border-neutral-400 border-collapse">
            <thead>
              <tr className="bg-neutral-200 border-b border-neutral-400 font-bold text-neutral-900">
                <th className="p-2 border-r border-neutral-400 w-36">Category</th>
                <th className="p-2 border-r border-neutral-400 w-24">Severity</th>
                <th className="p-2 border-r border-neutral-400">Potential Issue &amp; Root Cause</th>
                <th className="p-2">Mitigation Action Plan</th>
              </tr>
            </thead>
            <tbody>
              {risks.risks.map((risk, idx) => (
                <tr
                  key={risk.id || idx}
                  className={`border-b border-neutral-300 ${idx % 2 === 1 ? 'bg-neutral-50' : 'bg-white'}`}
                >
                  <td className="p-2 font-semibold border-r border-neutral-300">{risk.category}</td>
                  <td className="p-2 border-r border-neutral-300 font-bold">[{risk.severity}]</td>
                  <td className="p-2 border-r border-neutral-300">
                    <p className="font-semibold">{risk.potentialIssue}</p>
                    <p className="text-[11px] text-neutral-600 leading-tight mt-0.5">{risk.rootCause}</p>
                  </td>
                  <td className="p-2 text-neutral-800 leading-tight">{risk.mitigationTask}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* 7. Footer & Legal Disclaimer */}
      <footer className="border-t-2 border-neutral-400 pt-3 text-[10px] text-neutral-600 space-y-1">
        <p><strong>Planning Disclaimer:</strong> {PLANNER_DISCLAIMER}</p>
        <p>Aayojan Ace generated report · Document ID: {plan.id} · Version: v{plan.version}</p>
      </footer>
    </article>
  );
}
